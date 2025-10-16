// Servicio para manejar eventos entre componentes
class EventService {
  constructor() {
    this.events = {};
  }

  // Suscribirse a un evento
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }

  // Desuscribirse de un evento
  off(eventName, callback) {
    if (this.events[eventName]) {
      this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }
  }

  // Emitir un evento
  emit(eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en callback del evento ${eventName}:`, error);
        }
      });
    }
  }

  // Limpiar todos los eventos
  clear() {
    this.events = {};
  }
}

// Crear instancia singleton
const eventService = new EventService();

export default eventService;
