import React, { useState, useEffect } from 'react';
import pushService from '../services/pushService';
import eventService from '../services/eventService';
import './PushNotificationManager.css';

const PushNotificationManager = ({ userId, isAuthenticated }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [subscriptionInfo, setSubscriptionInfo] = useState({ hasSubscription: false, subscription: null, date: null, userId: null });

  useEffect(() => {
    initializePushService();
  }, []);

  useEffect(() => {
    if (isAuthenticated && userId) {
      checkSubscriptionStatus();
      // Segundo chequeo tras un breve retraso para asegurar persistencia en BD
      const recheck = setTimeout(() => {
        checkSubscriptionStatus();
      }, 1200);
      return () => clearTimeout(recheck);
    } else {
      // Limpiar suscripción cuando el usuario se desloguea
      if (!isAuthenticated) {
        setIsSubscribed(false);
        setPermissionStatus('default');
        setSubscriptionInfo({ hasSubscription: false, subscription: null, date: null, userId: null });
      }
    }
  }, [isAuthenticated, userId]);

  // Efecto adicional para verificar el estado después de la inicialización
  useEffect(() => {
    if (isAuthenticated && userId && isSupported) {
      // Pequeño delay para asegurar que el pushService esté inicializado
      const timer = setTimeout(() => {
        checkSubscriptionStatus();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, userId, isSupported]);

  // Efecto para escuchar eventos de actualización de suscripción
  useEffect(() => {
    const handleSubscriptionUpdate = (data) => {
      console.log('🔔 Evento de actualización de suscripción recibido:', data);
      
      // Solo procesar si el evento es para el usuario actual
      if (data.userId === userId) {
        console.log('✅ Actualizando estado de suscripción para usuario:', userId);
        setIsSubscribed(data.isSubscribed);
        
        if (data.error) {
          console.log('⚠️ Error en suscripción:', data.error);
        }
        
        // Forzar verificación del estado después de un breve delay
        setTimeout(() => {
          checkSubscriptionStatus();
        }, 1000);
      }
    };

    // Suscribirse al evento
    eventService.on('subscriptionUpdated', handleSubscriptionUpdate);

    // Limpiar suscripción al desmontar
    return () => {
      eventService.off('subscriptionUpdated', handleSubscriptionUpdate);
    };
  }, [userId]);

  const initializePushService = async () => {
    try {
      const initialized = await pushService.init();
      setIsSupported(initialized);
      
      if (initialized) {
        // Verificar estado de permisos
        const permission = pushService.obtenerEstadoPermisos();
        setPermissionStatus(permission);
        
        await checkSubscriptionStatus();
        if (isAuthenticated && userId) {
          const info = await pushService.obtenerInfoSuscripcion(userId);
          setSubscriptionInfo(info);
        }
      }
    } catch (error) {
      console.error('Error inicializando push service:', error);
      showMessage('Error inicializando notificaciones push', 'error');
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const status = await pushService.verificarEstadoSuscripcion(userId);
      const nextIsSubscribed = !!status?.isSubscribed;
      setIsSubscribed(nextIsSubscribed);
      if (isAuthenticated && userId) {
        const info = await pushService.obtenerInfoSuscripcion(userId);
        setSubscriptionInfo(info);
      }
      console.log('Estado de suscripción (BD + navegador):', {
        finalStatus: nextIsSubscribed
      });
    } catch (error) {
      console.error('Error verificando estado de suscripción:', error);
    }
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated || !userId) {
      showMessage('Debes estar autenticado para suscribirte a notificaciones', 'error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Verificar si ya está suscrito (contra BD)
      const currentStatus = await pushService.verificarEstadoSuscripcion(userId);
      if (currentStatus?.isSubscribed) {
        showMessage('Ya estás suscrito a las notificaciones push', 'info');
        setIsSubscribed(true);
        setIsLoading(false);
        return;
      }

      // Verificar permisos primero
      const permission = await pushService.verificarPermisos();
      setPermissionStatus(permission);
      
      if (permission === 'denied') {
        showMessage('Permisos de notificación denegados. Por favor, habilita las notificaciones en la configuración de tu navegador.', 'error');
        setIsLoading(false);
        return;
      }
      
      if (permission !== 'granted') {
        showMessage('Permisos de notificación requeridos. Por favor, acepta las notificaciones cuando se te solicite.', 'error');
        setIsLoading(false);
        return;
      }

      await pushService.suscribirse(userId);
      setIsSubscribed(true);
      showMessage('¡Te has suscrito exitosamente a las notificaciones push!', 'success');
      
      // Emitir evento para notificar a otros componentes
      eventService.emit('subscriptionUpdated', { userId, isSubscribed: true });
      // Re-verificar y refrescar info desde la BD tras un pequeño retraso
      setTimeout(async () => {
        await checkSubscriptionStatus();
      }, 800);
    } catch (error) {
      console.error('Error suscribiéndose:', error);
      
      if (error.message.includes('denegados')) {
        showMessage('Permisos de notificación denegados. Por favor, habilita las notificaciones en tu navegador.', 'error');
      } else if (error.message.includes('Ya existe una suscripción')) {
        showMessage('Ya tienes una suscripción activa. Actualizando información...', 'info');
        // Forzar verificación del estado
        setTimeout(() => {
          checkSubscriptionStatus();
        }, 1000);
      } else {
        showMessage('Error suscribiéndose a las notificaciones: ' + error.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      if (isAuthenticated && userId) {
        await pushService.desuscribirse(userId);
      }
      
      setIsSubscribed(false);
      showMessage('Te has desuscrito de las notificaciones push', 'success');
      
      // Emitir evento para notificar a otros componentes
      eventService.emit('subscriptionUpdated', { userId, isSubscribed: false });
      setSubscriptionInfo({ hasSubscription: false, subscription: null, date: null, userId });
    } catch (error) {
      console.error('Error desuscribiéndose:', error);
      showMessage('Error desuscribiéndose: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    
    // Limpiar mensaje después de 5 segundos
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const getSubscriptionInfo = () => subscriptionInfo;

  if (!isSupported) {
    return (
      <div className="push-notification-manager">
        <div className="push-notification-card unsupported">
          <h3>🔔 Notificaciones Push</h3>
          <p>Las notificaciones push no son compatibles con tu navegador actual.</p>
        </div>
      </div>
    );
  }

  const subscriptionInfoData = getSubscriptionInfo();

  return (
    <div className="push-notification-manager">
      <div className="push-notification-card">
        <h3>🔔 Notificaciones Push</h3>
        
        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}

        <div className="subscription-status">
          <p>
            Estado: <span className={isSubscribed ? 'subscribed' : 'not-subscribed'}>
              {isSubscribed ? 'Suscrito' : 'No suscrito'}
            </span>
          </p>
          
          <p>
            Permisos: <span className={`permission-${permissionStatus}`}>
              {permissionStatus === 'granted' ? 'Concedidos' : 
               permissionStatus === 'denied' ? 'Denegados' : 
               permissionStatus === 'default' ? 'No solicitados' : 'No soportados'}
            </span>
          </p>
          
          {subscriptionInfoData.date && (
            <p className="subscription-date">
              Suscrito desde: {subscriptionInfoData.date.toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="subscription-actions">
          {!isSubscribed ? (
            <button 
              onClick={handleSubscribe}
              disabled={isLoading || !isAuthenticated}
              className="subscribe-btn"
            >
              {isLoading ? 'Suscribiendo...' : 'Suscribirse a Notificaciones'}
            </button>
          ) : (
            <button 
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="unsubscribe-btn"
            >
              {isLoading ? 'Desuscribiendo...' : 'Desuscribirse'}
            </button>
          )}
        </div>

        {!isAuthenticated && (
          <p className="auth-required">
            ⚠️ Debes iniciar sesión para suscribirte a las notificaciones
          </p>
        )}

        <div className="push-info">
          <h4>¿Qué son las notificaciones push?</h4>
          <ul>
            <li>Recibe notificaciones incluso cuando la app está cerrada</li>
            <li>Mantente informado sobre nuevas imágenes guardadas</li>
            <li>Notificaciones sobre actualizaciones importantes</li>
            <li>Puedes desactivarlas en cualquier momento</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationManager;
