const CACHE_VERSION = 'v1.5.2';
const APP_SHELL_CACHE = `appShell_${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic_${CACHE_VERSION}`;

// Detectar si estamos en desarrollo local
const isLocalDev = self.location.hostname === 'localhost' || 
                   self.location.hostname === '127.0.0.1' || 
                   self.location.hostname.startsWith('192.168.') ||
                   self.location.hostname.startsWith('10.') ||
                   self.location.hostname.startsWith('172.');

// Detectar si estamos en Vercel
const isVercel = self.location.hostname.includes('vercel.app') || 
                 self.location.hostname.includes('vercel.com');

console.log('SW: Entorno detectado:', isLocalDev ? 'DESARROLLO LOCAL' : (isVercel ? 'VERCEL' : 'PRODUCCIÓN'));
console.log('SW: Hostname:', self.location.hostname);
console.log('SW: Protocol:', self.location.protocol);

// ----- IndexedDB (para colas offline) -----
const IDB_NAME = 'pwa_offline_db';
const IDB_VERSION = 2; // Incrementar versión para agregar nuevo store
const STORE_PENDING_REG = 'pending_registrations';
const STORE_PENDING_IMAGES = 'pending_images';
const STORE_SAVED_IMAGES = 'saved_images';

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_NAME, IDB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_PENDING_REG)) {
                const store = db.createObjectStore(STORE_PENDING_REG, { keyPath: 'id', autoIncrement: true });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORE_PENDING_IMAGES)) {
                const store = db.createObjectStore(STORE_PENDING_IMAGES, { keyPath: 'id', autoIncrement: true });
                store.createIndex('createdAt', 'createdAt', { unique: false });
                store.createIndex('userId', 'userId', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORE_SAVED_IMAGES)) {
                const store = db.createObjectStore(STORE_SAVED_IMAGES, { keyPath: 'userId' });
                store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function idbAddPendingRegistration(task) {
    return openIndexedDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_PENDING_REG], 'readwrite');
        const store = tx.objectStore(STORE_PENDING_REG);
        const req = store.add(task);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

function idbGetAllPendingRegistrations() {
    return openIndexedDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_PENDING_REG], 'readonly');
        const store = tx.objectStore(STORE_PENDING_REG);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    }));
}

function idbDeletePendingRegistration(id) {
    return openIndexedDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_PENDING_REG], 'readwrite');
        const store = tx.objectStore(STORE_PENDING_REG);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    }));
}

function idbUpdatePendingRegistration(id, updates) {
    return openIndexedDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_PENDING_REG], 'readwrite');
        const store = tx.objectStore(STORE_PENDING_REG);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            const current = getReq.result;
            if (!current) return resolve();
            const updated = Object.assign({}, current, updates);
            const putReq = store.put(updated);
            putReq.onsuccess = () => resolve(updated);
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    }));
}

// ----- Funciones IndexedDB para imágenes -----
function idbAddPendingImage(task) {
    return openIndexedDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_PENDING_IMAGES], 'readwrite');
        const store = tx.objectStore(STORE_PENDING_IMAGES);
        const req = store.add(task);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

function idbGetAllPendingImages() {
    return openIndexedDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_PENDING_IMAGES], 'readonly');
        const store = tx.objectStore(STORE_PENDING_IMAGES);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    }));
}

function idbDeletePendingImage(id) {
    return openIndexedDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_PENDING_IMAGES], 'readwrite');
        const store = tx.objectStore(STORE_PENDING_IMAGES);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    }));
}

function idbUpdatePendingImage(id, updates) {
    return openIndexedDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_PENDING_IMAGES], 'readwrite');
        const store = tx.objectStore(STORE_PENDING_IMAGES);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            const current = getReq.result;
            if (!current) return resolve();
            const updated = Object.assign({}, current, updates);
            const putReq = store.put(updated);
            putReq.onsuccess = () => resolve(updated);
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    }));
}

function notifyClients(message) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage(message);
        });
    });
}

// ----- Funciones para cache de imágenes guardadas -----
function idbSaveUserImages(userId, imagesData) {
    return openIndexedDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_SAVED_IMAGES], 'readwrite');
        const store = tx.objectStore(STORE_SAVED_IMAGES);
        const data = {
            userId,
            images: imagesData,
            lastUpdated: Date.now()
        };
        const req = store.put(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

function idbGetUserImages(userId) {
    return openIndexedDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_SAVED_IMAGES], 'readonly');
        const store = tx.objectStore(STORE_SAVED_IMAGES);
        const req = store.get(userId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

function idbUpdateUserImage(userId, imageId, action) {
    return openIndexedDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_SAVED_IMAGES], 'readwrite');
        const store = tx.objectStore(STORE_SAVED_IMAGES);
        const getReq = store.get(userId);
        getReq.onsuccess = () => {
            const userData = getReq.result;
            if (!userData) return resolve();
            
            if (action === 'add') {
                // Agregar imagen (se manejará cuando se sincronice)
                userData.lastUpdated = Date.now();
            } else if (action === 'remove') {
                // Remover imagen del cache
                userData.images = userData.images.filter(img => img._id !== imageId);
                userData.lastUpdated = Date.now();
            }
            
            const putReq = store.put(userData);
            putReq.onsuccess = () => resolve(userData);
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    }));
}

// Debounce para evitar reprocesar la cola demasiadas veces
let lastQueueProcessAt = 0;
function maybeProcessQueue() {
    const now = Date.now();
    if (now - lastQueueProcessAt > 15000) { // 15s
        lastQueueProcessAt = now;
        try { 
            Promise.all([
                processPendingRegistrations(),
                processPendingImages()
            ]).catch(_ => {});
        } catch (_) {}
    }
}

// ----- Sonda de conectividad con backoff -----
let probeTimer = null;
let probeDelayMs = 5000; // inicio 5s
const PROBE_MAX_DELAY_MS = 60000; // máximo 60s

async function ensureConnectivityProbe() {
    try {
        const [regTasks, imageTasks] = await Promise.all([
            idbGetAllPendingRegistrations(),
            idbGetAllPendingImages()
        ]);
        if ((regTasks && regTasks.length > 0) || (imageTasks && imageTasks.length > 0)) {
            if (probeTimer == null) scheduleNextProbe();
        }
    } catch (_) {}
}

function scheduleNextProbe() {
    if (probeTimer) clearTimeout(probeTimer);
    probeTimer = setTimeout(() => {
        probeTimer = null;
        probeConnectivityAndFlush();
    }, probeDelayMs);
}

async function probeConnectivityAndFlush() {
    try {
        const [regTasks, imageTasks] = await Promise.all([
            idbGetAllPendingRegistrations(),
            idbGetAllPendingImages()
        ]);
        
        if ((!regTasks || regTasks.length === 0) && (!imageTasks || imageTasks.length === 0)) {
            // Nada que hacer, cancelar sonda
            if (probeTimer) { clearTimeout(probeTimer); probeTimer = null; }
            probeDelayMs = 5000;
            return;
        }

        // Tomar el origen del primer registro en cola (prioridad a registros)
        const firstTask = regTasks && regTasks.length > 0 ? regTasks[0] : imageTasks[0];
        const firstUrl = firstTask.url || firstTask.endpoint || '/';
        let origin;
        try { origin = new URL(firstUrl, self.location.origin).origin; } catch (_) { origin = self.location.origin; }

        // Hacer un ping ligero al backend
        const pingUrl = origin + '/';
        const resp = await fetch(pingUrl, { method: 'GET', cache: 'no-store', mode: 'cors' });
        if (resp && resp.ok) {
            // Conectividad restaurada
            notifyClients({ type: 'CONNECTIVITY_OK', message: 'Conectividad restaurada (sonda)' });
            probeDelayMs = 5000; // resetear backoff
            
            // Procesar ambas colas
            await Promise.all([
                processPendingRegistrations(),
                processPendingImages()
            ]);

            // Si aún quedan tareas, seguir sondeando
            const [remainingReg, remainingImages] = await Promise.all([
                idbGetAllPendingRegistrations(),
                idbGetAllPendingImages()
            ]);
            
            if ((remainingReg && remainingReg.length > 0) || (remainingImages && remainingImages.length > 0)) {
                scheduleNextProbe();
            } else {
                if (probeTimer) { clearTimeout(probeTimer); probeTimer = null; }
            }
            return;
        }
        // No OK → backoff
        probeDelayMs = Math.min(PROBE_MAX_DELAY_MS, probeDelayMs * 2);
        scheduleNextProbe();
    } catch (_) {
        // Error de red → backoff
        probeDelayMs = Math.min(PROBE_MAX_DELAY_MS, probeDelayMs * 2);
        scheduleNextProbe();
    }
}

function headersToObject(headers) {
    const obj = {};
    try {
        headers.forEach((value, key) => {
            obj[key] = value;
        });
    } catch (_) {}
    return obj;
}

function objectToHeaders(obj) {
    const headers = new Headers();
    if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(k => {
            try { headers.append(k, obj[k]); } catch(_) {}
        });
    }
    return headers;
}

// Archivos esenciales para el funcionamiento offline
const CACHE_FILES = [
    '/',
    '/manifest.json',
    '/icon.svg',
    '/vite.svg'
];

// En desarrollo local, no cachear archivos de Vite ya que cambian constantemente
// En Vercel/producción, cachear archivos estáticos compilados
if (!isLocalDev) {
    // Para Vercel, los archivos están en /assets/ después del build
    if (isVercel) {
        CACHE_FILES.push(
            '/assets/index.js',
            '/assets/index.css',
            '/assets/App.js',
            '/assets/App.css'
        );
    } else {
        // Para otros entornos de producción
        CACHE_FILES.push(
            '/src/main.jsx',
            '/src/App.jsx',
            '/src/App.css',
            '/src/index.css',
            '/src/components/Dashboard.jsx',
            '/src/components/Dashboard.css',
            '/src/components/PushNotificationManager.jsx',
            '/src/components/PushNotificationManager.css',
            '/src/services/eventService.js',
            '/src/services/pushService.js'
        );
    }
}

self.addEventListener('install', event => {
    console.log('SW: Instalando service worker...');
    console.log('SW: Entorno:', isLocalDev ? 'DESARROLLO LOCAL' : 'PRODUCCIÓN');
    console.log('SW: Archivos a cachear:', CACHE_FILES);
    
    event.waitUntil(
        caches.open(APP_SHELL_CACHE)
        .then(cache => {
            console.log('SW: Cache abierto:', APP_SHELL_CACHE);
            console.log('SW: Cacheando archivos esenciales...');
            
            // Cachear archivos esenciales con manejo de errores individual
            return Promise.allSettled(
                CACHE_FILES.map(url => 
                    cache.add(url).then(() => {
                        console.log(`SW: ✅ Cacheado exitosamente: ${url}`);
                        return url;
                    }).catch(error => {
                        console.warn(`SW: ❌ No se pudo cachear ${url}:`, error);
                        return null;
                    })
                )
            );
        })
        .then(results => {
            const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
            const failed = results.filter(r => r.status === 'rejected' || !r.value).length;
            console.log(`SW: Cacheo completado - Exitosos: ${successful}, Fallidos: ${failed}`);
            console.log('SW: Archivos esenciales cacheados exitosamente');
            return self.skipWaiting();
        })
        .catch(error => {
            console.error('SW: Error al cachear archivos:', error);
            // Continuar aunque haya errores
            return self.skipWaiting();
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
        }).then(async () => {
            console.log('SW: Service worker activado y caches limpiados');
            await self.clients.claim();
            // Intentar procesar registros e imágenes pendientes al activar (por si ya hay conexión)
            try { 
                await Promise.all([
                    processPendingRegistrations(),
                    processPendingImages()
                ]); 
            } catch(_) {}
            // Iniciar sonda si hay pendientes
            try { await ensureConnectivityProbe(); } catch(_) {}
        })
    );
});


self.addEventListener('fetch', event => {
    // Manejar peticiones GET, POST y DELETE
    if(!["GET", "POST", "DELETE"].includes(event.request.method)){
        return;
    }

    const url = new URL(event.request.url);
    
    // Log para debugging
    console.log('SW: Interceptando petición:', {
        method: event.request.method,
        url: url.href,
        origin: url.origin,
        pathname: url.pathname,
        isLocalDev: isLocalDev
    });

    // Evitar cachear peticiones a APIs externas o recursos no necesarios
    // En desarrollo local, ser más permisivo con el cacheo
    if (!isLocalDev && url.origin !== location.origin && !url.pathname.includes('/api/')) {
        console.log('SW: No interceptando - API externa en producción');
        return;
    }
    
    // En desarrollo local, evitar cachear recursos de Vite HMR
    if (isLocalDev && (url.pathname.includes('/@vite/') || url.pathname.includes('/node_modules/'))) {
        console.log('SW: No interceptando - Recurso Vite HMR');
        return;
    }

    // No interceptar peticiones push al backend
    if(url.pathname.includes('/api/push/')) {
        console.log('SW: No interceptando petición push:', url.href);
        return;
    }

    // FORZAR interceptación de peticiones API en desarrollo local
    if (isLocalDev && url.pathname.includes('/api/')) {
        console.log('SW: 🔧 Interceptando API en desarrollo local:', url.pathname);
        
        // Manejar peticiones de autenticación offline
        if(url.pathname.includes('/api/auth/')) {
            return handleAuthRequest(event);
        }

        // Manejar peticiones de imágenes offline
        if(url.pathname.includes('/api/images/')) {
            return handleImageRequest(event);
        }
        
        // Para otras APIs, manejar genéricamente
        return handleGenericAPIRequest(event);
    }

    // En Vercel/producción, interceptar TODAS las peticiones API para offline
    if (!isLocalDev && url.pathname.includes('/api/')) {
        console.log('SW: 🌐 Interceptando API en producción:', url.pathname);
        
        // Manejar peticiones de autenticación offline
        if(url.pathname.includes('/api/auth/')) {
            return handleAuthRequest(event);
        }

        // Manejar peticiones de imágenes offline
        if(url.pathname.includes('/api/images/')) {
            return handleImageRequest(event);
        }
        
        // Para otras APIs, manejar genéricamente
        return handleGenericAPIRequest(event);
    }

    // Manejar peticiones de autenticación offline
    if(url.pathname.includes('/api/auth/')) {
        return handleAuthRequest(event);
    }

    // Manejar peticiones de imágenes offline
    if(url.pathname.includes('/api/images/')) {
        return handleImageRequest(event);
    }

    event.respondWith(
        caches.match(event.request)
        .then(cacheResponse => {
            // En desarrollo local, priorizar la red para archivos de Vite
            if (isLocalDev && (url.pathname.includes('/src/') || url.pathname.includes('/@vite/'))) {
                console.log('SW: 🔧 Desarrollo local - priorizando red para:', event.request.url);
                return fetch(event.request)
                .then(networkResponse => {
                    console.log('SW: 🌐 Respuesta de red exitosa:', event.request.url, 'Status:', networkResponse.status);
                    if (networkResponse.status === 200) {
                        // Cachear solo si no es un archivo de Vite HMR
                        if (!url.pathname.includes('/@vite/')) {
                            const responseClone = networkResponse.clone();
                            caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(event.request, responseClone);
                                console.log('SW: 💾 Agregado al cache dinámico (dev):', event.request.url);
                            })
                            .catch(err => console.warn('SW: Error al cachear:', err));
                        }
                    }
                    return networkResponse;
                })
                .catch(error => {
                    console.log('SW: ❌ Error de red en desarrollo local:', error);
                    // Si falla la red, usar cache si está disponible
                    if (cacheResponse) {
                        console.log('SW: 🔄 Red falló, usando cache:', event.request.url);
                        return cacheResponse;
                    }
                    console.log('SW: ❌ No hay cache disponible para:', event.request.url);
                    throw error;
                });
            }

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

                    // Fallback extra: ante cualquier respuesta de red exitosa, intentar procesar la cola
                    const isAuthPath = url.pathname.includes('/api/auth/');
                    const isImagePath = url.pathname.includes('/api/images/');
                    if (!isAuthPath && !isImagePath) {
                        maybeProcessQueue();
                    }
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
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <style>
                                    body { 
                                        font-family: Arial, sans-serif; 
                                        text-align: center; 
                                        padding: 50px; 
                                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                        color: white;
                                        margin: 0;
                                        min-height: 100vh;
                                        display: flex;
                                        flex-direction: column;
                                        justify-content: center;
                                        align-items: center;
                                    }
                                    .offline-badge {
                                        background: #4CAF50;
                                        color: white;
                                        padding: 15px 30px;
                                        border-radius: 25px;
                                        display: inline-block;
                                        margin-bottom: 30px;
                                        font-size: 1.2rem;
                                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                                    }
                                    h1 {
                                        font-size: 2.5rem;
                                        margin-bottom: 20px;
                                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                                    }
                                    p {
                                        font-size: 1.2rem;
                                        margin: 10px 0;
                                        opacity: 0.9;
                                    }
                                    .retry-btn {
                                        background: #4CAF50;
                                        color: white;
                                        border: none;
                                        padding: 12px 24px;
                                        border-radius: 20px;
                                        font-size: 1rem;
                                        cursor: pointer;
                                        margin-top: 20px;
                                        transition: background 0.3s;
                                    }
                                    .retry-btn:hover {
                                        background: #45a049;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="offline-badge">🔄 PWA ACTIVA</div>
                                <h1>Sin conexión a internet</h1>
                                <p>Tu aplicación PWA está funcionando en modo offline.</p>
                                <p>Algunas páginas pueden no estar disponibles sin conexión.</p>
                                <button class="retry-btn" onclick="window.location.reload()">Reintentar</button>
                            </body>
                            </html>
                        `, {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    });
                }
                
                // Para recursos JavaScript y CSS, intentar servir desde cache
                if(event.request.destination === 'script' || event.request.destination === 'style') {
                    return caches.match(event.request.url)
                    .then(cachedResource => {
                        if(cachedResource) {
                            console.log('✅ PWA OFFLINE: Recurso JS/CSS servido desde cache');
                            return cachedResource;
                        }
                        // Si no está en cache, devolver un recurso vacío para evitar errores
                        if(event.request.destination === 'script') {
                            return new Response('// Recurso no disponible offline', {
                                headers: { 'Content-Type': 'application/javascript' }
                            });
                        } else {
                            return new Response('/* Recurso no disponible offline */', {
                                headers: { 'Content-Type': 'text/css' }
                            });
                        }
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




// Función para manejar peticiones de imágenes offline
function handleImageRequest(event) {
    const url = new URL(event.request.url);
    
    // Solo manejar peticiones POST, GET, DELETE para imágenes
    if(!['POST', 'GET', 'DELETE'].includes(event.request.method)) {
        return;
    }

    // Clonar la request una sola vez para poder leer el cuerpo en el modo offline
    const requestForReplay = event.request.clone();

    event.respondWith(
        fetch(event.request)
        .then(async response => {
            // Solo cachear peticiones GET exitosas
            if(response.ok && event.request.method === 'GET') {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                .then(cache => {
                    cache.put(event.request, responseClone);
                    console.log('SW: Respuesta de imagen guardada en cache');
                });

                // Si es una petición GET para obtener imágenes guardadas, cachear en IndexedDB
                if(url.pathname.includes('/saved')) {
                    try {
                        const userId = event.request.headers.get('x-user-id');
                        if (userId) {
                            // Crear una nueva respuesta clonada para IndexedDB
                            const responseForIndexedDB = response.clone();
                            const responseData = await responseForIndexedDB.json();
                            if (responseData.success && responseData.data && responseData.data.imagenes) {
                                await idbSaveUserImages(userId, responseData.data.imagenes);
                                console.log('SW: Imágenes guardadas cacheadas en IndexedDB para usuario:', userId);
                            }
                        }
                    } catch (error) {
                        console.error('SW: Error al cachear imágenes guardadas:', error);
                    }
                }
            }
            return response;
        })
        .catch(async () => {
            console.log('SW: Error en petición de imagen, intentando fallback offline');
            console.log('SW: URL:', url.href, 'Method:', event.request.method, 'Pathname:', url.pathname);

            // Para guardar imagen offline, encolar tarea asíncrona en IndexedDB
            if(url.pathname.includes('/save') && event.request.method === 'POST') {
                console.log('SW: 📝 Procesando guardado de imagen offline...');
                try {
                    const contentType = requestForReplay.headers.get('Content-Type') || '';
                    let bodyData = null;
                    let bodyType = 'text';
                    
                    console.log('SW: Content-Type:', contentType);
                    
                    if (contentType.includes('application/json')) {
                        bodyData = await requestForReplay.json();
                        bodyType = 'json';
                        console.log('SW: Body JSON parseado:', bodyData);
                    } else if (contentType.includes('application/x-www-form-urlencoded')) {
                        const text = await requestForReplay.text();
                        bodyData = text;
                        bodyType = 'urlencoded';
                        console.log('SW: Body URL encoded:', text);
                    } else if (contentType.includes('multipart/form-data')) {
                        const formData = await requestForReplay.formData();
                        const entries = [];
                        for (const [k, v] of formData.entries()) {
                            entries.push([k, v]);
                        }
                        bodyData = entries;
                        bodyType = 'multipart';
                        console.log('SW: Body FormData:', entries);
                    } else {
                        const text = await requestForReplay.text();
                        bodyData = text;
                        bodyType = 'text';
                        console.log('SW: Body texto:', text);
                    }

                    // Extraer userId del header x-user-id
                    const userIdHeader = requestForReplay.headers.get('x-user-id');
                    let userId = userIdHeader || 'unknown';
                    console.log('SW: UserId detectado:', userId);

                    const task = {
                        url: url.href,
                        method: 'POST',
                        headers: headersToObject(requestForReplay.headers),
                        body: bodyData,
                        bodyType,
                        userId,
                        createdAt: Date.now(),
                        retryCount: 0,
                        maxRetries: 5,
                        ttlMs: 1000 * 60 * 60 * 24 // 24h
                    };

                    console.log('SW: Tarea creada:', task);
                    await idbAddPendingImage(task);
                    console.log('SW: ✅ Tarea agregada a IndexedDB');

                    // Intentar registrar background sync
                    if (self.registration && 'sync' in self.registration) {
                        try { 
                            await self.registration.sync.register('sync-pending-images');
                            console.log('SW: ✅ Background sync registrado');
                        } catch(e) {
                            console.warn('SW: ⚠️ Error registrando background sync:', e);
                        }
                    }

                    // Asegurar sonda de conectividad activa
                    ensureConnectivityProbe();
                    console.log('SW: ✅ Sonda de conectividad iniciada');

                    // Notificar a clientes
                    notifyClients({
                        type: 'ASYNC_IMAGE_TASK_CREATED',
                        message: 'Tarea asíncrona de imagen creada. Se enviará cuando haya conexión.'
                    });

                    console.log('SW: ✅ Respuesta de éxito enviada');
                    return new Response(JSON.stringify({
                        success: true,
                        queued: true,
                        message: 'Sin conexión. Imagen encolada y se guardará automáticamente cuando haya conexión.'
                    }), {
                        status: 202,
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (e) {
                    console.error('SW: ❌ Error encolando imagen offline:', e);
                    return new Response(JSON.stringify({
                        success: false,
                        message: 'No se pudo encolar la imagen offline.'
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            // Para eliminar imagen offline
            if(event.request.method === 'DELETE' && url.pathname.includes('/images/')) {
                console.log('SW: Procesando eliminación de imagen offline');
                try {
                    // Extraer userId del header x-user-id
                    const userIdHeader = requestForReplay.headers.get('x-user-id');
                    let userId = userIdHeader || 'unknown';

                    // Extraer imageId de la URL
                    const pathParts = url.pathname.split('/');
                    const imageId = pathParts[pathParts.length - 1];

                    // Leer el cuerpo de la petición para obtener el imageId
                    let bodyData = null;
                    let bodyType = 'none';
                    
                    const contentType = requestForReplay.headers.get('Content-Type') || '';
                    if (contentType.includes('application/json')) {
                        try {
                            // Verificar si hay contenido antes de parsear
                            const text = await requestForReplay.text();
                            if (text && text.trim()) {
                                bodyData = JSON.parse(text);
                                bodyType = 'json';
                            } else {
                                bodyData = null;
                                bodyType = 'none';
                            }
                        } catch (parseError) {
                            console.warn('SW: Error parseando JSON del cuerpo DELETE:', parseError);
                            bodyData = null;
                            bodyType = 'none';
                        }
                    }

                    // Actualizar cache local inmediatamente
                    if (userId !== 'unknown' && imageId) {
                        await idbUpdateUserImage(userId, imageId, 'remove');
                        console.log('SW: Imagen eliminada del cache local:', imageId);
                    }

                    const task = {
                        url: url.href,
                        method: 'DELETE',
                        headers: headersToObject(requestForReplay.headers),
                        body: bodyData,
                        bodyType,
                        userId,
                        createdAt: Date.now(),
                        retryCount: 0,
                        maxRetries: 5,
                        ttlMs: 1000 * 60 * 60 * 24 // 24h
                    };

                    await idbAddPendingImage(task);

                    // Intentar registrar background sync
                    if (self.registration && 'sync' in self.registration) {
                        try { await self.registration.sync.register('sync-pending-images'); } catch(e) {}
                    }

                    // Asegurar sonda de conectividad activa
                    ensureConnectivityProbe();

                    // Notificar a clientes
                    notifyClients({
                        type: 'ASYNC_IMAGE_TASK_CREATED',
                        message: 'Tarea asíncrona de eliminación de imagen creada. Se procesará cuando haya conexión.'
                    });

                    return new Response(JSON.stringify({
                        success: true,
                        queued: true,
                        message: 'Sin conexión. Eliminación de imagen encolada y se procesará automáticamente.'
                    }), {
                        status: 202,
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (e) {
                    console.error('SW: Error encolando eliminación de imagen offline:', e);
                    return new Response(JSON.stringify({
                        success: false,
                        message: 'No se pudo encolar la eliminación de imagen offline.'
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            // Para obtener imágenes guardadas offline, devolver desde cache
            if(url.pathname.includes('/saved') && event.request.method === 'GET') {
                try {
                    const userId = event.request.headers.get('x-user-id');
                    if (userId) {
                        const cachedData = await idbGetUserImages(userId);
                        if (cachedData && cachedData.images) {
                            console.log('SW: Sirviendo imágenes guardadas desde cache offline para usuario:', userId);
                            return new Response(JSON.stringify({
                                success: true,
                                data: {
                                    imagenes: cachedData.images,
                                    pagination: {
                                        currentPage: 1,
                                        totalPages: 1,
                                        totalImages: cachedData.images.length,
                                        hasNext: false,
                                        hasPrev: false
                                    }
                                }
                            }), {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' }
                            });
                        }
                    }
                } catch (error) {
                    console.error('SW: Error al obtener imágenes guardadas del cache:', error);
                }
                
                // Fallback: devolver lista vacía si no hay cache
                return new Response(JSON.stringify({
                    success: true,
                    data: {
                        imagenes: [],
                        pagination: {
                            currentPage: 1,
                            totalPages: 0,
                            totalImages: 0,
                            hasNext: false,
                            hasPrev: false
                        }
                    }
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Para verificar imagen guardada offline, devolver false
            if(url.pathname.includes('/check') && event.request.method === 'GET') {
                return new Response(JSON.stringify({
                    success: true,
                    data: {
                        isSaved: false,
                        imageId: null
                    }
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Para estadísticas offline, devolver datos vacíos
            if(url.pathname.includes('/stats') && event.request.method === 'GET') {
                return new Response(JSON.stringify({
                    success: true,
                    data: {
                        totalImagenes: 0,
                        estadisticasPorCategoria: [],
                        imagenReciente: null
                    }
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Para otras peticiones de imágenes
            return new Response(JSON.stringify({
                success: false,
                message: 'Servicio de imágenes no disponible offline'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        })
    );
}

// Función para manejar peticiones API genéricas offline
function handleGenericAPIRequest(event) {
    const url = new URL(event.request.url);
    
    console.log('SW: 🔧 Manejando petición API genérica offline:', url.pathname);
    
    event.respondWith(
        fetch(event.request)
        .then(response => {
            console.log('SW: 🌐 Respuesta API genérica exitosa:', response.status);
            return response;
        })
        .catch(error => {
            console.log('SW: ❌ Error en petición API genérica:', error);
            console.log('SW: 🔄 Intentando fallback offline para API genérica');
            
            // Fallback genérico para APIs
            return new Response(JSON.stringify({
                success: false,
                message: 'Servicio no disponible offline',
                offline: true
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        })
    );
}

// Función para manejar peticiones de autenticación offline
function handleAuthRequest(event) {
    const url = new URL(event.request.url);
    
    // Solo manejar peticiones POST de login/registro
    if(event.request.method !== 'POST') {
        return;
    }

    // Clonar la request una sola vez para poder leer el cuerpo en el modo offline
    const requestForReplay = event.request.clone();

    event.respondWith(
        fetch(event.request)
        .then(response => {
            // Solo cachear peticiones GET exitosas
            if(response.ok && event.request.method === 'GET') {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                .then(cache => {
                    cache.put(event.request, responseClone);
                    console.log('SW: Respuesta de auth guardada en cache');
                });
            }
            return response;
        })
        .catch(async () => {
            console.log('SW: Error en petición de auth, intentando fallback offline');

            // Para login offline, devolver sesión simulada
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

            // Para registro offline, encolar tarea asíncrona en IndexedDB
            if(url.pathname.includes('/registro')) {
                try {
                    const contentType = requestForReplay.headers.get('Content-Type') || '';
                    let bodyData = null;
                    let bodyType = 'text';
                    if (contentType.includes('application/json')) {
                        bodyData = await requestForReplay.json();
                        bodyType = 'json';
                    } else if (contentType.includes('application/x-www-form-urlencoded')) {
                        const text = await requestForReplay.text();
                        bodyData = text; // Se enviará como cuerpo sin procesar
                        bodyType = 'urlencoded';
                    } else if (contentType.includes('multipart/form-data')) {
                        const formData = await requestForReplay.formData();
                        const entries = [];
                        for (const [k, v] of formData.entries()) {
                            entries.push([k, v]);
                        }
                        bodyData = entries; // Guardar como pares clave/valor
                        bodyType = 'multipart';
                    } else {
                        // Intento genérico
                        const text = await requestForReplay.text();
                        bodyData = text;
                        bodyType = 'text';
                    }

                    const task = {
                        url: url.href,
                        method: 'POST',
                        headers: headersToObject(requestForReplay.headers),
                        body: bodyData,
                        bodyType,
                        createdAt: Date.now(),
                        retryCount: 0,
                        maxRetries: 5,
                        ttlMs: 1000 * 60 * 60 * 24 // 24h
                    };

                    await idbAddPendingRegistration(task);

                    // Intentar registrar background sync
                    if (self.registration && 'sync' in self.registration) {
                        try { await self.registration.sync.register('sync-pending-registrations'); } catch(e) {}
                    }

                    // Asegurar sonda de conectividad activa
                    ensureConnectivityProbe();

                    // Notificar a clientes
                    notifyClients({
                        type: 'ASYNC_TASK_CREATED',
                        message: 'Tarea asíncrona de registro creada. Se enviará cuando haya conexión.'
                    });

                    return new Response(JSON.stringify({
                        success: true,
                        queued: true,
                        message: 'Sin conexión. Registro encolado y se procesará automáticamente.'
                    }), {
                        status: 202,
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (e) {
                    console.error('SW: Error encolando registro offline:', e);
                    return new Response(JSON.stringify({
                        success: false,
                        message: 'No se pudo encolar el registro offline.'
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
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
    
    if (event.tag === 'sync-pending-registrations') {
        event.waitUntil(processPendingRegistrations());
    } else if (event.tag === 'sync-pending-images') {
        event.waitUntil(processPendingImages());
    }
});

// Nota: los eventos 'online'/'offline' no se disparan en el contexto del Service Worker en la mayoría de navegadores.
// El procesamiento de la cola se hará al activar el SW y mediante Background Sync.

// Detectar cuando se pierde la conexión
self.addEventListener('offline', () => {
    console.log('📱 PWA: Sin conexión a internet - Modo offline activado');
});

// Manejar notificaciones push
self.addEventListener('push', event => {
    console.log('SW: Notificación push recibida');
    
    let data = {};
    if (event.data) {
        try {
            // Intentar parsear como JSON primero
            data = event.data.json();
        } catch (e) {
            console.log('SW: Datos no son JSON, intentando como texto');
            try {
                // Si no es JSON, intentar como texto
                const textData = event.data.text();
                console.log('SW: Datos de push como texto:', textData);
                
                // Si es un mensaje de prueba simple, crear datos por defecto
                if (textData.includes('Test push message')) {
                    data = {
                        title: 'Mensaje de Prueba',
                        body: textData,
                        url: '/',
                        icon: '/icon.svg'
                    };
                } else {
                    // Intentar parsear como JSON manualmente
                    data = JSON.parse(textData);
                }
            } catch (textError) {
                console.error('SW: Error parseando datos de push como texto:', textError);
                data = {
                    title: 'Nueva notificación',
                    body: event.data.text() || 'Tienes una nueva notificación',
                    url: '/',
                    icon: '/icon.svg'
                };
            }
        }
    } else {
        data = {
            title: 'Nueva notificación',
            body: 'Tienes una nueva notificación',
            url: '/',
            icon: '/icon.svg'
        };
    }

    const options = {
        body: data.body || 'Tienes una nueva notificación',
        icon: data.icon || '/icon.svg',
        badge: data.badge || '/icon.svg',
        data: {
            url: data.url || '/',
            timestamp: data.timestamp || Date.now()
        },
        actions: [
            {
                action: 'open',
                title: 'Abrir',
                icon: '/icon.svg'
            },
            {
                action: 'close',
                title: 'Cerrar',
                icon: '/icon.svg'
            }
        ],
        requireInteraction: false,
        silent: false,
        tag: 'pwa-notification',
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'PWA Notificación', options)
        .catch(error => {
            console.error('SW: Error mostrando notificación:', error);
            if (error.name === 'NotAllowedError') {
                console.warn('SW: Permisos de notificación no concedidos. El usuario debe habilitar las notificaciones.');
                // Notificar a los clientes sobre el problema de permisos
                notifyClients({
                    type: 'NOTIFICATION_PERMISSION_DENIED',
                    message: 'Permisos de notificación no concedidos. Por favor, habilita las notificaciones en tu navegador.'
                });
            }
        })
    );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', event => {
    console.log('SW: Click en notificación:', event.action);
    
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // Abrir o enfocar la ventana de la aplicación
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
            // Buscar si ya hay una ventana abierta
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(urlToOpen);
                    return;
                }
            }
            
            // Si no hay ventana abierta, abrir una nueva
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Manejar cierre de notificaciones
self.addEventListener('notificationclose', event => {
    console.log('SW: Notificación cerrada');
    // Aquí puedes agregar lógica adicional si es necesario
});

// Procesa la cola de imágenes pendientes almacenados en IndexedDB
async function processPendingImages() {
    try {
        const tasks = await idbGetAllPendingImages();
        if (!tasks.length) return;
        console.log(`SW: Procesando ${tasks.length} imagen(es) en cola...`);
        
        for (const task of tasks) {
            try {
                // Descartar por TTL vencido
                if (typeof task.ttlMs === 'number' && Date.now() - (task.createdAt || 0) > task.ttlMs) {
                    await idbDeletePendingImage(task.id);
                    console.warn('SW: Tarea de imagen expirada por TTL, eliminada.');
                    continue;
                }

                const endpoint = task.url || task.endpoint || '/api/images/save';
                const headers = Array.isArray(task.headers) || (task.headers && typeof task.headers.entries === 'function')
                    ? new Headers(task.headers)
                    : objectToHeaders(task.headers || { 'Content-Type': 'application/json' });
                let body;
                const contentType = headers.get ? (headers.get('Content-Type') || headers.get('content-type') || '') : '';
                
                if (task.bodyType === 'multipart') {
                    // Reconstruir FormData y dejar que el navegador establezca el boundary
                    const fd = new FormData();
                    (task.body || []).forEach(([k, v]) => fd.append(k, v));
                    body = fd;
                    if (headers.delete) headers.delete('Content-Type');
                } else if (task.bodyType === 'json') {
                    body = JSON.stringify(task.body);
                    if (headers.set) headers.set('Content-Type', 'application/json');
                } else if (task.bodyType === 'urlencoded') {
                    body = typeof task.body === 'string' ? task.body : String(task.body || '');
                    if (headers.set && !contentType.includes('application/x-www-form-urlencoded')) {
                        headers.set('Content-Type', 'application/x-www-form-urlencoded');
                    }
                } else if (task.bodyType === 'none') {
                    body = null;
                } else if (typeof task.body === 'string') {
                    body = task.body;
                } else {
                    body = JSON.stringify(task.body);
                    if (headers.set && !contentType) headers.set('Content-Type', 'application/json');
                }

                const response = await fetch(endpoint, {
                    method: task.method || 'POST',
                    headers,
                    body
                });

                if (response.ok) {
                    await idbDeletePendingImage(task.id);
                    console.log('SW: Imagen procesada y eliminada de la cola');
                    notifyClients({
                        type: 'ASYNC_IMAGE_TASK_PROCESSED',
                        message: 'Imagen pendiente procesada exitosamente al restaurar conexión.'
                    });
                } else if (response.status >= 400 && response.status < 500) {
                    // Errores del cliente no se reintentan
                    await idbDeletePendingImage(task.id);
                    console.warn('SW: Imagen descartada por error 4xx:', response.status);
                } else {
                    // 5xx u otros -> incrementar reintentos
                    const nextRetry = (task.retryCount || 0) + 1;
                    if (nextRetry > (task.maxRetries || 5)) {
                        await idbDeletePendingImage(task.id);
                        console.warn('SW: Imagen descartada por exceder reintentos');
                    } else {
                        await idbUpdatePendingImage(task.id, { retryCount: nextRetry });
                        console.warn('SW: Falló el envío de la imagen pendiente. Se reintentará más tarde.');
                    }
                }
            } catch (e) {
                console.error('SW: Error procesando imagen pendiente:', e);
            }
        }
    } catch (e) {
        console.error('SW: Error leyendo tareas de imágenes pendientes:', e);
    }
}

// Procesa la cola de registros pendientes almacenados en IndexedDB
async function processPendingRegistrations() {
    try {
        const tasks = await idbGetAllPendingRegistrations();
        if (!tasks.length) return;
        console.log(`SW: Procesando ${tasks.length} registro(s) en cola...`);
        
        for (const task of tasks) {
            try {
                // Descartar por TTL vencido
                if (typeof task.ttlMs === 'number' && Date.now() - (task.createdAt || 0) > task.ttlMs) {
                    await idbDeletePendingRegistration(task.id);
                    console.warn('SW: Tarea expirada por TTL, eliminada.');
                    continue;
                }

                const endpoint = task.url || task.endpoint || '/api/auth/registro';
                const headers = Array.isArray(task.headers) || (task.headers && typeof task.headers.entries === 'function')
                    ? new Headers(task.headers)
                    : objectToHeaders(task.headers || { 'Content-Type': 'application/json' });
                let body;
                const contentType = headers.get ? (headers.get('Content-Type') || headers.get('content-type') || '') : '';
                if (task.bodyType === 'multipart') {
                    // Reconstruir FormData y dejar que el navegador establezca el boundary
                    const fd = new FormData();
                    (task.body || []).forEach(([k, v]) => fd.append(k, v));
                    body = fd;
                    if (headers.delete) headers.delete('Content-Type');
                } else if (task.bodyType === 'json') {
                    body = JSON.stringify(task.body);
                    if (headers.set) headers.set('Content-Type', 'application/json');
                } else if (task.bodyType === 'urlencoded') {
                    body = typeof task.body === 'string' ? task.body : String(task.body || '');
                    if (headers.set && !contentType.includes('application/x-www-form-urlencoded')) {
                        headers.set('Content-Type', 'application/x-www-form-urlencoded');
                    }
                } else if (typeof task.body === 'string') {
                    body = task.body;
                } else {
                    body = JSON.stringify(task.body);
                    if (headers.set && !contentType) headers.set('Content-Type', 'application/json');
                }

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers,
                    body
                });

                if (response.ok) {
                    await idbDeletePendingRegistration(task.id);
                    console.log('SW: Registro procesado y eliminado de la cola');
                    notifyClients({
                        type: 'ASYNC_TASK_PROCESSED',
                        message: 'Registro pendiente procesado exitosamente al restaurar conexión.'
                    });
                } else if (response.status >= 400 && response.status < 500) {
                    // Errores del cliente no se reintentan
                    await idbDeletePendingRegistration(task.id);
                    console.warn('SW: Registro descartado por error 4xx:', response.status);
                } else {
                    // 5xx u otros -> incrementar reintentos
                    const nextRetry = (task.retryCount || 0) + 1;
                    if (nextRetry > (task.maxRetries || 5)) {
                        await idbDeletePendingRegistration(task.id);
                        console.warn('SW: Registro descartado por exceder reintentos');
                    } else {
                        await idbUpdatePendingRegistration(task.id, { retryCount: nextRetry });
                        console.warn('SW: Falló el envío del registro pendiente. Se reintentará más tarde.');
                    }
                }
            } catch (e) {
                console.error('SW: Error procesando registro pendiente:', e);
            }
        }
    } catch (e) {
        console.error('SW: Error leyendo tareas pendientes:', e);
    }
}

// Permitir que la app dispare el procesamiento manualmente (p. ej. en window 'online')
self.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'FLUSH_QUEUE') {
        event.waitUntil(Promise.all([
            processPendingRegistrations(),
            processPendingImages()
        ]).then(() => {
            notifyClients({ type: 'QUEUE_FLUSHED', message: 'Colas procesadas bajo demanda' });
        }));
    } else if (event.data.type === 'START_CONNECTIVITY_PROBE') {
        event.waitUntil(ensureConnectivityProbe());
    } else if (event.data.type === 'CLEAR_QUEUE') {
        event.waitUntil((async () => {
            try {
                const [regTasks, imageTasks] = await Promise.all([
                    idbGetAllPendingRegistrations(),
                    idbGetAllPendingImages()
                ]);
                
                for (const t of regTasks) await idbDeletePendingRegistration(t.id);
                for (const t of imageTasks) await idbDeletePendingImage(t.id);
                
                notifyClients({ type: 'QUEUE_CLEARED', message: 'Colas limpiadas manualmente' });
            } catch (e) {
                console.error('SW: Error limpiando colas:', e);
            }
        })());
    } else if (event.data.type === 'FLUSH_IMAGE_QUEUE') {
        event.waitUntil(processPendingImages().then(() => {
            notifyClients({ type: 'IMAGE_QUEUE_FLUSHED', message: 'Cola de imágenes procesada bajo demanda' });
        }));
    } else if (event.data.type === 'CLEAR_IMAGE_QUEUE') {
        event.waitUntil((async () => {
            try {
                const tasks = await idbGetAllPendingImages();
                for (const t of tasks) await idbDeletePendingImage(t.id);
                notifyClients({ type: 'IMAGE_QUEUE_CLEARED', message: 'Cola de imágenes limpiada manualmente' });
            } catch (e) {
                console.error('SW: Error limpiando cola de imágenes:', e);
            }
        })());
    }
});