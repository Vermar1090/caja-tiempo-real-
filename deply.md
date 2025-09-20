# 🚀 Guía Paso a Paso: GitHub + Render

## 📋 Checklist Pre-Deploy

- ✅ Todos los archivos del sistema creados
- ✅ package.json con engines y scripts correctos  
- ✅ render.yaml configurado
- ✅ .gitignore preparado
- ✅ README.md completo

## 🗂️ 1. Subir a GitHub

### Comandos en tu terminal:

```bash
# 1. Inicializar git (si no lo has hecho)
git init

# 2. Agregar todos los archivos
git add .

# 3. Primer commit
git commit -m "🏪 Sistema de caja completo con tiempo real"

# 4. Configurar rama principal
git branch -M main

# 5. Crear repositorio en GitHub y conectar
# Ve a: https://github.com/new
# Nombre: caja-tiempo-real
# Descripción: Sistema de caja en tiempo real con arqueo
# Público/Privado: tu elección

# 6. Conectar con tu repositorio (reemplaza TU-USUARIO)
git remote add origin https://github.com/TU-USUARIO/caja-tiempo-real.git

# 7. Subir código
git push -u origin main
```

## ⚡ 2. Deploy en Render

### A. Crear Cuenta y Servicio

1. **Ir a [render.com](https://render.com)** → Sign Up/Login

2. **Dashboard** → "New +" → "Web Service"

3. **Connect Repository**:
   - Autorizar GitHub si es necesario
   - Buscar tu repositorio `caja-tiempo-real`
   - Click "Connect"

### B. Configuración del Servicio

```
┌─ Service Configuration ─────────────────┐
│ Name: caja-tiempo-real                  │
│ Runtime: Node                           │
│ Region: Oregon (US West) - Recomendado  │
│ Branch: main                            │
│ Build Command: npm install             │
│ Start Command: npm start               │
│ Plan: Free                             │
└─────────────────────────────────────────┘
```

### C. Variables de Entorno (Opcional)

En "Environment Variables":
```
NODE_ENV = production
```

### D. Configurar Persistent Disk (IMPORTANTE)

1. **Después de crear el servicio** → Settings → Disks
2. **Add Disk**:
   ```
   Name: sqlite-data
   Mount Path: /opt/render/project/src/data
   Size: 1 GB
   ```
3. **Save Changes**

### E. Deploy Manual (Primera vez)

- Click "Manual Deploy" → "Deploy latest commit"
- Esperar ~5-10 minutos

## 🎯 3. Verificar Deployment

### URLs de tu app:
```
🌐 App: https://caja-tiempo-real.onrender.com
🔧 Debug: https://caja-tiempo-real.onrender.com/api/debug/usuarios
```

### Verificar funcionalidad:

1. **Login funciona** ✅
   - admin / admin123
   - cajero / cajero123

2. **Base de datos persiste** ✅
   - Crear turno, cerrar navegador, volver
   - Los datos deben seguir ahí

3. **Tiempo real funciona** ✅
   - Abrir admin y cajero en pestañas diferentes
   - Registrar movimiento en cajero
   - Ver actualización en admin

## 🔄 4. Deploy Automático

Una vez configurado, cada `git push` desplegará automáticamente:

```bash
# Hacer cambios en tu código
git add .
git commit -m "✨ Nueva funcionalidad"
git push

# Render detecta el push y despliega automáticamente
```

## 🐛 5. Solución de Problemas Comunes

### ❌ Error: "Application failed to respond"
```bash
# Verificar logs en Render Dashboard → Logs
# Comúnmente: puerto mal configurado
```

### ❌ Base de datos se borra en cada deploy
```bash
# Verificar que el Persistent Disk esté configurado
# Mount Path debe ser: /opt/render/project/src/data
```

### ❌ Socket.IO no conecta
```bash
# Verificar que no hayas cambiado la configuración de puertos
# Render maneja automáticamente el PORT
```

### ❌ NPM install falla
```bash
# Verificar que package.json tenga engines:
# "engines": { "node": ">=18.0.0" }
```

## 📊 6. Monitorear tu App

### Render Dashboard:
- **Logs**: Ver output en tiempo real
- **Metrics**: CPU, memoria, requests
- **Events**: Historial de deploys
- **Settings**: Cambiar configuración

### Comandos útiles:
```bash
# Ver logs en vivo
# Dashboard → Service → Logs → "Live tail"

# Redeploy manual
# Dashboard → Service → "Manual Deploy"

# Ver variables de entorno
# Settings → Environment Variables
```

## 🎉 ¡Listo!

Tu sistema ya está en producción. URLs importantes:

- **🏪 App**: https://TU-SERVICIO.onrender.com
- **📊 Admin**: https://TU-SERVICIO.onrender.com/admin  
- **🛒 Cajero**: https://TU-SERVICIO.onrender.com/pos
- **🔧 Debug**: https://TU-SERVICIO.onrender.com/api/debug/usuarios

### Notas importantes:

1. **Free tier duerme** después de 15 min inactivo
2. **Primer request** puede tardar ~30 segundos en despertar
3. **Base de datos persiste** gracias al disk configurado
4. **HTTPS automático** incluido por Render

¡Tu sistema de caja está oficialmente en la nube! 🚀