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
        if (currentUser.role !== 'admin') {
            window.location.href = '/';
            return;
        }
        document.getElementById('username').textContent = currentUser.username;
    } catch (error) {
        logout();
        return;
    }

    // Cargar datos iniciales
    cargarEstadoSistema();
    
    // Configurar eventos de Socket.IO
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

// Configurar eventos de Socket.IO para tiempo real
function configurarSocketEvents() {
    socket.on('connect', () => {
        console.log('Conectado al servidor en tiempo real');
    });

    socket.on('turno-abierto', (turno) => {
        console.log('Turno abierto:', turno);
        currentTurno = turno;
        actualizarEstadoTurno();
        showAlert('¡Nuevo turno iniciado!', 'success');
        cargarResumen();
        cargarMovimientos();
    });

    socket.on('turno-cerrado', (data) => {
        console.log('Turno cerrado:', data);
        currentTurno = null;
        actualizarEstadoTurno();
        showAlert('Turno cerrado', 'warning');
        limpiarDatos();
    });

    socket.on('nuevo-movimiento', (movimiento) => {
        console.log('Nuevo movimiento:', movimiento);
        agregarMovimientoALista(movimiento);
        cargarResumen();
        showAlert(`Nueva ${movimiento.tipo}: $${movimiento.monto}`, 'info');
    });

    socket.on('turno-actual', (turno) => {
        currentTurno = turno;
        actualizarEstadoTurno();
    });
}

// Cargar estado del sistema
async function cargarEstadoSistema() {
    try {
        const response = await fetch('/api/turno-actual');
        const data = await response.json();
        
        if (data.turno) {
            currentTurno = data.turno;
            actualizarEstadoTurno();
            cargarResumen();
            cargarMovimientos();
        } else {
            currentTurno = null;
            actualizarEstadoTurno();
            limpiarDatos();
        }
    } catch (error) {
        console.error('Error cargando estado:', error);
        showAlert('Error al cargar el estado del sistema', 'warning');
    }
}

// Actualizar estado visual del turno
function actualizarEstadoTurno() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const cajeroNombre = document.getElementById('cajeroNombre');
    const fechaInicio = document.getElementById('fechaInicio');
    const saldoInicial = document.getElementById('saldoInicial');

    if (currentTurno) {
        statusDot.className = 'status-dot open';
        statusText.textContent = 'Caja Abierta';
        cajeroNombre.textContent = 'Cajero ID: ' + currentTurno.cajero_id;
        fechaInicio.textContent = new Date(currentTurno.fecha_inicio).toLocaleString();
        saldoInicial.textContent = currentTurno.saldo_inicial.toFixed(2);
    } else {
        statusDot.className = 'status-dot closed';
        statusText.textContent = 'Caja Cerrada';
        cajeroNombre.textContent = '-';
        fechaInicio.textContent = '-';
        saldoInicial.textContent = '0.00';
    }
}

// Cargar resumen financiero
async function cargarResumen() {
    if (!currentTurno) return;

    try {
        const response = await fetch('/api/turno-actual');
        const data = await response.json();
        
        if (data.resumen) {
            const resumen = data.resumen;
            
            document.getElementById('totalVentas').textContent = '$' + resumen.total_ventas.toFixed(2);
            document.getElementById('ventasEfectivo').textContent = '$' + resumen.ventas_efectivo.toFixed(2);
            document.getElementById('ventasTransferencia').textContent = '$' + resumen.ventas_transferencia.toFixed(2);
            document.getElementById('totalGastos').textContent = '$' + resumen.gastos.toFixed(2);
            document.getElementById('ingresosExtra').textContent = '$' + resumen.ingresos_extra.toFixed(2);
            document.getElementById('saldoEfectivo').textContent = '$' + resumen.saldo_efectivo_actual.toFixed(2);
        }
    } catch (error) {
        console.error('Error cargando resumen:', error);
    }
}

// Cargar movimientos del turno actual
async function cargarMovimientos() {
    if (!currentTurno) return;

    try {
        const response = await fetch(`/api/movimientos/${currentTurno.id}`);
        const movimientos = await response.json();
        
        const movementsList = document.getElementById('movementsList');
        
        if (movimientos.length === 0) {
            movementsList.innerHTML = '<div class="no-data"><p>No hay movimientos registrados</p></div>';
            return;
        }

        let html = '';
        movimientos.forEach(mov => {
            html += crearHtmlMovimiento(mov);
        });
        
        movementsList.innerHTML = html;
    } catch (error) {
        console.error('Error cargando movimientos:', error);
    }
}

// Crear HTML para un movimiento
function crearHtmlMovimiento(movimiento) {
    const fecha = new Date(movimiento.fecha).toLocaleString();
    const tipoClass = movimiento.tipo;
    const amountClass = movimiento.tipo === 'gasto' ? 'negative' : 'positive';
    const signo = movimiento.tipo === 'gasto' ? '-' : '+';
    
    let tipoTexto = '';
    switch(movimiento.tipo) {
        case 'venta': tipoTexto = 'Venta'; break;
        case 'gasto': tipoTexto = 'Gasto'; break;
        case 'ingreso_extra': tipoTexto = 'Ingreso Extra'; break;
    }

    return `
        <div class="movement-item">
            <div class="movement-info">
                <div>
                    <span class="movement-type ${tipoClass}">${tipoTexto}</span>
                    <strong style="margin-left: 0.5rem;">${movimiento.descripcion}</strong>
                </div>
                <div class="movement-time">
                    ${fecha} • ${movimiento.metodo_pago || 'N/A'} • ${movimiento.cajero_nombre || 'Sistema'}
                </div>
            </div>
            <div class="movement-amount ${amountClass}">
                ${signo}$${Math.abs(movimiento.monto).toFixed(2)}
            </div>
        </div>
    `;
}

// Agregar nuevo movimiento a la lista (tiempo real)
function agregarMovimientoALista(movimiento) {
    const movementsList = document.getElementById('movementsList');
    
    // Si no hay movimientos, limpiar el mensaje "no hay datos"
    if (movementsList.querySelector('.no-data')) {
        movementsList.innerHTML = '';
    }
    
    // Crear el nuevo elemento
    const nuevoMovimiento = document.createElement('div');
    nuevoMovimiento.innerHTML = crearHtmlMovimiento(movimiento);
    
    // Agregar al inicio de la lista
    movementsList.insertBefore(nuevoMovimiento.firstElementChild, movementsList.firstChild);
    
    // Agregar animación de entrada
    const item = movementsList.firstElementChild;
    item.style.backgroundColor = '#e0f2fe';
    setTimeout(() => {
        item.style.backgroundColor = '';
        item.style.transition = 'background-color 0.5s ease';
    }, 2000);
}

// Limpiar datos cuando no hay turno activo
function limpiarDatos() {
    document.getElementById('totalVentas').textContent = '$0.00';
    document.getElementById('ventasEfectivo').textContent = '$0.00';
    document.getElementById('ventasTransferencia').textContent = '$0.00';
    document.getElementById('totalGastos').textContent = '$0.00';
    document.getElementById('ingresosExtra').textContent = '$0.00';
    document.getElementById('saldoEfectivo').textContent = '$0.00';
    
    document.getElementById('movementsList').innerHTML = '<div class="no-data"><p>No hay turno activo</p></div>';
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('user');
    socket.disconnect();
    window.location.href = '/';
}

// Actualización automática cada 30 segundos
setInterval(() => {
    if (currentTurno) {
        cargarResumen();
    }
}, 30000);