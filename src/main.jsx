import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Registrar Service Worker de forma más robusta para dispositivos móviles
if ('serviceWorker' in navigator) {
  // Registrar inmediatamente y también en load para máxima compatibilidad
  const registerSW = () => {
    // Detectar si estamos en IP local
    const isLocalIP = window.location.hostname.startsWith('192.168.') ||
                     window.location.hostname.startsWith('10.') ||
                     window.location.hostname.startsWith('172.');
    
    console.log('🔧 Registrando SW - Hostname:', window.location.hostname);
    console.log('🔧 Es IP local:', isLocalIP);
    
    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none' // Asegurar que siempre se verifique actualizaciones
    })
    .then((registration) => {
      console.log('✅ SW registrado exitosamente:', registration.scope);
      
      // Verificar si hay una actualización disponible
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nueva versión del SW disponible');
              // Opcional: mostrar notificación al usuario
              if (confirm('Hay una nueva versión disponible. ¿Deseas recargar la página?')) {
                window.location.reload();
              }
            }
          });
        }
      });
      
      // Manejar mensajes del service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type) {
          console.log('📱 Mensaje del SW:', event.data);
          
          // Manejar diferentes tipos de mensajes
          switch (event.data.type) {
            case 'CONNECTIVITY_OK':
              console.log('🌐 Conexión restaurada');
              break;
            case 'ASYNC_TASK_CREATED':
              console.log('📝 Tarea offline creada');
              break;
            case 'ASYNC_TASK_PROCESSED':
              console.log('✅ Tarea offline procesada');
              break;
            default:
              console.log('📨 Mensaje del SW:', event.data.message);
          }
        }
      });
    })
    .catch((error) => {
      console.error('❌ Error al registrar SW:', error);
    });
  };

  // Registrar inmediatamente
  registerSW();
  
  // También registrar en load para máxima compatibilidad
  window.addEventListener('load', registerSW);
  
  // Manejar eventos de conectividad
  window.addEventListener('online', () => {
    console.log('🌐 Conexión restaurada - Notificando al SW');
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'FLUSH_QUEUE'
      });
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('📱 Sin conexión - PWA funcionando en modo offline');
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
