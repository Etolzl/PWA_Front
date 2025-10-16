# Solución de Problemas - PWA en Desarrollo Local

## 🔍 Diagnóstico Paso a Paso

### 1. **Ejecutar Diagnóstico Automático**

1. Abre tu PWA en `http://192.168.1.4:5173`
2. Abre DevTools (F12)
3. Ve a la pestaña **Console**
4. Copia y pega el contenido del archivo `DIAGNOSTICO_SW.js`
5. Presiona Enter para ejecutar

### 2. **Verificar Logs del Service Worker**

En la consola, busca estos logs específicos:

```
✅ Logs que DEBES ver:
- "SW: Entorno detectado: DESARROLLO LOCAL"
- "SW: Instalando service worker..."
- "SW: Cacheando archivos esenciales..."
- "SW: ✅ Cacheado exitosamente: /"
- "SW: ✅ Cacheado exitosamente: /manifest.json"
```

```
❌ Logs que indican problemas:
- "SW: ❌ No se pudo cachear"
- "Error al registrar SW:"
- "Service worker no está registrado"
```

### 3. **Probar Funcionalidad Offline**

#### Paso 1: Verificar que el SW esté activo
```javascript
// En la consola:
navigator.serviceWorker.ready.then(reg => {
  console.log('SW activo:', reg.active ? 'SÍ' : 'NO');
  console.log('Scope:', reg.scope);
});
```

#### Paso 2: Probar fetch offline
```javascript
// En la consola:
testOfflineFetch();
```

#### Paso 3: Activar modo offline
1. DevTools → Network → Throttling → Offline
2. O activar modo avión en el dispositivo
3. Intentar guardar una imagen
4. Verificar logs en consola

### 4. **Verificar Caché**

```javascript
// En la consola:
caches.keys().then(names => {
  console.log('Caches:', names);
  names.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(requests => {
        console.log(`${name}: ${requests.length} archivos`);
      });
    });
  });
});
```

## 🛠️ Soluciones por Problema

### Problema 1: Service Worker no se registra

**Síntomas:**
- No aparecen logs del SW en consola
- Error: "Service worker no está registrado"

**Solución:**
```javascript
// Limpiar todo y empezar de nuevo
limpiarTodo();
// Luego recargar la página
```

### Problema 2: Caché no funciona

**Síntomas:**
- Logs: "SW: ❌ No se pudo cachear"
- No hay archivos en cache

**Solución:**
1. Verificar que no estés en modo incógnito
2. Verificar permisos del navegador
3. Limpiar caché del navegador
4. Recargar la página

### Problema 3: Fetchs no funcionan offline

**Síntomas:**
- Error al intentar guardar imágenes offline
- No se encolan tareas asíncronas

**Solución:**
1. Verificar que el SW esté interceptando las peticiones
2. Buscar logs: "SW: 📝 Procesando guardado de imagen offline..."
3. Verificar IndexedDB:
```javascript
// Verificar tareas pendientes
const request = indexedDB.open('pwa_offline_db');
request.onsuccess = () => {
  const db = request.result;
  const tx = db.transaction(['pending_images'], 'readonly');
  const store = tx.objectStore('pending_images');
  store.count().onsuccess = () => {
    console.log('Imágenes pendientes:', store.count().result);
  };
};
```

### Problema 4: Solo carga Dashboard.jsx offline

**Síntomas:**
- La aplicación solo muestra el Dashboard
- Otros componentes no cargan

**Solución:**
1. Verificar que todos los archivos estén cacheados
2. Verificar logs de fetch en el SW
3. Comprobar que no haya errores de red

## 🔧 Comandos de Emergencia

### Limpiar Todo y Empezar de Nuevo
```javascript
limpiarTodo();
// Luego recargar la página
```

### Forzar Actualización del SW
```javascript
actualizarSW();
```

### Verificar Estado Completo
```javascript
// Ejecutar diagnóstico completo
// (copiar y pegar DIAGNOSTICO_SW.js)
```

## 📱 Pruebas Específicas

### Prueba 1: Caché Básico
1. Cargar la página online
2. Verificar que se cacheen archivos básicos
3. Activar modo offline
4. Recargar la página
5. Debe cargar desde cache

### Prueba 2: Tareas Asíncronas
1. Estar online
2. Cargar algunas imágenes en el Dashboard
3. Activar modo offline
4. Intentar guardar una nueva imagen
5. Debe encolar la tarea
6. Activar modo online
7. Debe procesar la tarea automáticamente

### Prueba 3: Sincronización
1. Hacer varias acciones offline
2. Activar modo online
3. Verificar que se procesen todas las tareas
4. Verificar logs de sincronización

## 🚨 Problemas Conocidos y Soluciones

### Problema: IP Local con Service Workers
**Causa:** Los service workers tienen restricciones en IPs locales
**Solución:** Usar localhost o implementar las mejoras que ya están en el código

### Problema: Vite HMR Interfiere
**Causa:** Hot Module Replacement puede interferir con el caché
**Solución:** El código ya detecta desarrollo local y ajusta el comportamiento

### Problema: IndexedDB no funciona
**Causa:** Permisos o contexto de seguridad
**Solución:** Verificar que no estés en modo incógnito

## 📊 Logs Importantes a Monitorear

```
✅ Logs de Éxito:
- "SW: ✅ Cacheado exitosamente"
- "SW: ✅ Tarea agregada a IndexedDB"
- "SW: ✅ Background sync registrado"
- "SW: ✅ Sonda de conectividad iniciada"

❌ Logs de Error:
- "SW: ❌ No se pudo cachear"
- "SW: ❌ Error encolando imagen offline"
- "Error al registrar SW:"
```

## 🎯 Resultado Esperado

Después de seguir estos pasos, deberías ver:

1. ✅ Service Worker registrado y activo
2. ✅ Archivos básicos cacheados
3. ✅ Tareas offline encoladas correctamente
4. ✅ Sincronización automática al restaurar conexión
5. ✅ Logs detallados en consola

Si sigues teniendo problemas después de estos pasos, ejecuta el diagnóstico y comparte los logs específicos que aparecen en la consola.
