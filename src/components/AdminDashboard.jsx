import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import pushService from '../services/pushService';

const AdminDashboard = ({ user, onLogout }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBySubscription, setFilterBySubscription] = useState('all'); // all, subscribed, not_subscribed
  const [sortBy, setSortBy] = useState('recent'); // recent, name, email
  
  // Estados para el modal de notificación
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notificationData, setNotificationData] = useState({
    titulo: '',
    mensaje: '',
    url: '/dashboard'
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  
  // Estados para notificación global
  const [showGlobalNotificationModal, setShowGlobalNotificationModal] = useState(false);
  const [globalNotificationData, setGlobalNotificationData] = useState({
    titulo: '',
    mensaje: '',
    url: '/dashboard'
  });
  const [sendingGlobalNotification, setSendingGlobalNotification] = useState(false);
  const [globalNotificationError, setGlobalNotificationError] = useState('');

  const API_BASE = 'https://pwa-back-8s5p.onrender.com/api/auth';

  // Cargar lista de usuarios
  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/usuarios`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setUsuarios(data.data.usuarios || []);
      } else {
        setError(data.message || 'Error al cargar los usuarios');
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y ordenar usuarios
  const filteredAndSortedUsuarios = () => {
    let filtered = usuarios.filter(usuario => {
      const matchesSearch = searchTerm === '' || 
        usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.correo.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSubscription = filterBySubscription === 'all' ||
        (filterBySubscription === 'subscribed' && usuario.tieneSuscripcionPush) ||
        (filterBySubscription === 'not_subscribed' && !usuario.tieneSuscripcionPush);
      
      return matchesSearch && matchesSubscription;
    });

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.nombre.localeCompare(b.nombre);
        case 'email':
          return a.correo.localeCompare(b.correo);
        case 'recent':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return filtered;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubscriptionStatus = (usuario) => {
    if (usuario.tieneSuscripcionPush) {
      return {
        text: 'Suscrito',
        class: 'status-subscribed',
        icon: '🔔'
      };
    } else {
      return {
        text: 'No suscrito',
        class: 'status-not-subscribed',
        icon: '🔕'
      };
    }
  };

  // Abrir modal de notificación
  const openNotificationModal = (usuario) => {
    setSelectedUser(usuario);
    setNotificationData({
      titulo: `Hola ${usuario.nombre}`,
      mensaje: 'Tienes una nueva notificación del administrador.',
      url: '/dashboard'
    });
    setNotificationError('');
    setShowNotificationModal(true);
  };

  // Cerrar modal de notificación
  const closeNotificationModal = () => {
    setShowNotificationModal(false);
    setSelectedUser(null);
    setNotificationData({
      titulo: '',
      mensaje: '',
      url: '/dashboard'
    });
    setNotificationError('');
    setSendingNotification(false);
  };

  // Enviar notificación push
  const sendNotification = async () => {
    if (!selectedUser || !notificationData.titulo || !notificationData.mensaje) {
      setNotificationError('Título y mensaje son obligatorios');
      return;
    }

    setSendingNotification(true);
    setNotificationError('');

    try {
      await pushService.enviarNotificacionAUsuario(
        selectedUser.id,
        notificationData.titulo,
        notificationData.mensaje,
        notificationData.url,
        '/icon.svg', // Icono predefinido
        user.id // ID del usuario administrador
      );

      // Mostrar mensaje de éxito
      alert(`Notificación enviada exitosamente a ${selectedUser.nombre}`);
      closeNotificationModal();
    } catch (error) {
      console.error('Error enviando notificación:', error);
      setNotificationError(error.message || 'Error enviando notificación');
    } finally {
      setSendingNotification(false);
    }
  };

  // Abrir modal de notificación global
  const openGlobalNotificationModal = () => {
    setGlobalNotificationData({
      titulo: 'Notificación importante',
      mensaje: 'Tenemos una actualización importante para ti.',
      url: '/dashboard'
    });
    setGlobalNotificationError('');
    setShowGlobalNotificationModal(true);
  };

  // Cerrar modal de notificación global
  const closeGlobalNotificationModal = () => {
    setShowGlobalNotificationModal(false);
    setGlobalNotificationData({
      titulo: '',
      mensaje: '',
      url: '/dashboard'
    });
    setGlobalNotificationError('');
    setSendingGlobalNotification(false);
  };

  // Enviar notificación global
  const sendGlobalNotification = async () => {
    if (!globalNotificationData.titulo || !globalNotificationData.mensaje) {
      setGlobalNotificationError('Título y mensaje son obligatorios');
      return;
    }

    setSendingGlobalNotification(true);
    setGlobalNotificationError('');

    try {
      await pushService.enviarNotificacionGlobal(
        globalNotificationData.titulo,
        globalNotificationData.mensaje,
        globalNotificationData.url,
        '/icon.svg', // Icono predefinido
        user.id // ID del usuario administrador
      );

      // Mostrar mensaje de éxito
      alert('Notificación global enviada exitosamente a todos los usuarios suscritos');
      closeGlobalNotificationModal();
    } catch (error) {
      console.error('Error enviando notificación global:', error);
      setGlobalNotificationError(error.message || 'Error enviando notificación global');
    } finally {
      setSendingGlobalNotification(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando panel de administración...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-error">
        <div className="error-icon">⚠️</div>
        <h3>Error al cargar el panel</h3>
        <p>{error}</p>
        <button onClick={loadUsuarios} className="retry-btn">
          Reintentar
        </button>
      </div>
    );
  }

  const filteredUsuarios = filteredAndSortedUsuarios();

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div className="admin-dashboard-title">
          <h1>Panel de Administración</h1>
          <p>Bienvenido, {user.name}. Gestiona los usuarios de la plataforma.</p>
        </div>
        
        <div className="admin-dashboard-stats">
          <div className="stat">
            <span className="stat-number">{usuarios.length}</span>
            <span className="stat-label">Total usuarios</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {usuarios.filter(u => u.tieneSuscripcionPush).length}
            </span>
            <span className="stat-label">Suscritos</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {usuarios.filter(u => !u.tieneSuscripcionPush).length}
            </span>
            <span className="stat-label">No suscritos</span>
          </div>
        </div>
        
        <div className="admin-dashboard-actions">
          <button 
            className="global-notification-btn"
            onClick={openGlobalNotificationModal}
            disabled={usuarios.filter(u => u.tieneSuscripcionPush).length === 0}
            title="Enviar notificación a todos los usuarios suscritos"
          >
            📢 Notificación Global
          </button>
        </div>
      </header>

      {/* Controles de filtrado y búsqueda */}
      <div className="admin-dashboard-controls">
        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">🔍</div>
          </div>
        </div>

        <div className="filters-section">
          <div className="subscription-filters">
            <label>Filtrar por suscripción:</label>
            <select 
              value={filterBySubscription} 
              onChange={(e) => setFilterBySubscription(e.target.value)}
              className="filter-select"
            >
              <option value="all">Todos</option>
              <option value="subscribed">Suscritos</option>
              <option value="not_subscribed">No suscritos</option>
            </select>
          </div>

          <div className="sort-filters">
            <label>Ordenar por:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="recent">Más recientes</option>
              <option value="name">Nombre (A-Z)</option>
              <option value="email">Email (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="results-info">
        <p>
          {filteredUsuarios.length} {filteredUsuarios.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
          {searchTerm && ` para "${searchTerm}"`}
          {filterBySubscription !== 'all' && ` (${filterBySubscription === 'subscribed' ? 'suscritos' : 'no suscritos'})`}
        </p>
      </div>

      {/* Tabla de usuarios */}
      <main className="admin-dashboard-main">
        {filteredUsuarios.length > 0 ? (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Fecha de registro</th>
                  <th>Estado de suscripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.map((usuario) => {
                  const subscriptionStatus = getSubscriptionStatus(usuario);
                  return (
                    <tr key={usuario.id}>
                      <td className="user-info">
                        <div className="user-avatar">
                          {usuario.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{usuario.nombre}</div>
                          <div className="user-role">{usuario.rol}</div>
                        </div>
                      </td>
                      <td className="user-email">{usuario.correo}</td>
                      <td className="user-date">{formatDate(usuario.createdAt)}</td>
                      <td className="user-subscription">
                        <span className={`subscription-status ${subscriptionStatus.class}`}>
                          <span className="status-icon">{subscriptionStatus.icon}</span>
                          <span className="status-text">{subscriptionStatus.text}</span>
                          {usuario.cantidadSuscripciones > 0 && (
                            <span className="subscription-count">
                              ({usuario.cantidadSuscripciones})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="user-actions">
                        <button 
                          className="action-btn message-btn"
                          title="Enviar notificación"
                          disabled={!usuario.tieneSuscripcionPush}
                          onClick={() => openNotificationModal(usuario)}
                        >
                          📧 Notificar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-users">
            <div className="no-users-icon">👥</div>
            <h3>No se encontraron usuarios</h3>
            <p>
              {usuarios.length === 0 
                ? 'Aún no hay usuarios registrados en la plataforma.'
                : 'Intenta con otros términos de búsqueda o cambia los filtros.'
              }
            </p>
            {usuarios.length > 0 && (
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setSearchTerm('');
                  setFilterBySubscription('all');
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modal de notificación */}
      {showNotificationModal && (
        <div className="notification-modal-overlay">
          <div className="notification-modal">
            <div className="notification-modal-header">
              <h3>Enviar notificación push</h3>
              <button 
                className="close-modal-btn"
                onClick={closeNotificationModal}
                disabled={sendingNotification}
              >
                ✕
              </button>
            </div>
            
            <div className="notification-modal-body">
              <div className="notification-user-info">
                <h4>Enviar a: {selectedUser?.nombre}</h4>
                <p>{selectedUser?.correo}</p>
              </div>

              <div className="notification-form">
                <div className="form-group">
                  <label htmlFor="titulo">Título:</label>
                  <input
                    type="text"
                    id="titulo"
                    value={notificationData.titulo}
                    onChange={(e) => setNotificationData({
                      ...notificationData,
                      titulo: e.target.value
                    })}
                    placeholder="Título de la notificación"
                    disabled={sendingNotification}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="mensaje">Mensaje:</label>
                  <textarea
                    id="mensaje"
                    value={notificationData.mensaje}
                    onChange={(e) => setNotificationData({
                      ...notificationData,
                      mensaje: e.target.value
                    })}
                    placeholder="Mensaje de la notificación"
                    rows="3"
                    disabled={sendingNotification}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="url">URL de destino:</label>
                  <input
                    type="text"
                    id="url"
                    value={notificationData.url}
                    onChange={(e) => setNotificationData({
                      ...notificationData,
                      url: e.target.value
                    })}
                    placeholder="/dashboard"
                    disabled={sendingNotification}
                  />
                </div>
              </div>

              {notificationError && (
                <div className="notification-error">
                  ⚠️ {notificationError}
                </div>
              )}
            </div>

            <div className="notification-modal-footer">
              <button
                className="cancel-btn"
                onClick={closeNotificationModal}
                disabled={sendingNotification}
              >
                Cancelar
              </button>
              <button
                className="send-btn"
                onClick={sendNotification}
                disabled={sendingNotification || !notificationData.titulo || !notificationData.mensaje}
              >
                {sendingNotification ? 'Enviando...' : 'Enviar notificación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de notificación global */}
      {showGlobalNotificationModal && (
        <div className="notification-modal-overlay">
          <div className="notification-modal">
            <div className="notification-modal-header">
              <h3>Enviar notificación global</h3>
              <button 
                className="close-modal-btn"
                onClick={closeGlobalNotificationModal}
                disabled={sendingGlobalNotification}
              >
                ✕
              </button>
            </div>
            
            <div className="notification-modal-body">
              <div className="notification-user-info">
                <h4>📢 Notificación para todos los usuarios suscritos</h4>
                <p>Esta notificación se enviará a {usuarios.filter(u => u.tieneSuscripcionPush).length} usuarios con suscripción activa</p>
              </div>

              <div className="notification-form">
                <div className="form-group">
                  <label htmlFor="global-titulo">Título:</label>
                  <input
                    type="text"
                    id="global-titulo"
                    value={globalNotificationData.titulo}
                    onChange={(e) => setGlobalNotificationData({
                      ...globalNotificationData,
                      titulo: e.target.value
                    })}
                    placeholder="Título de la notificación"
                    disabled={sendingGlobalNotification}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="global-mensaje">Mensaje:</label>
                  <textarea
                    id="global-mensaje"
                    value={globalNotificationData.mensaje}
                    onChange={(e) => setGlobalNotificationData({
                      ...globalNotificationData,
                      mensaje: e.target.value
                    })}
                    placeholder="Mensaje de la notificación"
                    rows="3"
                    disabled={sendingGlobalNotification}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="global-url">URL de destino:</label>
                  <input
                    type="text"
                    id="global-url"
                    value={globalNotificationData.url}
                    onChange={(e) => setGlobalNotificationData({
                      ...globalNotificationData,
                      url: e.target.value
                    })}
                    placeholder="/dashboard"
                    disabled={sendingGlobalNotification}
                  />
                </div>
              </div>

              {globalNotificationError && (
                <div className="notification-error">
                  ⚠️ {globalNotificationError}
                </div>
              )}
            </div>

            <div className="notification-modal-footer">
              <button
                className="cancel-btn"
                onClick={closeGlobalNotificationModal}
                disabled={sendingGlobalNotification}
              >
                Cancelar
              </button>
              <button
                className="send-btn"
                onClick={sendGlobalNotification}
                disabled={sendingGlobalNotification || !globalNotificationData.titulo || !globalNotificationData.mensaje}
              >
                {sendingGlobalNotification ? 'Enviando...' : 'Enviar a todos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
