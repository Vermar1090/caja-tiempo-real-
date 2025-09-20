document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const alert = document.getElementById('alert');
    const loading = document.getElementById('loading');

    // Función para mostrar alertas
    function showAlert(message, type = 'error') {
        alert.textContent = message;
        alert.className = `alert ${type}`;
        alert.style.display = 'block';
        
        setTimeout(() => {
            alert.style.display = 'none';
        }, 5000);
    }

    // Función para mostrar/ocultar loading
    function toggleLoading(show) {
        if (show) {
            loading.classList.add('show');
            loginForm.querySelector('button').disabled = true;
        } else {
            loading.classList.remove('show');
            loginForm.querySelector('button').disabled = false;
        }
    }

    // Manejar envío del formulario
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            showAlert('Por favor, completa todos los campos');
            return;
        }

        toggleLoading(true);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error de conexión' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('Login response:', data);

            if (data.success) {
                // Guardar datos del usuario en localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                
                showAlert('¡Inicio de sesión exitoso!', 'success');
                
                // Redirigir según el rol
                setTimeout(() => {
                    if (data.user.role === 'admin') {
                        window.location.href = '/admin';
                    } else if (data.user.role === 'cajero') {
                        window.location.href = '/pos';
                    }
                }, 1000);
                
            } else {
                showAlert(data.error || 'Error al iniciar sesión');
            }

        } catch (error) {
            console.error('Login error:', error);
            showAlert(error.message || 'Error de conexión. Intenta nuevamente.');
        } finally {
            toggleLoading(false);
        }
    });

    // Auto-completar campos para prueba rápida
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === '1') {
            document.getElementById('username').value = 'admin';
            document.getElementById('password').value = 'admin123';
        } else if (e.ctrlKey && e.key === '2') {
            document.getElementById('username').value = 'cajero';
            document.getElementById('password').value = 'cajero123';
        }
    });

    // Verificar si ya está logueado
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            if (user.role === 'admin') {
                window.location.href = '/admin';
            } else if (user.role === 'cajero') {
                window.location.href = '/pos';
            }
        } catch (error) {
            localStorage.removeItem('user');
        }
    }

    // Enfocar el campo de usuario al cargar
    document.getElementById('username').focus();
});