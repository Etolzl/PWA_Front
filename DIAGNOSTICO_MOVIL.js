// Script de diagnóstico específico para dispositivos móviles
// Ejecutar en la consola del navegador móvil

console.log('📱 DIAGNÓSTICO PWA PARA DISPOSITIVOS MÓVILES');
console.log('============================================');

// 1. Información del dispositivo
console.log('1. Información del Dispositivo:');
console.log('   - User Agent:', navigator.userAgent);
console.log('   - Plataforma:', navigator.platform);
console.log('   - Idioma:', navigator.language);
console.log('   - Online:', navigator.onLine);
console.log('   - Connection:', navigator.connection ? navigator.connection.effectiveType : 'No disponible');

// 2. Verificar Service Worker
console.log('\n2. Service Worker:');
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
        console.log('   - SW registrado:', !!registration);
        console.log('   - SW activo:', !!registration.active);
        console.log('   - Scope:', registration.scope);
        console.log('   - Estado:', registration.active ? registration.active.state : 'No activo');
        
        if (registration.active) {
            console.log('   - Script URL:', registration.active.scriptURL);
        }
    }).catch(err => {
        console.log('   - Error SW:', err);
    });
} else {
    console.log('   - Service Worker no soportado');
}

// 3. Verificar PWA
console.log('\n3. PWA:');
console.log('   - Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
console.log('   - Es PWA instalada:', window.matchMedia('(display-mode: standalone)').matches);
console.log('   - URL actual:', window.location.href);

// 4. Verificar Caché
console.log('\n4. Caché:');
if ('caches' in window) {
    caches.keys().then(cacheNames => {
        console.log('   - Caches disponibles:', cacheNames);
        cacheNames.forEach(cacheName => {
            caches.open(cacheName).then(cache => {
                cache.keys().then(requests => {
                    console.log(`   - ${cacheName}: ${requests.length} archivos`);
                });
            });
        });
    });
} else {
    console.log('   - Cache API no soportada');
}

// 5. Verificar IndexedDB
console.log('\n5. IndexedDB:');
if ('indexedDB' in window) {
    const request = indexedDB.open('pwa_offline_db');
    request.onsuccess = () => {
        const db = request.result;
        console.log('   - Base de datos:', db.name, 'v' + db.version);
        console.log('   - Object stores:', Array.from(db.objectStoreNames));
        db.close();
    };
    request.onerror = () => {
        console.log('   - Error IndexedDB:', request.error);
    };
} else {
    console.log('   - IndexedDB no soportado');
}

// 6. Función para probar offline
window.probarOfflineMovil = async () => {
    console.log('\n🧪 PROBANDO FUNCIONALIDAD OFFLINE:');
    
    // Probar fetch offline
    try {
        console.log('   - Probando fetch offline...');
        const response = await fetch('/api/images/saved', {
            method: 'GET',
            headers: {
                'x-user-id': 'test-user'
            }
        });
        console.log('   - Respuesta:', response.status, response.statusText);
        
        if (response.status === 503) {
            console.log('   - ✅ SW interceptó correctamente (modo offline)');
        } else {
            console.log('   - ⚠️ Respuesta de red (puede estar online)');
        }
    } catch (error) {
        console.log('   - ❌ Error:', error.message);
    }
};

// 7. Función para probar guardado offline
window.probarGuardadoMovil = async () => {
    console.log('\n🧪 PROBANDO GUARDADO OFFLINE:');
    
    try {
        const response = await fetch('/api/images/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'test-user'
            },
            body: JSON.stringify({
                imageUrl: 'https://example.com/test.jpg',
                title: 'Prueba móvil',
                description: 'Test desde móvil'
            })
        });
        
        const data = await response.json();
        console.log('   - Respuesta:', response.status, data);
        
        if (response.status === 202 && data.queued) {
            console.log('   - ✅ Tarea encolada correctamente');
        } else {
            console.log('   - ⚠️ No se encoló la tarea');
        }
    } catch (error) {
        console.log('   - ❌ Error:', error.message);
    }
};

// 8. Función para verificar logs del SW
window.verificarLogsMovil = () => {
    console.log('\n📋 VERIFICAR LOGS DEL SW:');
    console.log('   - Busca en la consola logs que empiecen con "SW:"');
    console.log('   - Deberías ver:');
    console.log('     * "SW: Entorno detectado: VERCEL"');
    console.log('     * "SW: Interceptando petición:"');
    console.log('     * "SW: 🌐 Interceptando API en producción:"');
};

// 9. Función para limpiar y reiniciar
window.limpiarMovil = async () => {
    console.log('\n🧹 LIMPIANDO PWA EN MÓVIL:');
    
    // Limpiar caches
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log('   - Cache eliminado:', cacheName);
        }
    }
    
    // Limpiar IndexedDB
    if ('indexedDB' in window) {
        indexedDB.deleteDatabase('pwa_offline_db');
        console.log('   - IndexedDB eliminado');
    }
    
    // Desregistrar Service Workers
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            await registration.unregister();
            console.log('   - SW desregistrado');
        }
    }
    
    console.log('   - ✅ Limpieza completada. Recarga la página.');
};

// 10. Función para instalar PWA
window.instalarPWA = () => {
    console.log('\n📱 INSTALAR PWA:');
    console.log('   - En Chrome: Menú → "Instalar app"');
    console.log('   - En Safari: Compartir → "Agregar a pantalla de inicio"');
    console.log('   - En Firefox: Menú → "Instalar"');
    console.log('   - Busca el botón de instalación en la barra de direcciones');
};

console.log('\n✅ DIAGNÓSTICO MÓVIL COMPLETADO');
console.log('============================================');
console.log('Funciones disponibles:');
console.log('- probarOfflineMovil(): Probar funcionalidad offline');
console.log('- probarGuardadoMovil(): Probar guardado offline');
console.log('- verificarLogsMovil(): Verificar logs del SW');
console.log('- limpiarMovil(): Limpiar PWA');
console.log('- instalarPWA(): Instrucciones para instalar');
console.log('============================================');
