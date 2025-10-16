# Guía para Desarrollo Local con PWA

## Problemas Identificados y Solucionados

### 🔧 **Problemas con IP Local (192.168.1.4:5173)**

Los service workers tienen restricciones cuando se ejecutan en IPs locales. He implementado las siguientes soluciones:

### ✅ **Soluciones Implementadas:**

1. **Detección Automática de Entorno**:
   - El service worker detecta automáticamente si está en desarrollo local
   - Ajusta el comportamiento según el entorno

2. **Estrategia de Caché Adaptativa**:
   - **Desarrollo Local**: No cachea archivos de Vite que cambian constantemente
   - **Producción**: Cachea todos los archivos esenciales

3. **Estrategia de Fetch Mejorada**:
   - **Desarrollo Local**: Prioriza la red para archivos de Vite
   - **Producción**: Usa estrategia cache-first

4. **PushService Optimizado**:
   - En desarrollo local usa directamente la clave VAPID del backend
   - Evita peticiones innecesarias al servidor

## 🚀 **Cómo Usar en Desarrollo Local**

### Opción 1: Usar localhost (Recomendado)
```bash
# En lugar de usar la IP, usa localhost
npm run dev
# Luego accede a: http://localhost:5173
```

### Opción 2: Usar la IP (Con las mejoras implementadas)
```bash
# Si necesitas usar la IP para probar en dispositivos móviles
npm run dev
# Accede a: http://192.168.1.4:5173
```

## 🔍 **Verificación del Funcionamiento**

### 1. **Verificar Service Worker**:
```javascript
// En la consola del navegador:
navigator.serviceWorker.ready.then(reg => {
  console.log('SW activo:', reg);
  console.log('Scope:', reg.scope);
});
```

### 2. **Verificar Detección de Entorno**:
```javascript
// En la consola del navegador:
// Deberías ver: "SW: Entorno detectado: DESARROLLO LOCAL"
```

### 3. **Verificar Caché**:
- DevTools → Application → Storage → Cache Storage
- En desarrollo local, solo deberías ver caches básicos
- En producción, verás todos los archivos cacheados

## 🛠️ **Comandos Útiles para Desarrollo**

### Limpiar Caché del Service Worker:
```bash
# En DevTools → Application → Storage → Clear storage
# O programáticamente:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
```

### Forzar Actualización del Service Worker:
```bash
# Cambiar la versión en sw.js (CACHE_VERSION)
# Recargar la página
```

### Verificar Estado de Conectividad:
```javascript
// En la consola:
console.log('Online:', navigator.onLine);
console.log('Connection:', navigator.connection);
```

## 📱 **Probar en Dispositivos Móviles**

### Para Probar en Smartphone:
1. **Usar localhost con tunneling**:
   ```bash
   # Instalar ngrok
   npm install -g ngrok
   
   # En una terminal, ejecutar tu app
   npm run dev
   
   # En otra terminal, crear túnel
   ngrok http 5173
   
   # Usar la URL de ngrok en tu smartphone
   ```

2. **O usar la IP directamente** (con las mejoras implementadas):
   - Asegúrate de que tu smartphone esté en la misma red WiFi
   - Accede a `http://192.168.1.4:5173`
   - El service worker ahora debería funcionar correctamente

## 🔧 **Configuración de Vite Mejorada**

He actualizado `vite.config.js` con:
- Headers para service workers
- Configuración de desarrollo optimizada
- Mejor compatibilidad con PWA

## 🐛 **Solución de Problemas**

### Si el Service Worker no se registra:
1. Verificar que estés usando HTTPS o localhost
2. Limpiar caché del navegador
3. Verificar consola para errores

### Si los fetchs no funcionan:
1. Verificar que la API esté disponible
2. Comprobar CORS en el backend
3. Verificar logs del service worker

### Si el caché no funciona:
1. Verificar que no estés en modo incógnito
2. Comprobar permisos del navegador
3. Limpiar storage y recargar

## 📊 **Logs Útiles**

Busca estos logs en la consola:
- `SW: Entorno detectado: DESARROLLO LOCAL`
- `SW: Desarrollo local - priorizando red para:`
- `🔧 Modo desarrollo local detectado`

## 🎯 **Recomendaciones**

1. **Para desarrollo**: Usa `localhost:5173`
2. **Para pruebas móviles**: Usa ngrok o la IP con las mejoras implementadas
3. **Para producción**: Sube a un dominio real (no es necesario, pero es mejor)

## ✅ **Resultado Esperado**

Con estas mejoras, tu PWA debería funcionar correctamente tanto en:
- ✅ Desarrollo local (localhost)
- ✅ Desarrollo local con IP (192.168.1.4:5173)
- ✅ Producción (dominio real)

El service worker ahora detecta automáticamente el entorno y ajusta su comportamiento para proporcionar la mejor experiencia en cada caso.
