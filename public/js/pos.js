// Conexión Socket.IO para tiempo real
const socket = io();

// Variables globales
let currentUser = null;
let currentTurno = null;

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = '/';
        return;
    }

    try {
        currentUser = JSON.parse(userData);
        if (currentUser.role !== 'cajero') {
            window.location.href = '/';
            return;
        }
        document.getElementById('username').textContent = currentUser.username;
    } catch (error) {
        logout();
        return;
    }

    // Cargar estado inicial
    cargarEstadoSistema();
    
    // Configurar eventos
    configurarEventos();
    configurarSocketEvents();
});

// Función para mostrar alertas
function showAlert(message, type = 'info') {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

// Configurar eventos del formulario
function configurarEventos() {
    // Formulario de movimientos
    document.getElementById('movimientoForm').addEventListener('submit', registrarMovimiento);
    
    // Auto-calcular saldo esperado cuando se selecciona cerrar turno
    document.getElementById('saldoFinalInput').addEventListener('input', function() {
        const saldoReal = parseFloat(this.value) || 0;
        const saldoEsperado = parseFloat(document.getElementById('saldoEsperado').textContent) || 0;
        const diferencia = saldoReal - saldoEsperado;
        
        if (diferencia !== 0) {
            this.style.borderColor = diferencia > 0 ? '#22c55e' : '#ef4444';
        } else {
            this.style.borderColor = '#e5e7eb';
        }
    });
}

// Configurar eventos de Socket.IO
function configurarSocketEvents() {
    socket.on('connect', () => {
        console.log('Conectado al servidor en tiempo real');
    });

    socket.on('turno-abierto', (turno) => {
        if (turno.cajero_id === currentUser.id) {
            currentTurno = turno;
            actualizarInterfazTurno();
            showAlert('¡Turno iniciado correctamente!', 'success');
        }
    });

    socket.on('turno-cerrado', (data) => {
        currentTurno = null;
        actualizarInterfazTurno();
        showAlert('Turno cerrado', 'info');
        limpiarResumen();
    });

    socket.on('nuevo-movimiento', (movimiento) => {
        if (currentTurno && movimiento.turno_id === currentTurno.id) {
            actualizarResumen();
            showAlert('Movimiento registrado', 'success');
        }
    });

    socket.on('turno-actual', (turno) => {
        if (turno && turno.cajero_id === currentUser.id) {
            currentTurno = turno;
            actualizarInterfazTurno();
        }
    });
}

// Cargar estado del sistema
async function cargarEstadoSistema() {
    try {
        const response = await fetch('/api/turno-actual');
        const data = await response.json();
        
        if (data.turno && data.turno.cajero_id === currentUser.id) {
            currentTurno = data.turno;
            actualizarInterfazTurno();
            actualizarResumen();
        } else {
            currentTurno = null;
            actualizarInterfazTurno();
        }
    } catch (error) {
        console.error('Error cargando estado:', error);
        showAlert('Error al cargar el estado del sistema', 'error');
    }
}

// Actualizar interfaz según estado del turno
function actualizarInterfazTurno() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const saldoInicial = document.getElementById('saldoInicial');
    const iniciarSection = document.getElementById('iniciarTurnoSection');
    const cerrarSection = document.getElementById('cerrarTurnoSection');
    const movimientoForm = document.getElementById('movimientoForm');

    if (currentTurno) {
        // Turno abierto
        statusDot.className = 'status-dot';
        statusText.textContent = 'Caja Abierta';
        saldoInicial.textContent = currentTurno.saldo_inicial.toFixed(2);
        
        iniciarSection.style.display = 'none';
        cerrarSection.style.display = 'block';
        
        // Habilitar formulario de movimientos
        movimientoForm.style.display = 'block';
        
    } else {
        // Turno cerrado
        statusDot.className = 'status-dot closed';
        statusText.textContent = 'Caja Cerrada - Inicie su turno';
        saldoInicial.textContent = '0.00';
        
        iniciarSection.style.display = 'block';
        cerrarSection.style.display = 'none';
        
        // Deshabilitar formulario de movimientos
        movimientoForm.style.display = 'none';
    }
}

// Abrir turno (arqueo inicial)
async function abrirTurno() {
    const saldoInicialInput = document.getElementById('saldoInicialInput');
    const loading = document.getElementById('loadingAbrir');
    
    const saldoInicial = parseFloat(saldoInicialInput.value) || 0;
    
    if (saldoInicial < 0) {
        showAlert('El saldo inicial no puede ser negativo', 'error');
        return;
    }

    loading.classList.add('show');

    try {
        const response = await fetch('/api/abrir-turno', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cajero_id: currentUser.id,
                saldo_inicial: saldoInicial,
                notas: `Turno iniciado por ${currentUser.username}`
            })
        });

        const data = await response.json();

        if (data.success) {
            currentTurno = data.turno;
            actualizarInterfazTurno();
            saldoInicialInput.value = '';
            showAlert('¡Turno iniciado correctamente!', 'success');
        } else {
            showAlert(data.error || 'Error al abrir turno', 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión', 'error');
    } finally {
        loading.classList.remove('show');
    }
}

// Mostrar modal para cerrar turno
async function mostrarModalCerrarTurno() {
    // Actualizar saldo esperado
    await actualizarResumen();
    
    const saldoEsperado = document.getElementById('resumenSaldoEfectivo').textContent;
    document.getElementById('saldoEsperado').textContent = saldoEsperado;
    document.getElementById('saldoFinalInput').value = saldoEsperado;
    
    document.getElementById('modalCerrarTurno').style.display = 'block';
}

// Cerrar turno (arqueo final)
async function cerrarTurno() {
    const saldoFinalInput = document.getElementById('saldoFinalInput');
    const notasCierre = document.getElementById('notasCierre');
    const loading = document.getElementById('loadingCerrar');
    
    const saldoFinal = parseFloat(saldoFinalInput.value) || 0;
    
    if (saldoFinal < 0) {
        showAlert('El saldo final no puede ser negativo', 'error');
        return;
    }

    loading.classList.add('show');

    try {
        const response = await fetch('/api/cerrar-turno', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                turno_id: currentTurno.id,
                saldo_final: saldoFinal,
                notas: notasCierre.value || `Turno cerrado por ${currentUser.username}`
            })
        });

        const data = await response.json();

        if (data.success) {
            currentTurno = null;
            actualizarInterfazTurno();
            cerrarModal();
            showAlert('¡Turno cerrado correctamente!', 'success');
            limpiarResumen();
        } else {
            showAlert(data.error || 'Error al cerrar turno', 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión', 'error');
    } finally {
        loading.classList.remove('show');
    }
}

// Seleccionar tipo de movimiento (botones rápidos)
function seleccionarTipo(tipo) {
    document.getElementById('tipoMovimiento').value = tipo;
    
    // Actualizar estilos de botones
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.quick-btn').classList.add('active');
    
    // Auto-focus en descripción
    document.getElementById('descripcion').focus();
    
    // Sugerir método de pago por defecto
    const metodoPago = document.getElementById('metodoPago');
    if (tipo === 'venta') {
        metodoPago.value = 'efectivo';
    } else if (tipo === 'gasto') {
        metodoPago.value = 'efectivo';
    }
}

// Registrar movimiento
async function registrarMovimiento(e) {
    e.preventDefault();
    
    if (!currentTurno) {
        showAlert('No hay turno abierto', 'error');
        return;
    }

    const loading = document.getElementById('loadingMovimiento');
    const form = e.target;
    
    const formData = {
        tipo: document.getElementById('tipoMovimiento').value,
        descripcion: document.getElementById('descripcion').value.trim(),
        monto: parseFloat(document.getElementById('monto').value) || 0,
        metodo_pago: document.getElementById('metodoPago').value,
        cajero_id: currentUser.id
    };

    if (!formData.descripcion || formData.monto <= 0) {
        showAlert('Complete todos los campos correctamente', 'error');
        return;
    }

    loading.classList.add('show');

    try {
        const response = await fetch('/api/movimiento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            form.reset();
            document.querySelectorAll('.quick-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            showAlert(`${formData.tipo} registrada: $${formData.monto.toFixed(2)}`, 'success');
            
            // Actualizar resumen automáticamente
            setTimeout(() => {
                actualizarResumen();
            }, 500);
            
        } else {
            showAlert(data.error || 'Error al registrar movimiento', 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión', 'error');
    } finally {
        loading.classList.remove('show');
    }
}

// Actualizar resumen de caja
async function actualizarResumen() {
    if (!currentTurno) return;

    try {
        const response = await fetch('/api/turno-actual');
        const data = await response.json();
        
        if (data.resumen) {
            const r = data.resumen;
            
            document.getElementById('resumenSaldoInicial').textContent = r.saldo_inicial.toFixed(2);
            document.getElementById('resumenVentasEfectivo').textContent = r.ventas_efectivo.toFixed(2);
            document.getElementById('resumenVentasTransferencia').textContent = r.ventas_transferencia.toFixed(2);
            document.getElementById('resumenGastos').textContent = r.gastos.toFixed(2);
            document.getElementById('resumenIngresosExtra').textContent = r.ingresos_extra.toFixed(2);
            document.getElementById('resumenSaldoEfectivo').textContent = r.saldo_efectivo_actual.toFixed(2);
        }
    } catch (error) {
        console.error('Error actualizando resumen:', error);
    }
}

// Limpiar resumen cuando no hay turno
function limpiarResumen() {
    const elementos = [
        'resumenSaldoInicial', 'resumenVentasEfectivo', 'resumenVentasTransferencia',
        'resumenGastos', 'resumenIngresosExtra', 'resumenSaldoEfectivo'
    ];
    
    elementos.forEach(id => {
        document.getElementById(id).textContent = '0.00';
    });
}

// Cerrar modal
function cerrarModal() {
    document.getElementById('modalCerrarTurno').style.display = 'none';
    document.getElementById('saldoFinalInput').value = '';
    document.getElementById('notasCierre').value = '';
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('user');
    socket.disconnect();
    window.location.href = '/';
}

// Actualización automática del resumen cada 30 segundos
setInterval(() => {
    if (currentTurno) {
        actualizarResumen();
    }
}, 30000);

// Cerrar modal al hacer click fuera
window.addEventListener('click', function(event) {
    const modal = document.getElementById('modalCerrarTurno');
    if (event.target === modal) {
        cerrarModal();
    }
});