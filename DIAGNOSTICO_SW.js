// Script de diagnóstico para Service Worker
// Ejecutar en la consola del navegador para diagnosticar problemas

console.log('🔍 INICIANDO DIAGNÓSTICO DEL SERVICE WORKER');
console.log('==========================================');

// 1. Verificar soporte de Service Worker
console.log('1. Soporte de Service Worker:');
console.log('   - Service Worker soportado:', 'serviceWorker' in navigator);
console.log('   - Push Manager soportado:', 'PushManager' in window);
console.log('   - IndexedDB soportado:', 'indexedDB' in window);

// 2. Verificar estado de conectividad
console.log('\n2. Estado de Conectividad:');
console.log('   - Online:', navigator.onLine);
console.log('   - Connection:', navigator.connection ? navigator.connection.effectiveType : 'No disponible');

// 3. Verificar Service Worker registrado
console.log('\n3. Service Worker:');
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('   - Registros activos:', registrations.length);
        registrations.forEach((reg, index) => {
            console.log(`   - SW ${index + 1}:`, {
                scope: reg.scope,
                state: reg.active ? reg.active.state : 'No activo',
                scriptURL: reg.active ? reg.active.scriptURL : 'No disponible'
            });
        });
    });

    navigator.serviceWorker.ready.then(registration => {
        console.log('   - SW listo:', registration.scope);
        console.log('   - SW activo:', !!registration.active);
        console.log('   - SW instalando:', !!registration.installing);
        console.log('   - SW esperando:', !!registration.waiting);
    }).catch(err => {
        console.log('   - Error SW ready:', err);
    });
} else {
    console.log('   - Service Worker no soportado');
}

// 4. Verificar Caché
console.log('\n4. Caché:');
if ('caches' in window) {
    caches.keys().then(cacheNames => {
        console.log('   - Caches disponibles:', cacheNames);
        cacheNames.forEach(cacheName => {
            caches.open(cacheName).then(cache => {
                cache.keys().then(requests => {
                    console.log(`   - ${cacheName}: ${requests.length} entradas`);
                    if (requests.length > 0) {
                        console.log('     URLs cacheadas:', requests.map(r => r.url));
                    }
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
        console.log('   - Base de datos PWA:', db.name, 'v' + db.version);
        console.log('   - Object stores:', Array.from(db.objectStoreNames));
        
        // Verificar tareas pendientes
        const tx = db.transaction(['pending_registrations', 'pending_images'], 'readonly');
        const regStore = tx.objectStore('pending_registrations');
        const imgStore = tx.objectStore('pending_images');
        
        regStore.count().onsuccess = () => {
            console.log('   - Registros pendientes:', regStore.count().result);
        };
        
        imgStore.count().onsuccess = () => {
            console.log('   - Imágenes pendientes:', imgStore.count().result);
        };
        
        db.close();
    };
    request.onerror = () => {
        console.log('   - Error abriendo IndexedDB:', request.error);
    };
} else {
    console.log('   - IndexedDB no soportado');
}

// 6. Verificar PWA
console.log('\n6. PWA:');
console.log('   - Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
console.log('   - User agent:', navigator.userAgent);

// 7. Verificar eventos de conectividad
console.log('\n7. Eventos de Conectividad:');
window.addEventListener('online', () => console.log('   - Evento: ONLINE'));
window.addEventListener('offline', () => console.log('   - Evento: OFFLINE'));

// 8. Función para probar fetch offline
window.testOfflineFetch = async () => {
    console.log('\n🧪 PROBANDO FETCH OFFLINE:');
    try {
        const response = await fetch('/api/images/saved', {
            method: 'GET',
            headers: {
                'x-user-id': 'test-user'
            }
        });
        console.log('   - Fetch exitoso:', response.status, response.statusText);
        const data = await response.json();
        console.log('   - Datos recibidos:', data);
    } catch (error) {
        console.log('   - Error en fetch:', error.message);
    }
};

// 9. Función para limpiar todo
window.limpiarTodo = async () => {
    console.log('\n🧹 LIMPIANDO TODO:');
    
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
            console.log('   - SW desregistrado:', registration.scope);
        }
    }
    
    console.log('   - Limpieza completada. Recarga la página.');
};

// 10. Función para forzar actualización del SW
window.actualizarSW = async () => {
    console.log('\n🔄 ACTUALIZANDO SERVICE WORKER:');
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            console.log('   - SW actualizado');
        } else {
            console.log('   - No hay SW esperando');
        }
    }
};

console.log('\n✅ DIAGNÓSTICO COMPLETADO');
console.log('==========================================');
console.log('Funciones disponibles:');
console.log('- testOfflineFetch(): Probar fetch offline');
console.log('- limpiarTodo(): Limpiar todo y empezar de nuevo');
console.log('- actualizarSW(): Forzar actualización del SW');
console.log('==========================================');
