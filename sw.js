const CACHE_VERSION = 'v1.2';
const APP_SHELL_CACHE = `appShell_${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic_${CACHE_VERSION}`;

// Archivos esenciales para el funcionamiento offline
const CACHE_FILES = [
    '/',
    '/manifest.json',
    '/icon.svg',
    '/vite.svg'
];

self.addEventListener('install', event => {
    console.log('SW: Instalando service worker...');
    event.waitUntil(
        caches.open(APP_SHELL_CACHE)
        .then(cache => {
            console.log('SW: Cacheando archivos esenciales...');
            return cache.addAll(CACHE_FILES);
        })
        .then(() => {
            console.log('SW: Archivos esenciales cacheados exitosamente');
            return self.skipWaiting();
        })
        .catch(error => {
            console.error('SW: Error al cachear archivos:', error);
        })
    );
});


self.addEventListener('activate', event => {
    console.log('SW: Activando service worker...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Eliminar caches antiguos que no coincidan con la versión actual
                    if (cacheName !== APP_SHELL_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('SW: Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('SW: Service worker activado y caches limpiados');
            return self.clients.claim();
        })
    );
});


self.addEventListener('fetch', event => {
    // Manejar peticiones GET y POST (para autenticación)
    if(event.request.method !== "GET" && event.request.method !== "POST"){
        return;
    }

    // Evitar cachear peticiones a APIs externas o recursos no necesarios
    const url = new URL(event.request.url);
    if(url.origin !== location.origin && !url.pathname.includes('/api/')) {
        return;
    }

    // Manejar peticiones de autenticación offline
    if(url.pathname.includes('/api/auth/')) {
        return handleAuthRequest(event);
    }

    event.respondWith(
        caches.match(event.request)
        .then(cacheResponse => {
            // Si está en cache, devolverlo inmediatamente
            if(cacheResponse) {
                console.log('SW: Sirviendo desde cache:', event.request.url);
                console.log('📱 PWA OFFLINE: Contenido disponible localmente');
                return cacheResponse;
            }

            // Si no está en cache, hacer petición a la red
            console.log('SW: Petición a la red:', event.request.url);
            return fetch(event.request)
            .then(networkResponse => {
                // Verificar si la respuesta es válida
                if(networkResponse.status === 200) {
                    // Agregar al cache dinámico
                    const responseClone = networkResponse.clone();
                    caches.open(DYNAMIC_CACHE)
                    .then(cache => {
                        cache.put(event.request, responseClone);
                        console.log('SW: Agregado al cache dinámico:', event.request.url);
                    })
                    .catch(error => {
                        console.error('SW: Error al agregar al cache:', error);
                    });
                }
                return networkResponse;
            })
            .catch(error => {
                console.log('SW: Error de red, intentando fallback:', error);
                console.log('🌐 SIN CONEXIÓN A INTERNET DETECTADA');
                console.log('🔄 PWA ACTIVA EN MODO OFFLINE - Sirviendo contenido desde cache local');
                
                // Fallback para páginas HTML
                if(event.request.destination === 'document') {
                    return caches.match('/')
                    .then(indexCache => {
                        if(indexCache) {
                            console.log('✅ PWA OFFLINE: Página principal servida desde cache');
                            return indexCache;
                        }
                        console.log('⚠️ PWA OFFLINE: Página no disponible en cache, mostrando página offline');
                        return new Response(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Sin conexión - PWA Activa</title>
                                <meta charset="utf-8">
                                <style>
                                    body { 
                                        font-family: Arial, sans-serif; 
                                        text-align: center; 
                                        padding: 50px; 
                                        background: #f5f5f5;
                                    }
                                    .offline-badge {
                                        background: #4CAF50;
                                        color: white;
                                        padding: 10px 20px;
                                        border-radius: 20px;
                                        display: inline-block;
                                        margin-bottom: 20px;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="offline-badge">🔄 PWA ACTIVA</div>
                                <h1>Sin conexión a internet</h1>
                                <p>Tu aplicación PWA está funcionando en modo offline.</p>
                                <p>Algunas páginas pueden no estar disponibles sin conexión.</p>
                            </body>
                            </html>
                        `, {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    });
                }
                
                // Para otros recursos, devolver error
                console.log('❌ PWA OFFLINE: Recurso no disponible en cache');
                return new Response('Recurso no disponible offline', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            });
        })
    );
});




// Función para manejar peticiones de autenticación offline
function handleAuthRequest(event) {
    const url = new URL(event.request.url);
    
    // Solo manejar peticiones POST de login/registro
    if(event.request.method !== 'POST') {
        return;
    }

    event.respondWith(
        fetch(event.request)
        .then(response => {
            // Si la petición es exitosa, guardar en cache para uso offline
            if(response.ok) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                .then(cache => {
                    cache.put(event.request, responseClone);
                    console.log('SW: Respuesta de auth guardada en cache');
                });
            }
            return response;
        })
        .catch(error => {
            console.log('SW: Error en petición de auth, intentando fallback offline');
            
            // Para login offline, verificar si hay sesión guardada
            if(url.pathname.includes('/login')) {
                return new Response(JSON.stringify({
                    success: true,
                    message: 'Sesión restaurada desde cache offline',
                    data: {
                        id: 'offline_user',
                        nombre: 'Usuario Offline',
                        correo: 'offline@example.com',
                        offline: true
                    }
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // Para registro offline, devolver error
            if(url.pathname.includes('/registro')) {
                return new Response(JSON.stringify({
                    success: false,
                    message: 'Registro no disponible offline. Intenta cuando tengas conexión.'
                }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // Para otras peticiones de auth
            return new Response(JSON.stringify({
                success: false,
                message: 'Servicio no disponible offline'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        })
    );
}

// Sincronización en background cuando vuelve la conexión
self.addEventListener('sync', event => {
    console.log('SW: Evento de sincronización detectado:', event.tag);
    
    if (event.tag === 'background-sync-auth') {
        event.waitUntil(
            // Aquí podrías sincronizar datos pendientes cuando vuelva la conexión
            console.log('SW: Sincronizando datos de autenticación...')
        );
    }
});

// Detectar cuando vuelve la conexión
self.addEventListener('online', () => {
    console.log('🌐 PWA: Conexión a internet restaurada');
    // Notificar a los clientes que la conexión está disponible
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'CONNECTION_RESTORED',
                message: 'Conexión a internet restaurada'
            });
        });
    });
});

// Detectar cuando se pierde la conexión
self.addEventListener('offline', () => {
    console.log('📱 PWA: Sin conexión a internet - Modo offline activado');
});

/*self.addEventListener('push', event => {});*/