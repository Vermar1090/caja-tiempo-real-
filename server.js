const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Inicializar base de datos
const db = new sqlite3.Database('./db.sqlite');

// Crear tablas si no existen
db.serialize(() => {
  // Tabla de usuarios
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creando tabla usuarios:', err);
    } else {
      console.log('Tabla usuarios creada/verificada');
    }
  });

  // Tabla de turnos de caja
  db.run(`CREATE TABLE IF NOT EXISTS turnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cajero_id INTEGER,
    saldo_inicial REAL DEFAULT 0,
    saldo_final REAL,
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre DATETIME,
    estado TEXT DEFAULT 'abierto',
    notas TEXT,
    FOREIGN KEY (cajero_id) REFERENCES usuarios (id)
  )`, (err) => {
    if (err) {
      console.error('Error creando tabla turnos:', err);
    } else {
      console.log('Tabla turnos creada/verificada');
    }
  });

  // Tabla de movimientos (ventas, gastos, ingresos)
  db.run(`CREATE TABLE IF NOT EXISTS movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turno_id INTEGER,
    tipo TEXT, -- 'venta', 'gasto', 'ingreso_extra'
    descripcion TEXT,
    monto REAL,
    metodo_pago TEXT, -- 'efectivo', 'transferencia'
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    cajero_id INTEGER,
    FOREIGN KEY (turno_id) REFERENCES turnos (id),
    FOREIGN KEY (cajero_id) REFERENCES usuarios (id)
  )`, (err) => {
    if (err) {
      console.error('Error creando tabla movimientos:', err);
    } else {
      console.log('Tabla movimientos creada/verificada');
    }
  });

  // Crear usuarios por defecto después de que la tabla esté lista
  setTimeout(() => {
    const adminPassword = bcrypt.hashSync('admin123', 10);
    const cajeroPassword = bcrypt.hashSync('cajero123', 10);
    
    // Verificar si los usuarios ya existen
    db.get('SELECT * FROM usuarios WHERE username = ?', ['admin'], (err, row) => {
      if (err) {
        console.error('Error verificando admin:', err);
      } else if (!row) {
        db.run('INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)', 
          ['admin', adminPassword, 'admin'], (err) => {
            if (err) {
              console.error('Error creando admin:', err);
            } else {
              console.log('Usuario admin creado');
            }
          });
      } else {
        console.log('Usuario admin ya existe');
      }
    });

    db.get('SELECT * FROM usuarios WHERE username = ?', ['cajero'], (err, row) => {
      if (err) {
        console.error('Error verificando cajero:', err);
      } else if (!row) {
        db.run('INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)', 
          ['cajero', cajeroPassword, 'cajero'], (err) => {
            if (err) {
              console.error('Error creando cajero:', err);
            } else {
              console.log('Usuario cajero creado');
            }
          });
      } else {
        console.log('Usuario cajero ya existe');
      }
    });
  }, 500);
});

// Variable para mantener el turno activo en memoria
let turnoActivo = null;

// Rutas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/pos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pos.html'));
});

// Ruta de debug para verificar usuarios (solo en desarrollo)
app.get('/api/debug/usuarios', (req, res) => {
  db.all('SELECT id, username, role, created_at FROM usuarios', [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(users);
  });
});

// API Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Intento de login:', { username, hasPassword: !!password });
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  
  db.get('SELECT * FROM usuarios WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Error en base de datos:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    
    if (!user) {
      console.log('Usuario no encontrado:', username);
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    console.log('Usuario encontrado:', { id: user.id, username: user.username, role: user.role });
    
    try {
      const passwordMatch = bcrypt.compareSync(password, user.password);
      console.log('Contraseña válida:', passwordMatch);
      
      if (passwordMatch) {
        res.json({ 
          success: true, 
          user: { id: user.id, username: user.username, role: user.role }
        });
      } else {
        res.status(401).json({ error: 'Contraseña incorrecta' });
      }
    } catch (bcryptError) {
      console.error('Error comparando contraseña:', bcryptError);
      res.status(500).json({ error: 'Error de autenticación' });
    }
  });
});

// API para abrir turno (arqueo inicial)
app.post('/api/abrir-turno', (req, res) => {
  const { cajero_id, saldo_inicial, notas } = req.body;
  
  db.run('INSERT INTO turnos (cajero_id, saldo_inicial, notas) VALUES (?, ?, ?)',
    [cajero_id, saldo_inicial, notas], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      turnoActivo = {
        id: this.lastID,
        cajero_id,
        saldo_inicial,
        fecha_inicio: new Date().toISOString(),
        estado: 'abierto'
      };
      
      // Notificar a todos los clientes conectados
      io.emit('turno-abierto', turnoActivo);
      
      res.json({ success: true, turno: turnoActivo });
    });
});

// API para cerrar turno (arqueo final)
app.post('/api/cerrar-turno', (req, res) => {
  const { turno_id, saldo_final, notas } = req.body;
  
  db.run('UPDATE turnos SET saldo_final = ?, fecha_cierre = CURRENT_TIMESTAMP, estado = "cerrado", notas = ? WHERE id = ?',
    [saldo_final, notas, turno_id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      turnoActivo = null;
      
      // Notificar cierre de turno
      io.emit('turno-cerrado', { turno_id, saldo_final });
      
      res.json({ success: true });
    });
});

// API para registrar movimiento
app.post('/api/movimiento', (req, res) => {
  const { tipo, descripcion, monto, metodo_pago, cajero_id } = req.body;
  
  if (!turnoActivo) {
    return res.status(400).json({ error: 'No hay turno abierto' });
  }
  
  db.run('INSERT INTO movimientos (turno_id, tipo, descripcion, monto, metodo_pago, cajero_id) VALUES (?, ?, ?, ?, ?, ?)',
    [turnoActivo.id, tipo, descripcion, monto, metodo_pago, cajero_id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const movimiento = {
        id: this.lastID,
        turno_id: turnoActivo.id,
        tipo,
        descripcion,
        monto,
        metodo_pago,
        fecha: new Date().toISOString(),
        cajero_id
      };
      
      // Notificar movimiento en tiempo real
      io.emit('nuevo-movimiento', movimiento);
      
      res.json({ success: true, movimiento });
    });
});

// API para obtener resumen del turno actual
app.get('/api/turno-actual', (req, res) => {
  if (!turnoActivo) {
    return res.json({ turno: null });
  }
  
  db.all(`SELECT 
    tipo,
    metodo_pago,
    SUM(monto) as total
    FROM movimientos 
    WHERE turno_id = ? 
    GROUP BY tipo, metodo_pago`,
    [turnoActivo.id], (err, movimientos) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Calcular totales
      let totalVentasEfectivo = 0;
      let totalVentasTransferencia = 0;
      let totalGastos = 0;
      let totalIngresosExtra = 0;
      
      movimientos.forEach(m => {
        if (m.tipo === 'venta') {
          if (m.metodo_pago === 'efectivo') totalVentasEfectivo += m.total;
          if (m.metodo_pago === 'transferencia') totalVentasTransferencia += m.total;
        } else if (m.tipo === 'gasto') {
          totalGastos += m.total;
        } else if (m.tipo === 'ingreso_extra') {
          totalIngresosExtra += m.total;
        }
      });
      
      const saldoEfectivo = turnoActivo.saldo_inicial + totalVentasEfectivo + totalIngresosExtra - totalGastos;
      
      res.json({
        turno: turnoActivo,
        resumen: {
          saldo_inicial: turnoActivo.saldo_inicial,
          ventas_efectivo: totalVentasEfectivo,
          ventas_transferencia: totalVentasTransferencia,
          total_ventas: totalVentasEfectivo + totalVentasTransferencia,
          gastos: totalGastos,
          ingresos_extra: totalIngresosExtra,
          saldo_efectivo_actual: saldoEfectivo
        }
      });
    });
});

// API para obtener historial de movimientos
app.get('/api/movimientos/:turno_id', (req, res) => {
  const turno_id = req.params.turno_id;
  
  db.all(`SELECT m.*, u.username as cajero_nombre
    FROM movimientos m
    LEFT JOIN usuarios u ON m.cajero_id = u.id
    WHERE m.turno_id = ?
    ORDER BY m.fecha DESC`,
    [turno_id], (err, movimientos) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(movimientos);
    });
});

// API para obtener historial de turnos
app.get('/api/turnos', (req, res) => {
  db.all(`SELECT t.*, u.username as cajero_nombre
    FROM turnos t
    LEFT JOIN usuarios u ON t.cajero_id = u.id
    ORDER BY t.fecha_inicio DESC
    LIMIT 50`,
    [], (err, turnos) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(turnos);
    });
});

// Socket.IO para tiempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Enviar estado actual al cliente que se conecta
  if (turnoActivo) {
    socket.emit('turno-actual', turnoActivo);
  }
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${NODE_ENV}`);
  console.log(`📊 Base de datos: ${dbPath}`);
  
  if (NODE_ENV === 'development') {
    console.log(`🔗 Local: http://localhost:${PORT}`);
  }
  
  console.log('\n👥 Usuarios de prueba:');
  console.log('   👨‍💼 Admin: admin / admin123');
  console.log('   🧑‍💻 Cajero: cajero / cajero123\n');
});

// Manejar cierre graceful
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Recibida señal ${signal}, cerrando servidor...`);
  
  db.close((err) => {
    if (err) {
      console.error('❌ Error cerrando base de datos:', err.message);
    } else {
      console.log('✅ Base de datos cerrada correctamente');
    }
    
    server.close(() => {
      console.log('✅ Servidor cerrado correctamente');
      process.exit(0);
    });
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));