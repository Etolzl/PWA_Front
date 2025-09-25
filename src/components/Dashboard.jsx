import { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [savedImages, setSavedImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState('recent'); // recent, title, category

  const API_BASE = 'http://localhost:4001/api';

  // Cargar imágenes guardadas del usuario
  useEffect(() => {
    if (user) {
      loadSavedImages();
    }
  }, [user]);

  const loadSavedImages = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/images/saved`, {
        headers: {
          'x-user-id': user.id
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSavedImages(data.data.imagenes || []);
      } else {
        setError(data.message || 'Error al cargar las imágenes guardadas');
      }
    } catch (error) {
      console.error('Error al cargar imágenes guardadas:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar imagen de la colección personal
  const removeImage = async (imageId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta imagen de tu colección?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/images/remove`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ imageId })
      });

      const data = await response.json();
      
      if (data.success) {
        setSavedImages(prev => prev.filter(img => img.id !== imageId));
        alert('Imagen eliminada de tu colección');
      } else {
        alert(data.message || 'Error al eliminar la imagen');
      }
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
      alert('Error al eliminar la imagen. Inténtalo de nuevo.');
    }
  };

  // Descargar imagen
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

  // Filtrar y ordenar imágenes
  const filteredAndSortedImages = () => {
    let filtered = savedImages.filter(image => {
      const matchesSearch = searchTerm === '' || 
        image.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (image.tags && image.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
      
      const matchesCategory = selectedCategory === 'Todas' || image.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'recent':
        default:
          return new Date(b.createdAt || b.fecha_guardado) - new Date(a.createdAt || a.fecha_guardado);
      }
    });

    return filtered;
  };

  // Obtener categorías únicas de las imágenes guardadas
  const getUniqueCategories = () => {
    const categories = [...new Set(savedImages.map(img => img.category))];
    return ['Todas', ...categories.sort()];
  };

  const ImageCard = ({ image }) => (
    <div className="dashboard-image-card">
      <div className="image-container">
        <img 
          src={image.url} 
          alt={image.title}
          loading="lazy"
        />
        <div className="image-overlay">
          <h3>{image.title}</h3>
          <p>{image.description}</p>
          <div className="image-meta">
            <span className="category-tag">{image.category}</span>
            {image.tags && image.tags.length > 0 && (
              <div className="tags">
                {image.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="tag">#{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div className="image-actions">
            <button 
              className="download-btn"
              onClick={() => downloadImage(image.url, image.title)}
              title="Descargar imagen"
            >
              📥 Descargar
            </button>
            <button 
              className="remove-btn"
              onClick={() => removeImage(image.id)}
              title="Eliminar de mi colección"
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando tu colección personal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-icon">⚠️</div>
        <h3>Error al cargar tu colección</h3>
        <p>{error}</p>
        <button onClick={loadSavedImages} className="retry-btn">
          Reintentar
        </button>
      </div>
    );
  }

  const filteredImages = filteredAndSortedImages();
  const categories = getUniqueCategories();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h1>Mi Colección Personal</h1>
          <p>Bienvenido, {user.name}. Aquí tienes todas tus imágenes guardadas.</p>
        </div>
        
        <div className="dashboard-stats">
          <div className="stat">
            <span className="stat-number">{savedImages.length}</span>
            <span className="stat-label">Imágenes guardadas</span>
          </div>
          <div className="stat">
            <span className="stat-number">{categories.length - 1}</span>
            <span className="stat-label">Categorías</span>
          </div>
        </div>
      </header>

      {/* Controles de filtrado y búsqueda */}
      <div className="dashboard-controls">
        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar en tu colección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">🔍</div>
          </div>
        </div>

        <div className="filters-section">
          <div className="category-filters">
            <label>Categoría:</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
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
              <option value="title">Título (A-Z)</option>
              <option value="category">Categoría</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="results-info">
        <p>
          {filteredImages.length} {filteredImages.length === 1 ? 'imagen encontrada' : 'imágenes encontradas'}
          {searchTerm && ` para "${searchTerm}"`}
          {selectedCategory !== 'Todas' && ` en ${selectedCategory}`}
        </p>
      </div>

      {/* Galería de imágenes */}
      <main className="dashboard-gallery">
        {filteredImages.length > 0 ? (
          <div className="gallery-grid">
            {filteredImages.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
          </div>
        ) : (
          <div className="no-images">
            <div className="no-images-icon">📷</div>
            <h3>
              {savedImages.length === 0 
                ? 'Tu colección está vacía' 
                : 'No se encontraron imágenes'
              }
            </h3>
            <p>
              {savedImages.length === 0 
                ? 'Comienza guardando imágenes desde la galería principal para verlas aquí.'
                : 'Intenta con otros términos de búsqueda o selecciona una categoría diferente.'
              }
            </p>
            {savedImages.length === 0 && (
              <button 
                className="go-to-gallery-btn"
                onClick={() => window.location.reload()} // Volver a la galería principal
              >
                Explorar Galería
              </button>
            )}
            {savedImages.length > 0 && (
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('Todas');
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
