/**
 * Error Handler Module
 * Provides centralized error handling for patient context and API errors
 */

/**
 * Error types for patient context
 */
export const PatientContextError = {
  MISSING_CONTEXT: 'MISSING_PATIENT_CONTEXT',
  INVALID_CLIENT: 'INVALID_FHIR_CLIENT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTHENTICATION_ERROR',
  NOT_FOUND: 'PATIENT_NOT_FOUND'
};

/**
 * Error types for API requests
 */
export const ApiError = {
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Error types for data handling
 */
export const DataError = {
  EMPTY_RESULT: 'EMPTY_RESULT',
  INVALID_FORMAT: 'INVALID_FORMAT',
  MISSING_REQUIRED: 'MISSING_REQUIRED_FIELDS',
  VALIDATION_FAILED: 'VALIDATION_FAILED'
};

/**
 * Create error object with consistent structure
 * @param {string} type - Error type
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Object} Formatted error object
 */
export function createError(type, message, details = {}) {
  return {
    type,
    message,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Handle patient context errors
 * @param {Error} error - The error object
 * @returns {Object} Formatted error object
 */
export function handlePatientContextError(error) {
  console.error('Patient Context Error:', error);

  if (error.message.includes('Patient ID not found')) {
    return createError(
      PatientContextError.MISSING_CONTEXT,
      'Patient context could not be retrieved. Please ensure the SMART launch includes patient context.',
      { 
        originalError: error.message,
        help: 'Try relaunching the application from your EHR with patient context.' 
      }
    );
  }

  if (error.message.includes('Invalid FHIR client')) {
    return createError(
      PatientContextError.INVALID_CLIENT,
      'Invalid FHIR client provided. Please check authentication status.',
      { 
        originalError: error.message,
        help: 'Try refreshing the page to re-authenticate with the FHIR server.' 
      }
    );
  }

  if (error.message.includes('network') || error.message.includes('fetch')) {
    return createError(
      PatientContextError.NETWORK_ERROR,
      'Network error occurred while retrieving patient data. Please check your connection.',
      { 
        originalError: error.message,
        help: 'Verify your internet connection and try again. If the problem persists, contact support.' 
      }
    );
  }

  if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
    return createError(
      PatientContextError.AUTH_ERROR,
      'Authentication failed. Please re-authenticate with the FHIR server.',
      { 
        originalError: error.message,
        help: 'Your session may have expired. Try refreshing the page to log in again.' 
      }
    );
  }

  return createError(
    PatientContextError.NOT_FOUND,
    'Patient data could not be retrieved. Please try again later.',
    { 
      originalError: error.message,
      help: 'If this problem persists, please contact technical support.' 
    }
  );
}

/**
 * Display error message to user
 * @param {Object} error - Error object
 * @param {HTMLElement|string} container - Container element or ID to display error
 * @param {Object} options - Display options
 */
export function displayErrorToUser(error, container = null, options = {}) {
  const {
    autoHide = false,
    autoHideDelay = 5000,
    level = 'error',
    showClose = true,
    showDetails = true,
    onClose = null
  } = options;
  
  // Handle string container ID or element
  const targetContainer = typeof container === 'string' 
    ? document.getElementById(container) 
    : (container || document.getElementById('error-container'));
  
  if (!targetContainer) {
    console.error('No error container found:', error);
    return;
  }

  // Determine alert type based on error level
  const alertClass = {
    error: 'alert-danger',
    warning: 'alert-warning',
    info: 'alert-info'
  }[level] || 'alert-danger';

  // Generate error message HTML
  const errorHTML = `
    <div class="alert ${alertClass}" role="alert">
      <h4 class="alert-heading">${level === 'error' ? 'Error' : level === 'warning' ? 'Warning' : 'Information'}</h4>
      <p>${error.message}</p>
      ${showDetails && error.details?.originalError ? `<small class="text-muted">${error.details.originalError}</small>` : ''}
      ${showDetails && error.details?.help ? `<div class="mt-2"><strong>Suggestion:</strong> ${error.details.help}</div>` : ''}
      ${showClose ? `
        <hr>
        <button class="btn btn-sm btn-outline-${level === 'error' ? 'danger' : level === 'warning' ? 'warning' : 'info'}" id="error-close-btn">
          Close
        </button>
      ` : ''}
    </div>
  `;

  targetContainer.innerHTML = errorHTML;
  targetContainer.style.display = 'block';

  // Add event listener to close button
  if (showClose) {
    const closeButton = targetContainer.querySelector('#error-close-btn');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        targetContainer.style.display = 'none';
        if (onClose && typeof onClose === 'function') {
          onClose();
        }
      });
    }
  }

  // Auto-hide if enabled
  if (autoHide) {
    setTimeout(() => {
      targetContainer.style.display = 'none';
      if (onClose && typeof onClose === 'function') {
        onClose();
      }
    }, autoHideDelay);
  }
}

/**
 * Display loading state
 * @param {string} message - Loading message
 * @param {HTMLElement} container - Container to display loading
 */
export function showLoadingState(message, container = null) {
  const targetContainer = container || document.body;
  
  const loadingHTML = `
    <div class="loading-state">
      <div class="spinner-border text-primary" role="status">
        <span class="sr-only">Loading...</span>
      </div>
      <p>${message}</p>
    </div>
  `;

  // Create or update loading element
  let loadingElement = targetContainer.querySelector('.loading-state');
  if (!loadingElement) {
    loadingElement = document.createElement('div');
    loadingElement.className = 'loading-state';
    targetContainer.appendChild(loadingElement);
  }
  
  loadingElement.innerHTML = loadingHTML;
  loadingElement.style.display = 'block';
}

/**
 * Hide loading state
 * @param {HTMLElement} container - Container to hide loading
 */
export function hideLoadingState(container = null) {
  const targetContainer = container || document.body;
  const loadingElement = targetContainer.querySelector('.loading');
  
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
}

/**
 * Retry mechanism for failed operations
 * @param {Function} operation - Operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Operation result
 */
/**
 * Handle empty data scenarios with user-friendly messages
 * @param {string} resourceType - Type of resource that was empty (e.g., 'allergies', 'medications')
 * @param {Object} options - Options for customizing the empty data message
 * @returns {Object} Formatted message object
 */
export function handleEmptyData(resourceType, options = {}) {
  const {
    isError = false,
    customMessage = null,
    suggestedAction = null,
    level = 'info'
  } = options;
  
  // Default messages by resource type
  const defaultMessages = {
    allergies: 'No known allergies found for this patient.',
    medications: 'No medications found for this patient.',
    conditions: 'No conditions found for this patient.',
    observations: 'No observations found for this patient.',
    procedures: 'No procedures found for this patient.',
    immunizations: 'No immunization records found for this patient.',
    default: `No ${resourceType} data found for this patient.`
  };
  
  // Default suggested actions by resource type
  const defaultActions = {
    allergies: 'Check if allergies have been recorded in the EHR system.',
    medications: 'Verify medication history in the primary EHR system.',
    conditions: 'Review patient history in the primary EHR system.',
    default: `Verify ${resourceType} data in the primary EHR system.`
  };
  
  const message = customMessage || defaultMessages[resourceType] || defaultMessages.default;
  const action = suggestedAction || defaultActions[resourceType] || defaultActions.default;
  
  return createError(
    isError ? DataError.EMPTY_RESULT : 'EMPTY_DATA_INFO',
    message,
    {
      resourceType,
      help: action,
      level
    }
  );
}

/**
 * Display empty data message with appropriate styling
 * @param {string} resourceType - Type of resource that was empty
 * @param {HTMLElement|string} container - Container to display the message
 * @param {Object} options - Options for customizing the message
 */
export function displayEmptyDataMessage(resourceType, container, options = {}) {
  const emptyDataInfo = handleEmptyData(resourceType, options);
  
  // Use our standard display function with info level
  displayErrorToUser(emptyDataInfo, container, {
    level: options.level || 'info',
    autoHide: options.autoHide || false,
    showClose: options.showClose !== undefined ? options.showClose : true
  });
  
  // Log for debugging
  console.info(`Empty data for ${resourceType}:`, emptyDataInfo);
  
  return emptyDataInfo;
}

/**
 * Global error handler for uncaught exceptions
 * Sets up window.onerror and unhandledrejection event listeners
 * @param {Function} callback - Function to call when an uncaught error occurs
 */
export function setupGlobalErrorHandling(callback) {
  // Handle synchronous errors
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error caught:', { message, source, lineno, colno, error });
    
    const formattedError = createError(
      'UNCAUGHT_ERROR',
      'An unexpected error occurred in the application.',
      {
        originalError: error ? error.message : message,
        source,
        lineno,
        colno,
        stack: error ? error.stack : null,
        help: 'Try refreshing the page. If the problem persists, please contact support.'
      }
    );
    
    if (callback && typeof callback === 'function') {
      callback(formattedError);
    }
    
    return true; // Prevents the default error handling
  };
  
  // Handle promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    const formattedError = createError(
      'UNHANDLED_PROMISE_REJECTION',
      'An unexpected error occurred in a background operation.',
      {
        originalError: event.reason ? (event.reason.message || String(event.reason)) : 'Unknown promise error',
        stack: event.reason && event.reason.stack ? event.reason.stack : null,
        help: 'Try refreshing the page. If the problem persists, please contact support.'
      }
    );
    
    if (callback && typeof callback === 'function') {
      callback(formattedError);
    }
    
    event.preventDefault(); // Prevents the default error handling
  });
  
  console.log('Global error handlers have been set up');
}

export async function retryOperation(operation, options = {}) {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    onRetry = null,
    shouldRetry = null,
    retryStatusCodes = [408, 429, 500, 502, 503, 504],
    onFinalFailure = null
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry based on error
      const shouldRetryError = shouldRetry ? 
        shouldRetry(error) : 
        // Default retry logic for HTTP errors
        (error.status && retryStatusCodes.includes(error.status));
      
      if (attempt === maxRetries || !shouldRetryError) {
        if (onFinalFailure && typeof onFinalFailure === 'function') {
          onFinalFailure(error, attempt);
        }
        throw error;
      }
      
      if (onRetry && typeof onRetry === 'function') {
        onRetry(attempt, error);
      }
      
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}
