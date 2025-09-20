# 🏪 Sistema de Caja en Tiempo Real

Sistema completo de punto de venta (POS) con arqueo inicial/final y control de movimientos en tiempo real.

## 🎯 Características

- ✅ **Arqueo Inicial**: Registro de saldo al abrir caja
- ✅ **Control de Movimientos**: Ventas, gastos, ingresos extra
- ✅ **Tiempo Real**: Sincronización instantánea con Socket.IO
- ✅ **Métodos de Pago**: Efectivo y transferencias separados
- ✅ **Panel Admin**: Dashboard completo en tiempo real
- ✅ **Arqueo Final**: Comparación saldo contado vs esperado
- ✅ **Historial Completo**: Auditoría de todos los movimientos

## 🚀 Deployment en Render

### 1. Preparar Repositorio GitHub

```bash
git init
git add .
git commit -m "Sistema de caja completo"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/caja-tiempo-real.git
git push -u origin main
```

### 2. Configurar en Render

1. **Crear cuenta en [Render.com](https://render.com)**

2. **Conectar GitHub** → "New Web Service"

3. **Configuración del servicio:**
   - **Repository**: Tu repo `caja-tiempo-real`
   - **Name**: `caja-tiempo-real`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

4. **Variables de Entorno** (opcional):
   ```
   NODE_ENV=production
   ```

5. **Configurar Persistent Disk** (para mantener la DB):
   - En Settings → Disks → Add Disk
   - **Name**: `sqlite-data`
   - **Mount Path**: `/opt/render/project/src/data`
   - **Size**: 1GB (suficiente)

### 3. Deploy Automático

Una vez configurado, Render desplegará automáticamente cada vez que hagas push a `main`.

## 🛠️ Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/TU-USUARIO/caja-tiempo-real.git
cd caja-tiempo-real

# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev

# O producción local
npm start
```

## 👥 Usuarios de Prueba

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `admin` | `admin123` | Administrador |
| `cajero` | `cajero123` | Cajero |

## 🎮 Uso del Sistema

### Para el Cajero:
1. **Login** → Usar credenciales de cajero
2. **Abrir Caja** → Ingresar saldo inicial
3. **Registrar Movimientos** → Ventas, gastos, ingresos
4. **Cerrar Turno** → Contar efectivo y cerrar

### Para el Administrador:
1. **Login** → Usar credenciales admin
2. **Dashboard** → Ver todo en tiempo real
3. **Monitoreo** → Seguir movimientos del cajero
4. **Reportes** → Historial completo

## 📁 Estructura del Proyecto

```
caja-tiempo-real/
├── server.js              # Servidor principal
├── package.json           # Dependencias
├── render.yaml            # Configuración Render
├── README.md              # Esta guía
├── public/
│   ├── index.html         # Login
│   ├── admin.html         # Dashboard admin
│   ├── pos.html           # Panel cajero
│   └── js/
│       ├── index.js       # Lógica login
│       ├── admin.js       # Lógica admin
│       └── pos.js         # Lógica cajero
└── data/                  # Base de datos (producción)
    └── db.sqlite
```

## 🔧 Tecnologías

- **Backend**: Node.js + Express
- **Base de Datos**: SQLite
- **Tiempo Real**: Socket.IO
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Autenticación**: bcrypt
- **Deploy**: Render

## 🐛 Solución de Problemas

### Error de Login
```bash
# Verificar usuarios en la DB
curl https://tu-app.onrender.com/api/debug/usuarios
```

### Base de datos no persiste
- Verificar que el persistent disk esté configurado
- Ruta correcta: `/opt/render/project/src/data`

### Socket.IO no conecta
- Verificar que el puerto esté bien configurado
- Render asigna automáticamente el puerto

## 📊 API Endpoints

- `POST /api/login` - Autenticación
- `POST /api/abrir-turno` - Arqueo inicial
- `POST /api/cerrar-turno` - Arqueo final
- `POST /api/movimiento` - Registrar movimiento
- `GET /api/turno-actual` - Estado actual
- `GET /api/movimientos/:id` - Historial

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt
- Validación de roles por endpoint
- Sanitización de inputs
- Variables de entorno para producción

## 📈 Próximas Mejoras

- [ ] Reportes PDF
- [ ] Múltiples cajas simultáneas
- [ ] Inventario integrado
- [ ] Notificaciones push
- [ ] API REST completa
- [ ] Dashboard con gráficos

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en Render Dashboard
2. Verifica la configuración del persistent disk
3. Comprueba que las variables de entorno estén bien

---

**¡Tu sistema de caja está listo para producción! 🎉**