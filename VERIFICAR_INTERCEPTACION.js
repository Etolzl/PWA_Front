// Script para verificar si el Service Worker está interceptando peticiones
// Ejecutar en la consola del navegador

console.log('🔍 VERIFICANDO INTERCEPTACIÓN DEL SERVICE WORKER');
console.log('===============================================');

// 1. Verificar si el SW está activo
console.log('1. Estado del Service Worker:');
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
        console.log('   - SW registrado:', !!registration);
        console.log('   - SW activo:', !!registration.active);
        console.log('   - Scope:', registration.scope);
        console.log('   - Script URL:', registration.active ? registration.active.scriptURL : 'No disponible');
        
        if (registration.active) {
            console.log('   - Estado del SW:', registration.active.state);
        }
    }).catch(err => {
        console.log('   - Error:', err);
    });
} else {
    console.log('   - Service Worker no soportado');
}

// 2. Verificar entorno
console.log('\n2. Entorno:');
console.log('   - Hostname:', window.location.hostname);
console.log('   - URL completa:', window.location.href);
console.log('   - Es IP local:', window.location.hostname.startsWith('192.168.') || 
                                 window.location.hostname.startsWith('10.') || 
                                 window.location.hostname.startsWith('172.'));

// 3. Función para probar interceptación
window.probarInterceptacion = async () => {
    console.log('\n🧪 PROBANDO INTERCEPTACIÓN:');
    
    // Probar petición a API de imágenes
    try {
        console.log('   - Haciendo petición a /api/images/saved...');
        const response = await fetch('/api/images/saved', {
            method: 'GET',
            headers: {
                'x-user-id': 'test-user'
            }
        });
        console.log('   - Respuesta recibida:', response.status, response.statusText);
        
        if (response.status === 503) {
            console.log('   - ✅ SW interceptó la petición (respuesta offline)');
        } else {
            console.log('   - ⚠️ SW no interceptó la petición (respuesta de red)');
        }
    } catch (error) {
        console.log('   - ❌ Error en petición:', error.message);
        if (error.message.includes('Failed to fetch')) {
            console.log('   - ⚠️ SW no interceptó la petición (error de red)');
        }
    }
};

// 4. Función para probar guardado offline
window.probarGuardadoOffline = async () => {
    console.log('\n🧪 PROBANDO GUARDADO OFFLINE:');
    
    try {
        console.log('   - Intentando guardar imagen offline...');
        const response = await fetch('/api/images/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'test-user'
            },
            body: JSON.stringify({
                imageUrl: 'https://example.com/test.jpg',
                title: 'Imagen de prueba',
                description: 'Prueba offline'
            })
        });
        
        const data = await response.json();
        console.log('   - Respuesta:', response.status, data);
        
        if (response.status === 202 && data.queued) {
            console.log('   - ✅ SW interceptó y encoló la tarea offline');
        } else {
            console.log('   - ⚠️ SW no interceptó correctamente');
        }
    } catch (error) {
        console.log('   - ❌ Error:', error.message);
    }
};

// 5. Función para verificar logs del SW
window.verificarLogsSW = () => {
    console.log('\n📋 LOGS DEL SERVICE WORKER:');
    console.log('   - Abre DevTools → Console');
    console.log('   - Busca logs que empiecen con "SW:"');
    console.log('   - Deberías ver:');
    console.log('     * "SW: Interceptando petición:"');
    console.log('     * "SW: 🔧 Interceptando API en desarrollo local:"');
    console.log('     * "SW: 📝 Procesando guardado de imagen offline..."');
};

// 6. Función para forzar actualización del SW
window.forzarActualizacionSW = async () => {
    console.log('\n🔄 FORZANDO ACTUALIZACIÓN DEL SW:');
    
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                console.log('   - ✅ SW actualizado');
            } else {
                // Forzar registro de nuevo SW
                await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
                console.log('   - ✅ SW re-registrado');
            }
        } catch (error) {
            console.log('   - ❌ Error actualizando SW:', error);
        }
    }
};

// 7. Función para limpiar y reiniciar
window.reiniciarSW = async () => {
    console.log('\n🧹 REINICIANDO SERVICE WORKER:');
    
    // Desregistrar todos los SW
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            await registration.unregister();
            console.log('   - SW desregistrado:', registration.scope);
        }
    }
    
    // Limpiar caches
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log('   - Cache eliminado:', cacheName);
        }
    }
    
    console.log('   - ✅ Limpieza completada. Recarga la página.');
};

console.log('\n✅ VERIFICACIÓN COMPLETADA');
console.log('===============================================');
console.log('Funciones disponibles:');
console.log('- probarInterceptacion(): Probar si el SW intercepta peticiones');
console.log('- probarGuardadoOffline(): Probar guardado offline');
console.log('- verificarLogsSW(): Instrucciones para verificar logs');
console.log('- forzarActualizacionSW(): Forzar actualización del SW');
console.log('- reiniciarSW(): Limpiar todo y reiniciar');
console.log('===============================================');
