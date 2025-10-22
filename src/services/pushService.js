// Servicio para manejar notificaciones push
class PushService {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.registration = null;
    this.subscription = null;
    this.publicKey = null;
  }

  // Inicializar el servicio
  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications no soportadas en este navegador');
      return false;
    }

    try {
      // Verificar que el service worker esté registrado
      if (!navigator.serviceWorker.controller) {
        console.warn('Service worker no está registrado');
        return false;
      }

      // Obtener el service worker
      this.registration = await navigator.serviceWorker.ready;
      
      if (!this.registration) {
        console.warn('No se pudo obtener el service worker registration');
        return false;
      }
      
      // Obtener la clave pública VAPID
      await this.obtenerClavePublica();
      
      console.log('PushService inicializado correctamente');
      return true;
    } catch (error) {
      console.error('Error inicializando PushService:', error);
      return false;
    }
  }

  // Obtener clave pública VAPID del servidor
  async obtenerClavePublica() {
    try {
      // Verificar conectividad antes de hacer la petición
      if (!navigator.onLine) {
        console.warn('Sin conexión, usando clave VAPID del backend');
        this.publicKey = 'BNHuA8ZVmrUyFMzsJO7EKPd80kErGxAh_NpZJ6xBD-DuPLQ5Ya9Jp5G9jIgyl5eETPMk5WWNatb6MXgFIyQdbbI';
        return this.publicKey;
      }

      // En desarrollo local, usar directamente la clave del backend
      const isLocalDev = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.hostname.startsWith('192.168.') ||
                        window.location.hostname.startsWith('10.') ||
                        window.location.hostname.startsWith('172.');
      
      if (isLocalDev) {
        console.log('🔧 Modo desarrollo local detectado, usando clave VAPID del backend');
        this.publicKey = 'BNHuA8ZVmrUyFMzsJO7EKPd80kErGxAh_NpZJ6xBD-DuPLQ5Ya9Jp5G9jIgyl5eETPMk5WWNatb6MXgFIyQdbbI';
        return this.publicKey;
      }

      const response = await fetch('/api/push/vapid-keys', {
        timeout: 5000 // Timeout de 5 segundos
      });
      
      // Verificar si la respuesta es HTML (error 404 o similar)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.warn('Endpoint VAPID no disponible, usando clave del backend');
        // Usar la clave VAPID del backend
        this.publicKey = 'BNHuA8ZVmrUyFMzsJO7EKPd80kErGxAh_NpZJ6xBD-DuPLQ5Ya9Jp5G9jIgyl5eETPMk5WWNatb6MXgFIyQdbbI';
        return this.publicKey;
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.publicKey = data.data.publicKey;
        return this.publicKey;
      } else {
        throw new Error('Error obteniendo clave pública');
      }
    } catch (error) {
      console.warn('Error obteniendo clave pública VAPID, usando clave del backend:', error.message);
      // Usar la clave VAPID del backend
      this.publicKey = 'BNHuA8ZVmrUyFMzsJO7EKPd80kErGxAh_NpZJ6xBD-DuPLQ5Ya9Jp5G9jIgyl5eETPMk5WWNatb6MXgFIyQdbbI';
      return this.publicKey;
    }
  }

  // Verificar si las notificaciones están permitidas
  async verificarPermisos() {
    if (!this.isSupported) return 'denied';

    // Verificar el estado actual de los permisos
    if (Notification.permission === 'granted') {
      return 'granted';
    } else if (Notification.permission === 'denied') {
      return 'denied';
    } else {
      // Solicitar permisos
      const permission = await Notification.requestPermission();
      return permission;
    }
  }

  // Obtener el estado actual de los permisos sin solicitarlos
  obtenerEstadoPermisos() {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission;
  }

  // Suscribirse a notificaciones push
  async suscribirse(userId) {
    if (!this.isSupported) {
      throw new Error('Push notifications no soportadas');
    }

    try {
      // Verificar permisos
      const permission = await this.verificarPermisos();
      if (permission !== 'granted') {
        throw new Error('Permisos de notificación denegados');
      }

      // Verificar si ya existe una suscripción en el navegador
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (this.subscription) {
        // Verificar si la suscripción existente está registrada en la BD para este usuario
        const existeEnBD = await this.verificarSuscripcionEnBD(this.subscription.endpoint, userId);
        
        if (existeEnBD) {
          console.log('🔔 Ya existe una suscripción push para este usuario');
          console.log('📋 Suscripción existente:', {
            userId: userId,
            endpoint: this.subscription.endpoint,
            subscriptionId: this.subscription.endpoint.split('/').pop(),
            timestamp: new Date().toISOString()
          });
          return this.subscription;
        } else {
          console.log('🔄 Existe una suscripción push pero no está registrada para este usuario, creando nueva...');
          // Desuscribirse de la suscripción anterior
          await this.subscription.unsubscribe();
          this.subscription = null;
        }
      }

      // Crear nueva suscripción
      if (!this.publicKey) {
        await this.obtenerClavePublica();
      }

      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.publicKey)
      });

      // Enviar suscripción al servidor
      await this.enviarSuscripcionAlServidor(this.subscription, userId);

      // Log detallado de la suscripción creada
      console.log('🔔 Suscripción push creada exitosamente');
      console.log('📋 Detalles de la suscripción:', {
        userId: userId,
        endpoint: this.subscription.endpoint,
        subscriptionId: this.subscription.endpoint.split('/').pop(), // ID extraído del endpoint
        // Algunos navegadores no exponen subscription.keys; usar getKey de forma segura
        keys: (() => {
          try {
            const supportsGetKey = typeof this.subscription.getKey === 'function';
            const p256 = supportsGetKey ? this.subscription.getKey('p256dh') : null;
            const auth = supportsGetKey ? this.subscription.getKey('auth') : null;
            return {
              p256dh: p256 ? 'Presente' : 'Ausente',
              auth: auth ? 'Presente' : 'Ausente'
            };
          } catch (_) {
            return { p256dh: 'Desconocido', auth: 'Desconocido' };
          }
        })(),
        timestamp: new Date().toISOString()
      });
      
      return this.subscription;

    } catch (error) {
      console.error('Error suscribiéndose a push notifications:', error);
      throw error;
    }
  }

  // Desuscribirse de notificaciones push
  async desuscribirse(userId) {
    if (!this.isSupported) {
      throw new Error('Push notifications no soportadas');
    }

    try {
      // Obtener suscripción actual
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (!this.subscription) {
        console.log('No hay suscripción activa');
        return true;
      }

      // Desuscribirse del navegador
      const result = await this.subscription.unsubscribe();
      
      if (result) {
        // Notificar al servidor
        await this.notificarDesuscripcionAlServidor(this.subscription, userId);
        
        this.subscription = null;
        console.log('Desuscripción exitosa');
      }

      return result;

    } catch (error) {
      console.error('Error desuscribiéndose de push notifications:', error);
      throw error;
    }
  }

  // Enviar suscripción al servidor
  async enviarSuscripcionAlServidor(subscription, userId) {
    try {
      const response = await fetch('/api/push/suscribir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          subscription: subscription,
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Error enviando suscripción al servidor');
      }

      console.log('Suscripción enviada al servidor exitosamente');
      return data;

    } catch (error) {
      console.error('Error enviando suscripción al servidor:', error);
      throw error;
    }
  }

  // Notificar desuscripción al servidor
  async notificarDesuscripcionAlServidor(subscription, userId) {
    try {
      const response = await fetch('/api/push/desuscribir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      if (!response.ok) {
        console.warn(`Error notificando desuscripción al servidor: HTTP ${response.status}`);
        return;
      }

      const data = await response.json();
      
      if (!data.success) {
        console.warn('Error notificando desuscripción al servidor:', data.message);
      }

      return data;

    } catch (error) {
      console.error('Error notificando desuscripción al servidor:', error);
      // No lanzar error aquí, ya que la desuscripción local fue exitosa
    }
  }

  // Verificar si una suscripción existe en la base de datos para un usuario
  async verificarSuscripcionEnBD(endpoint, userId) {
    try {
      const response = await fetch(`/api/push/verificar-suscripcion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ endpoint })
      });

      if (!response.ok) {
        console.warn('Error verificando suscripción en BD:', response.status);
        return false;
      }

      const data = await response.json();
      return data.success && data.data.exists;
    } catch (error) {
      console.error('Error verificando suscripción en BD:', error);
      return false;
    }
  }

  // Convertir clave base64 a Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Verificar estado de la suscripción
  async verificarEstadoSuscripcion(userId = null) {
    if (!this.isSupported || !this.registration) return null;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      
      if (!subscription) {
        return {
          isSubscribed: false,
          subscription: null
        };
      }

      // Si se especifica un userId, verificar que la suscripción esté registrada en la BD
      if (userId) {
        const existeEnBD = await this.verificarSuscripcionEnBD(subscription.endpoint, userId);
        
        return {
          isSubscribed: existeEnBD,
          subscription: existeEnBD ? subscription : null
        };
      }

      return {
        isSubscribed: !!subscription,
        subscription: subscription
      };
    } catch (error) {
      console.error('Error verificando estado de suscripción:', error);
      return null;
    }
  }

  // Obtener información de la suscripción
  async obtenerInfoSuscripcion(userId = null) {
    if (!userId) {
      return {
        hasSubscription: false,
        subscription: null,
        date: null,
        userId: null
      };
    }

    try {
      const subscription = await this.registration?.pushManager.getSubscription();
      
      if (!subscription) {
        return {
          hasSubscription: false,
          subscription: null,
          date: null,
          userId: userId
        };
      }

      // Verificar si está registrada en la BD
      const existeEnBD = await this.verificarSuscripcionEnBD(subscription.endpoint, userId);
      
      return {
        hasSubscription: existeEnBD,
        subscription: existeEnBD ? subscription : null,
        date: existeEnBD ? new Date() : null, // Fecha actual como aproximación
        userId: userId
      };
    } catch (error) {
      console.error('Error obteniendo información de suscripción:', error);
      return {
        hasSubscription: false,
        subscription: null,
        date: null,
        userId: userId
      };
    }
  }

  // Comprobar si hay una suscripción válida almacenada (navegador + BD)
  async tieneSuscripcionGuardada(userId = null) {
    try {
      const status = await this.verificarEstadoSuscripcion(userId);
      return !!status?.isSubscribed;
    } catch (_) {
      return false;
    }
  }
}

// Crear instancia singleton
const pushService = new PushService();

export default pushService;

