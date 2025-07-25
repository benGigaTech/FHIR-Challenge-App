/**
 * SMART on FHIR OAuth2 Authorization Module
 * 
 * This module handles the OAuth2 authorization flow for SMART on FHIR,
 * including token retrieval, storage, and management for API requests.
 */

// Import error handling utilities
import { createError, displayErrorToUser, PatientContextError, ApiError } from './error-handler.js';

// Storage key constants for better maintainability
const AUTH_STORAGE_KEY = 'smartAuthState';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

// Authentication error types
const AuthError = {
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  MISSING_TOKEN: 'MISSING_TOKEN',
  SERVER_ERROR: 'AUTH_SERVER_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_SCOPE: 'INVALID_SCOPE',
  UNKNOWN: 'UNKNOWN_AUTH_ERROR'
};

/**
 * Complete the SMART on FHIR OAuth2 authorization flow and return the authenticated client
 * @returns {Promise<Object>} The FHIR client instance with authentication context
 */
const authorize = async () => {
  try {
    // Check if we already have a valid token that doesn't need refreshing
    if (isAuthenticated(true)) {
      console.log('Using existing valid token');
      return await recreateClientFromStorage();
    }
    
    // Complete the SMART authorization flow initiated in launch.html
    const client = await FHIR.oauth2.ready();
    console.log('Successfully authenticated with FHIR server');
    
    // Store auth state in session storage
    storeAuthState(client);
    
    // Update auth status UI if available
    updateAuthStatusUI('authenticated');
    
    return client;
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Format error using the error handler module
    const formattedError = formatAuthError(error);
    
    // Display error using the enhanced error display function
    displayErrorToUser(formattedError, 'error-container', {
      level: 'error',
      showClose: true,
      autoHide: false
    });
    
    // Update auth status UI if available
    updateAuthStatusUI('unauthenticated');
    
    throw formattedError;
  }
};

/**
 * Store authentication state in session storage with enhanced security
 * @param {Object} client - The FHIR client instance with authentication context
 */
const storeAuthState = (client) => {
  try {
    if (!client || !client.state || !client.state.tokenResponse) {
      throw new Error('Invalid client object for token storage');
    }
    
    // Extract only the necessary auth data from client
    const authData = {
      // Token information
      tokenResponse: {
        access_token: client.state.tokenResponse.access_token,
        token_type: client.state.tokenResponse.token_type,
        expires_in: client.state.tokenResponse.expires_in,
        scope: client.state.tokenResponse.scope,
        // Store refresh token if available
        ...(client.state.tokenResponse.refresh_token && {
          refresh_token: client.state.tokenResponse.refresh_token
        })
      },
      // Server information
      serverUrl: client.state.serverUrl,
      // Patient context if available
      patientId: client.patient?.id,
      // Calculate absolute expiration time for easier checking
      tokenExpiration: new Date().getTime() + (client.state.tokenResponse.expires_in * 1000),
      // Store when the token was obtained
      tokenTimestamp: new Date().getTime()
    };
    
    // Store in session storage (more secure than localStorage for auth data)
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    console.log('Auth state securely stored in session storage');
  } catch (error) {
    console.error('Error storing auth state:', error);
    throw new Error(`Failed to store authentication state: ${error.message}`);
  }
};

/**
 * Retrieve authentication state from session storage
 * @returns {Object|null} The stored authentication state or null if not found
 */
const getAuthState = () => {
  try {
    const authState = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!authState) return null;
    
    const parsedState = JSON.parse(authState);
    
    // Validate the structure of the stored auth state
    if (!parsedState.tokenResponse || !parsedState.tokenResponse.access_token) {
      console.warn('Invalid auth state structure in storage');
      clearAuthState(); // Clear invalid state
      return null;
    }
    
    return parsedState;
  } catch (error) {
    console.error('Error retrieving auth state:', error);
    clearAuthState(); // Clear potentially corrupted state
    return null;
  }
};

/**
 * Check if the user is currently authenticated
 * @param {boolean} checkRefreshNeeded - If true, also checks if token needs refreshing soon
 * @returns {boolean} True if authenticated with a non-expired token
 */
const isAuthenticated = (checkRefreshNeeded = false) => {
  try {
    const authState = getAuthState();
    if (!authState) return false;
    
    // Check if token is expired
    const currentTime = new Date().getTime();
    const isValid = authState.tokenExpiration > currentTime;
    
    // If checking for refresh and token will expire soon, consider it as needing refresh
    if (checkRefreshNeeded && isValid) {
      return authState.tokenExpiration - currentTime > TOKEN_REFRESH_THRESHOLD;
    }
    
    return isValid;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
};

/**
 * Recreate a FHIR client from stored authentication state
 * @returns {Promise<Object>} The recreated FHIR client
 */
const recreateClientFromStorage = async () => {
  try {
    const authState = getAuthState();
    if (!authState) {
      throw new Error('No authentication state available');
    }
    
    // Create a new client using the stored state
    return FHIR.client({
      serverUrl: authState.serverUrl,
      tokenResponse: authState.tokenResponse,
      patientId: authState.patientId
    });
  } catch (error) {
    console.error('Error recreating client from storage:', error);
    throw error;
  }
};

/**
 * Add authorization headers to a fetch request
 * @param {Object} requestOptions - The fetch request options
 * @returns {Object} Updated request options with authorization headers
 */
const addAuthToRequest = (requestOptions = {}) => {
  try {
    // Check authentication status first
    if (!isAuthenticated()) {
      const error = createError(
        AuthError.EXPIRED_TOKEN,
        'Not authenticated or token expired',
        { help: 'Please refresh the page to log in again.' }
      );
      throw error;
    }
    
    const authState = getAuthState();
    if (!authState || !authState.tokenResponse) {
      const error = createError(
        AuthError.MISSING_TOKEN,
        'No authentication token available',
        { help: 'Please refresh the page to log in again.' }
      );
      throw error;
    }
    
    // Create headers object if it doesn't exist
    const headers = requestOptions.headers || {};
    
    // Add authorization header
    headers['Authorization'] = `${authState.tokenResponse.token_type} ${authState.tokenResponse.access_token}`;
    
    // Return updated request options
    return {
      ...requestOptions,
      headers
    };
  } catch (error) {
    console.error('Error adding auth to request:', error);
    // If error is already formatted, rethrow it
    if (error.type && error.message && error.details) {
      throw error;
    }
    // Otherwise format it
    throw formatAuthError(error);
  }
};

/**
 * Clear authentication state from session storage
 */
const clearAuthState = () => {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    console.log('Auth state cleared from session storage');
  } catch (error) {
    console.error('Error clearing auth state:', error);
  }
};

/**
 * Format authentication errors using the error handler module
 * @param {Error} error - The authentication error
 * @returns {Object} Formatted error object
 */
const formatAuthError = (error) => {
  console.error('Authentication error:', error);
  
  // Default error if none provided
  if (!error) {
    return createError(
      AuthError.UNKNOWN,
      'An unknown authentication error occurred.',
      { help: 'Please try refreshing the page or contact support if the problem persists.' }
    );
  }
  
  const errorMsg = error.message || error.toString();
  
  // Map common OAuth errors to structured error objects
  if (errorMsg.includes('invalid_grant')) {
    return createError(
      AuthError.EXPIRED_TOKEN,
      'Your session has expired.',
      { 
        originalError: errorMsg,
        help: 'Please refresh the page to log in again.' 
      }
    );
  } else if (errorMsg.includes('invalid_request')) {
    return createError(
      AuthError.INVALID_TOKEN,
      'There was a problem with the authentication request.',
      { 
        originalError: errorMsg,
        help: 'Please try again or check your connection.' 
      }
    );
  } else if (errorMsg.includes('unauthorized_client')) {
    return createError(
      AuthError.UNAUTHORIZED,
      'This application is not authorized to access the requested resources.',
      { 
        originalError: errorMsg,
        help: 'Please contact your administrator to verify application permissions.' 
      }
    );
  } else if (errorMsg.includes('invalid_scope')) {
    return createError(
      AuthError.INVALID_SCOPE,
      'The application is requesting access to resources it is not allowed to access.',
      { 
        originalError: errorMsg,
        help: 'Please contact your administrator to verify application scope requirements.' 
      }
    );
  } else if (errorMsg.includes('server_error')) {
    return createError(
      AuthError.SERVER_ERROR,
      'The authorization server encountered an error.',
      { 
        originalError: errorMsg,
        help: 'Please try again later or contact support if the problem persists.' 
      }
    );
  } else if (errorMsg.includes('temporarily_unavailable')) {
    return createError(
      AuthError.SERVER_ERROR,
      'The authorization server is temporarily unavailable.',
      { 
        originalError: errorMsg,
        help: 'Please try again in a few minutes.' 
      }
    );
  } else if (errorMsg.includes('Not authenticated') || errorMsg.includes('token expired')) {
    return createError(
      AuthError.EXPIRED_TOKEN,
      'Your session has expired.',
      { 
        originalError: errorMsg,
        help: 'Please refresh the page to log in again.' 
      }
    );
  } else {
    return createError(
      AuthError.UNKNOWN,
      'Authentication failed.',
      { 
        originalError: errorMsg,
        help: 'Please try refreshing the page or contact support if the problem persists.' 
      }
    );
  }
};

/**
 * Handle authentication errors (legacy function for backward compatibility)
 * @param {Error} error - The authentication error
 * @returns {string} User-friendly error message
 */
const handleAuthError = (error) => {
  const formattedError = formatAuthError(error);
  return formattedError.message;
};

/**
 * Display authentication error in the UI
 * @param {string|Object} error - Error message or error object to display
 * @param {string|HTMLElement} container - Container element or ID to display error
 */
const displayAuthError = (error, container = 'error-container') => {
  // If error is a string, convert it to an error object
  const errorObj = typeof error === 'string' ? 
    createError(AuthError.UNKNOWN, error, { help: 'Please try again or contact support.' }) : 
    error;
  
  // Use the enhanced error display function
  displayErrorToUser(errorObj, container, {
    level: 'error',
    showClose: true
  });
  
  // Update auth status UI if available
  updateAuthStatusUI('unauthenticated');
};

/**
 * Update authentication status UI element if available
 * @param {string} status - Authentication status ('authenticated', 'authenticating', 'unauthenticated')
 */
const updateAuthStatusUI = (status) => {
  const authStatusElement = document.getElementById('auth-status');
  if (!authStatusElement) return;
  
  // Remove all status classes
  authStatusElement.classList.remove('authenticated', 'authenticating', 'unauthenticated');
  
  // Add appropriate class and text
  authStatusElement.classList.add(status);
  
  // Set appropriate text
  switch (status) {
    case 'authenticated':
      authStatusElement.textContent = 'Authenticated with FHIR server';
      break;
    case 'authenticating':
      authStatusElement.textContent = 'Authenticating with FHIR server...';
      break;
    case 'unauthenticated':
      authStatusElement.textContent = 'Not authenticated with FHIR server';
      break;
    default:
      authStatusElement.textContent = 'Authentication status unknown';
  }
  
  authStatusElement.style.display = 'block';
};

/**
 * Get token information for debugging
 * @returns {Object} Token information with sensitive parts redacted
 */
const getTokenInfo = () => {
  try {
    const authState = getAuthState();
    if (!authState || !authState.tokenResponse) {
      return { status: 'No token available' };
    }
    
    // Return token info with sensitive parts redacted
    return {
      tokenType: authState.tokenResponse.token_type,
      scope: authState.tokenResponse.scope,
      expiresIn: authState.tokenResponse.expires_in,
      hasRefreshToken: !!authState.tokenResponse.refresh_token,
      expirationTime: new Date(authState.tokenExpiration).toISOString(),
      timeRemaining: Math.floor((authState.tokenExpiration - new Date().getTime()) / 1000) + ' seconds',
      serverUrl: authState.serverUrl
    };
  } catch (error) {
    console.error('Error getting token info:', error);
    return { status: 'Error retrieving token info' };
  }
};

// Export the module functions
export {
  authorize,
  isAuthenticated,
  getAuthState,
  addAuthToRequest,
  clearAuthState,
  handleAuthError,
  formatAuthError,
  displayAuthError,
  updateAuthStatusUI,
  getTokenInfo,
  AuthError
};
