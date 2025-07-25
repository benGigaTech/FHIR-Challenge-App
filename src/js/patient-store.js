/**
 * Patient Context Store Module
 * Provides centralized patient context management with reactive updates
 */

class PatientStore {
  constructor() {
    this._patientContext = null;
    this._subscribers = new Set();
    this._isInitialized = false;
  }

  /**
   * Get the current patient context
   * @returns {Object|null} Current patient context
   */
  getPatientContext() {
    return this._patientContext;
  }

  /**
   * Set the patient context and notify subscribers
   * @param {Object} patientContext - Patient context object
   */
  setPatientContext(patientContext) {
    this._patientContext = patientContext;
    this._isInitialized = true;
    this._notifySubscribers();
  }

  /**
   * Subscribe to patient context changes
   * @param {Function} callback - Callback function to call on changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    
    // Immediately notify with current state
    if (this._isInitialized) {
      callback(this._patientContext);
    }
    
    return () => {
      this._subscribers.delete(callback);
    };
  }

  /**
   * Check if patient context is available
   * @returns {boolean} True if patient context is set
   */
  hasPatientContext() {
    return this._patientContext !== null;
  }

  /**
   * Get patient ID
   * @returns {string|null} Patient ID or null if not available
   */
  getPatientId() {
    return this._patientContext?.id || null;
  }

  /**
   * Get patient resource
   * @returns {Object|null} Patient FHIR resource or null if not available
   */
  getPatientResource() {
    return this._patientContext?.resource || null;
  }

  /**
   * Clear patient context
   */
  clear() {
    this._patientContext = null;
    this._isInitialized = false;
    this._notifySubscribers();
  }

  /**
   * Notify all subscribers of changes
   * @private
   */
  _notifySubscribers() {
    this._subscribers.forEach(callback => {
      try {
        callback(this._patientContext);
      } catch (error) {
        console.error('Error in patient store subscriber:', error);
      }
    });
  }

  /**
   * Get a reactive reference to patient context
   * @returns {Object} Reactive reference with get/set methods
   */
  reactive() {
    return {
      get: () => this._patientContext,
      set: (value) => this.setPatientContext(value),
      subscribe: (callback) => this.subscribe(callback)
    };
  }
}

// Create a singleton instance
const patientStore = new PatientStore();

// Export the singleton instance
export default patientStore;

// Also export the class for testing purposes
export { PatientStore };
