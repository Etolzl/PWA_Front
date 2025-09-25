import { useState, useEffect, useMemo, memo } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'

// Datos mock de imágenes para la galería
const mockImages = [
  {
    id: 1,
    url: 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop',
    title: 'Paisaje Natural',
    description: 'Hermoso paisaje montañoso al amanecer',
    category: 'Naturaleza',
    tags: ['montaña', 'amanecer', 'paisaje', 'naturaleza']
  },
  {
    id: 2,
    url: 'https://images.pexels.com/photos/34014766/pexels-photo-34014766.jpeg',
    title: 'Arquitectura Moderna',
    description: 'Edificio contemporáneo con líneas limpias',
    category: 'Arquitectura',
    tags: ['edificio', 'moderno', 'arquitectura', 'diseño']
  },
  {
    id: 3,
    url: 'https://images.pexels.com/photos/2832382/pexels-photo-2832382.jpeg',
    title: 'Arte Abstracto',
    description: 'Composición colorida y dinámica',
    category: 'Arte',
    tags: ['arte', 'abstracto', 'color', 'creativo']
  },
  {
    id: 4,
    url: 'https://images.pexels.com/photos/34013778/pexels-photo-34013778.jpeg',
    title: 'Naturaleza Urbana',
    description: 'Parque en el corazón de la ciudad',
    category: 'Naturaleza',
    tags: ['parque', 'ciudad', 'urbano', 'verde']
  },
  {
    id: 5,
    url: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop',
    title: 'Gastronomía',
    description: 'Plato gourmet exquisitamente presentado',
    category: 'Gastronomía',
    tags: ['comida', 'gourmet', 'cocina', 'delicioso']
  },
  {
    id: 6,
    url: 'https://images.pexels.com/photos/2265876/pexels-photo-2265876.jpeg',
    title: 'Viajes',
    description: 'Destino exótico con cultura única',
    category: 'Viajes',
    tags: ['viaje', 'exótico', 'cultura', 'aventura']
  },
  {
    id: 7,
    url: 'https://images.pexels.com/photos/18069857/pexels-photo-18069857.png?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop',
    title: 'Tecnología',
    description: 'Innovación y diseño futurista',
    category: 'Tecnología',
    tags: ['tecnología', 'innovación', 'futuro', 'digital']
  },
  {
    id: 8,
    url: 'https://images.pexels.com/photos/34002171/pexels-photo-34002171.jpeg',
    title: 'Moda',
    description: 'Estilo elegante y contemporáneo',
    category: 'Moda',
    tags: ['moda', 'estilo', 'elegante', 'tendencia']
  },
  {
    id: 9,
    url: 'https://images.pexels.com/photos/33965059/pexels-photo-33965059.jpeg?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop',
    title: 'Deportes',
    description: 'Acción y adrenalina en movimiento',
    category: 'Deportes',
    tags: ['deporte', 'acción', 'movimiento', 'energía']
  },
  {
    id: 10,
    url: 'https://images.pexels.com/photos/34013753/pexels-photo-34013753.jpeg',
    title: 'Música',
    description: 'Instrumentos y melodías que inspiran',
    category: 'Música',
    tags: ['música', 'instrumento', 'melodía', 'arte']
  },
  {
    id: 11,
    url: 'https://images.pexels.com/photos/4348401/pexels-photo-4348401.jpeg?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop',
    title: 'Arte Digital',
    description: 'Creatividad en el mundo virtual',
    category: 'Arte',
    tags: ['digital', 'arte', 'virtual', 'creativo']
  },
  {
    id: 12,
    url: 'https://images.pexels.com/photos/34011709/pexels-photo-34011709.jpeg',
    title: 'Fotografía',
    description: 'Momento capturado para la eternidad',
    category: 'Fotografía',
    tags: ['fotografía', 'momento', 'arte', 'captura']
  }
];

// Categorías disponibles
const categories = ['Todas', 'Naturaleza', 'Arquitectura', 'Arte', 'Gastronomía', 'Viajes', 'Tecnología', 'Moda', 'Deportes', 'Música', 'Fotografía'];

const AuthModal = memo(function AuthModal({
  isLoginMode,
  authLoading,
  authError,
  authSuccess,
  formData,
  handleInputChange,
  handleSubmit,
  closeAuthModal,
  onToggleMode
}) {
  return (
    <div className="modal-overlay" onClick={closeAuthModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
          <button 
            className="close-btn"
            onClick={closeAuthModal}
            disabled={authLoading}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLoginMode && (
            <div className="form-group">
              <label htmlFor="name">Nombre completo</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Tu nombre completo"
                disabled={authLoading}
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="tu@email.com"
              disabled={authLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Mínimo 6 caracteres"
              disabled={authLoading}
            />
          </div>
          
          {!isLoginMode && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Repite tu contraseña"
                disabled={authLoading}
              />
            </div>
          )}

          {authError && (
            <div className="form-error" style={{ color: '#c0392b', marginTop: '8px' }}>
              {authError}
            </div>
          )}
          {authSuccess && (
            <div className="form-success" style={{ color: '#27ae60', marginTop: '8px' }}>
              {authSuccess}
            </div>
          )}
          
          <button type="submit" className="submit-btn" disabled={authLoading}>
            {authLoading ? (
              <div className="loading-spinner-small"></div>
            ) : (
              isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta'
            )}
          </button>
        </form>
        
        <div className="modal-footer">
          <p>
            {isLoginMode ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button 
              className="switch-mode-btn"
              onClick={onToggleMode}
              disabled={authLoading}
            >
              {isLoginMode ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
});

function App() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const API_BASE = 'http://localhost:4001/api/auth';
  
  // Estados para autenticación
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [savedImages, setSavedImages] = useState(new Set());
  const [savingImage, setSavingImage] = useState(false);
  const [currentView, setCurrentView] = useState('gallery'); // 'gallery' o 'dashboard'
  
  // Estados para formularios
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setImages(mockImages);
      setLoading(false);
    }, 1000);

    // Restaurar sesión desde localStorage si existe
    const restoreSession = () => {
      const savedSession = localStorage.getItem('pwa_user_session');
      const isLoggedInSaved = localStorage.getItem('pwa_is_logged_in');
      
      if (savedSession && isLoggedInSaved === 'true') {
        try {
          const userData = JSON.parse(savedSession);
          // Verificar si la sesión no es muy antigua (opcional: 7 días)
          const loginTime = new Date(userData.loginTime);
          const now = new Date();
          const daysDiff = (now - loginTime) / (1000 * 60 * 60 * 24);
          
          if (daysDiff < 7) { // Sesión válida por 7 días
            setUser(userData);
            setIsLoggedIn(true);
            console.log('🔄 PWA: Sesión restaurada desde cache offline');
          } else {
            // Sesión expirada, limpiar
            localStorage.removeItem('pwa_user_session');
            localStorage.removeItem('pwa_is_logged_in');
            console.log('⚠️ PWA: Sesión expirada, limpiando cache');
          }
        } catch (error) {
          console.error('Error al restaurar sesión:', error);
          localStorage.removeItem('pwa_user_session');
          localStorage.removeItem('pwa_is_logged_in');
        }
      }
    };

    restoreSession();

    // Escuchar mensajes del service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CONNECTION_RESTORED') {
          console.log('🔄 PWA: Conexión restaurada desde service worker');
          // Aquí podrías mostrar una notificación al usuario
          // o sincronizar datos pendientes
        }
      });
    }
  }, []);

  // Cargar imágenes guardadas cuando el usuario inicie sesión
  useEffect(() => {
    if (isLoggedIn && user) {
      loadSavedImages();
    } else {
      setSavedImages(new Set());
    }
  }, [isLoggedIn, user]);

  // Funciones de autenticación

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      if (isLoginMode) {
        // Login
        const resp = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            correo: formData.email,
            contraseña: formData.password
          })
        });

        const data = await resp.json();
        if (!resp.ok || !data.success) {
          throw new Error(data?.message || 'No se pudo iniciar sesión');
        }

        const userData = {
          id: data.data.id,
          name: data.data.nombre,
          email: data.data.correo,
          loginTime: new Date().toISOString()
        };
        
        // Guardar sesión en localStorage para persistencia offline
        localStorage.setItem('pwa_user_session', JSON.stringify(userData));
        localStorage.setItem('pwa_is_logged_in', 'true');
        
        setUser(userData);
        setIsLoggedIn(true);
        setShowAuthModal(false);
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      } else {
        // Registro
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }

        const resp = await fetch(`${API_BASE}/registro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formData.name,
            correo: formData.email,
            contraseña: formData.password
          })
        });

        const data = await resp.json();
        if (!resp.ok || !data.success) {
          // Si vienen errores de validación desde el backend
          const validation = Array.isArray(data?.errors) ? `: ${data.errors.join(', ')}` : '';
          throw new Error((data?.message || 'No se pudo registrar') + validation);
        }

        setAuthSuccess('Cuenta creada correctamente. Ya puedes iniciar sesión.');
        setIsLoginMode(true);
        setFormData({ name: '', email: formData.email, password: '', confirmPassword: '' });
      }
    } catch (err) {
      setAuthError(err.message || 'Ocurrió un error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    // Limpiar sesión del localStorage
    localStorage.removeItem('pwa_user_session');
    localStorage.removeItem('pwa_is_logged_in');
    
    setIsLoggedIn(false);
    setUser(null);
  };

  const openAuthModal = (mode = 'login') => {
    setIsLoginMode(mode === 'login');
    setShowAuthModal(true);
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setAuthError('');
    setAuthSuccess('');
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
  };

  // Funciones para manejar imágenes guardadas
  const saveImageToProfile = async (image) => {
    if (!isLoggedIn || !user) {
      alert('Debes iniciar sesión para guardar imágenes');
      return;
    }

    setSavingImage(true);
    try {
      const response = await fetch(`${API_BASE.replace('/auth', '')}/images/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          url: image.url,
          title: image.title,
          description: image.description,
          category: image.category,
          tags: image.tags
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSavedImages(prev => new Set([...prev, image.url]));
        alert('Imagen guardada exitosamente en tu perfil');
      } else {
        alert(data.message || 'Error al guardar la imagen');
      }
    } catch (error) {
      console.error('Error al guardar imagen:', error);
      alert('Error al guardar la imagen. Inténtalo de nuevo.');
    } finally {
      setSavingImage(false);
    }
  };

  const checkIfImageIsSaved = async (imageUrl) => {
    if (!isLoggedIn || !user) return;

    try {
      const response = await fetch(`${API_BASE.replace('/auth', '')}/images/check?url=${encodeURIComponent(imageUrl)}`, {
        headers: {
          'x-user-id': user.id
        }
      });

      const data = await response.json();
      if (data.success && data.data.isSaved) {
        setSavedImages(prev => new Set([...prev, imageUrl]));
      }
    } catch (error) {
      console.error('Error al verificar imagen guardada:', error);
    }
  };

  const loadSavedImages = async () => {
    if (!isLoggedIn || !user) return;

    try {
      const response = await fetch(`${API_BASE.replace('/auth', '')}/images/saved`, {
        headers: {
          'x-user-id': user.id
        }
      });

      const data = await response.json();
      if (data.success) {
        const savedUrls = data.data.imagenes.map(img => img.url);
        setSavedImages(new Set(savedUrls));
      }
    } catch (error) {
      console.error('Error al cargar imágenes guardadas:', error);
    }
  };

  // Filtrar imágenes basado en búsqueda y categoría
  const filteredImages = useMemo(() => {
    return images.filter(image => {
      const matchesSearch = searchTerm === '' || 
        image.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'Todas' || image.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [images, searchTerm, selectedCategory]);

  // Función para descargar imagen
  const downloadImage = async (imageUrl, imageTitle) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${imageTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar la imagen:', error);
      alert('Error al descargar la imagen. Inténtalo de nuevo.');
    }
  };

  const ImageCard = ({ image }) => {
    const isImageSaved = savedImages.has(image.url);
    
    return (
      <div className="image-card">
        <div className="image-container">
          <img 
            src={image.url} 
            alt={image.title}
            loading="lazy"
          />
          <div className="image-overlay">
            <h3>{image.title}</h3>
            <p>{image.description}</p>
            <div className="image-actions">
              <button 
                className="save-image-btn"
                onClick={() => saveImageToProfile(image)}
                disabled={savingImage || isImageSaved}
                title={isImageSaved ? "Imagen ya guardada" : "Guardar en perfil"}
                style={{
                  backgroundColor: isImageSaved ? '#27ae60' : '#e74c3c',
                  cursor: isImageSaved ? 'default' : 'pointer'
                }}
              >
                {savingImage ? 'Guardando...' : (isImageSaved ? '✓ Guardada' : 'Guardar')}
              </button>
              <button 
                className="download-image-btn"
                onClick={() => downloadImage(image.url, image.title)}
                title="Descargar imagen"
              >
                Descargar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente del modal de autenticación (movido fuera para mantener identidad estable)

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando galería...</p>
      </div>
    );
  }

  // Si el usuario está logueado y quiere ver el dashboard, mostrar el Dashboard
  if (isLoggedIn && currentView === 'dashboard') {
    return (
      <div className="app">
        <header className="header">
          <div className="header-top">
            <div className="header-title">
              <h1>Galería Pinterest</h1>
              <p>Descubre imágenes increíbles</p>
            </div>
            
            <div className="header-actions">
              <div className="user-menu">
                <div className="navigation-tabs">
                  <button 
                    className={`nav-tab ${currentView === 'gallery' ? 'active' : ''}`}
                    onClick={() => setCurrentView('gallery')}
                  >
                    🖼️ Galería
                  </button>
                  <button 
                    className={`nav-tab ${currentView === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setCurrentView('dashboard')}
                  >
                    📁 Mi Colección
                  </button>
                </div>
                <div className="user-info">
                  <span className="user-greeting">¡Hola, {user.name}!</span>
                  <button className="logout-btn" onClick={handleLogout}>
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <Dashboard user={user} onLogout={handleLogout} />
        
        {/* Modal de autenticación */}
        {showAuthModal && (
          <AuthModal
            isLoginMode={isLoginMode}
            authLoading={authLoading}
            authError={authError}
            authSuccess={authSuccess}
            formData={formData}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            closeAuthModal={closeAuthModal}
            onToggleMode={() => setIsLoginMode(!isLoginMode)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="header-title">
            <h1>Galería Pinterest</h1>
            <p>Descubre imágenes increíbles</p>
          </div>
          
          <div className="header-actions">
            {isLoggedIn ? (
              <div className="user-menu">
                <div className="navigation-tabs">
                  <button 
                    className={`nav-tab ${currentView === 'gallery' ? 'active' : ''}`}
                    onClick={() => setCurrentView('gallery')}
                  >
                    Galería
                  </button>
                  <button 
                    className={`nav-tab ${currentView === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setCurrentView('dashboard')}
                  >
                    Mi Colección
                  </button>
                </div>
                <div className="user-info">
                  <span className="user-greeting">¡Hola, {user.name}!</span>
                  <button className="logout-btn" onClick={handleLogout}>
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <button 
                  className="login-btn"
                  onClick={() => openAuthModal('login')}
                >
                  Iniciar Sesión
                </button>
                <button 
                  className="register-btn"
                  onClick={() => openAuthModal('register')}
                >
                  Registrarse
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Barra de búsqueda */}
        <div className="search-container">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar imágenes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">🔍</div>
          </div>
        </div>

        {/* Filtros por categoría */}
        <div className="category-filters">
          <div className="category-scroll">
            {categories.map((category) => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="results-info">
          <p>
            {filteredImages.length} {filteredImages.length === 1 ? 'imagen encontrada' : 'imágenes encontradas'}
            {searchTerm && ` para "${searchTerm}"`}
            {selectedCategory !== 'Todas' && ` en ${selectedCategory}`}
          </p>
        </div>
      </header>
      
      <main className="gallery-container">
        {filteredImages.length > 0 ? (
          <div className="gallery">
            {filteredImages.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
          </div>
        ) : (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No se encontraron imágenes</h3>
            <p>Intenta con otros términos de búsqueda o selecciona una categoría diferente</p>
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('Todas');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </main>
      
      {/* Modal de autenticación */}
      {showAuthModal && (
        <AuthModal
          isLoginMode={isLoginMode}
          authLoading={authLoading}
          authError={authError}
          authSuccess={authSuccess}
          formData={formData}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          closeAuthModal={closeAuthModal}
          onToggleMode={() => setIsLoginMode(!isLoginMode)}
        />
      )}
    </div>
  );
}

export default App
