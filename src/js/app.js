/**
 * SMART on FHIR Application JavaScript
 * Main application file that handles FHIR client interactions and displays patient allergy information
 */

// Import error handling utilities
import { createError, displayErrorToUser, handleEmptyData, displayEmptyDataMessage, setupGlobalErrorHandling, hideLoadingState, PatientContextError, ApiError, DataError } from './error-handler.js';

// Import auth module functions
import { authorize, isAuthenticated, formatAuthError, getAuthState, clearAuthState, getTokenInfo, displayAuthError, updateAuthStatusUI as authUpdateStatusUI, AuthError } from './auth.js';

// Import API utility functions
import { searchResources, getResource } from './api.js';

// Import FHIR client module for allergy queries
import { getAllergyData, getAllergyDataPaginated, normalizeAllergyData } from './fhir-client.js';

// Import JSON display functionality
import { displayJsonData, displayFhirResourcesList, exportJsonData } from './json-display.js';

// Import patient context utilities
import { getPatientContext, formatPatientDisplay } from './patient-context.js';

// Import patient store
import patientStore from './patient-store.js';

// DOM elements
const patientBanner = document.getElementById('patient-banner');
const allergiesList = document.getElementById('allergies-list');
const authStatus = document.getElementById('auth-status');
const errorContainer = document.getElementById('error-container');
const connectionInfo = document.getElementById('connection-info');

let fhirClient = null;

/**
 * Initialize the application
 */
async function initializeApp() {
  try {
    // Set up global error handling
    setupGlobalErrorHandling(handleGlobalError);
    
    // Update auth status UI
    authUpdateStatusUI('authenticating');
    
    // Show loading state
    showLoadingState('Connecting to FHIR server...');
    
    // Authorize with SMART on FHIR server
    fhirClient = await authorize();
    
    // If authentication successful, update UI and load patient data
    if (fhirClient) {
      authUpdateStatusUI('authenticated');
      updateConnectionInfo();
      await initializePatientContext();
      initializeJsonControls();
    }
  } catch (error) {
    // Handle authentication errors
    authUpdateStatusUI('unauthenticated');
    
    // Format error if it's not already formatted
    const formattedError = error.type ? error : formatAuthError(error);
    
    // Display the error
    displayErrorToUser(formattedError, 'error-container');
    
    console.error('Initialization error:', error);
  }
}

/**
 * Handle global errors caught by the error handler
 * @param {Object} error - Formatted error object
 */
function handleGlobalError(error) {
  console.error('Global error caught:', error);
  
  // Display the error to the user
  displayErrorToUser(error, 'error-container');
  
  // If it's an authentication error, update the auth status
  if (error.type && (error.type.includes('AUTH') || error.type.includes('TOKEN'))) {
    authUpdateStatusUI('unauthenticated');
  }
}

/**
 * Update the authentication status UI (legacy function for backward compatibility)
 * @param {string} status - The authentication status (authenticating, authenticated, unauthenticated)
 * @param {string} message - The message to display
 */
function updateAuthStatusUI(status, message) {
  // Use the imported function from auth.js
  authUpdateStatusUI(status);
}

/**
 * Show loading state in the allergies list
 * @param {string} message - The loading message to display
 */
function showLoadingState(message = 'Loading...') {
  if (!allergiesList) return;
  
  allergiesList.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
  
  // Hide any previous errors
  if (errorContainer) {
    errorContainer.innerHTML = '';
    errorContainer.style.display = 'none';
  }
}

/**
 * Show error message (legacy function for backward compatibility)
 * @param {string|Object} error - The error message or error object to display
 */
function showError(error) {
  // If it's a string, create an error object
  const errorObj = typeof error === 'string' ? 
    createError('APP_ERROR', error, { help: 'Please try refreshing the page.' }) : 
    error;
  
  // Use the enhanced error display function
  displayErrorToUser(errorObj, 'error-container');
  
  // Hide loading state
  if (allergiesList) {
    allergiesList.innerHTML = '';
  }
}

/**
 * Update connection info in the footer
 */
function updateConnectionInfo() {
  if (!connectionInfo || !fhirClient) return;
  
  const tokenInfo = getTokenInfo();
  const serverUrl = tokenInfo.serverUrl || 'Unknown server';
  const expiresIn = tokenInfo.timeRemaining || 'Unknown';
  
  connectionInfo.innerHTML = `
    <small>Connected to: ${serverUrl} | Token expires in: ${expiresIn}</small>
  `;
}

/**
 * Initialize patient context and load patient data
 * @returns {Promise<void>}
 */
async function initializePatientContext() {
  try {
    showLoadingState('Loading patient context...');
    
    // Get patient context from FHIR client
    const patientContext = await getPatientContext(fhirClient);
    
    // Check if we have a valid patient context before proceeding
    if (!patientContext || !patientContext.id) {
      hideLoadingState();
      const formattedError = createError(
        PatientContextError.MISSING_CONTEXT,
        'No patient selected. Please select a patient to view allergies.',
        { 
          help: 'Launch the application with a patient context or select a patient.'
        }
      );
      displayErrorToUser(formattedError, 'error-container');
      return;
    }
    
    // Store patient context for later use
    patientStore.setPatientContext(patientContext);
    
    // Display patient information
    displayPatientInfo(patientContext);
    
    // Load patient allergy data
    await loadPatientData();
    
  } catch (error) {
    console.error('Error initializing patient context:', error);
    hideLoadingState(); // Make sure to hide loading state on error
    
    const formattedError = createError(
      PatientContextError.CONTEXT_RETRIEVAL_FAILED,
      'Failed to retrieve patient context',
      { 
        originalError: error.message,
        help: 'Please ensure you launched the app with a valid patient context.'
      }
    );
    
    displayErrorToUser(formattedError, 'error-container');
  }
}

/**
 * Load patient data from the FHIR server
 */
async function loadPatientData() {
  try {
    // Show loading state
    showLoadingState('Loading patient information...');
    
    // Hide any previous errors
    if (errorContainer) {
      errorContainer.innerHTML = '';
      errorContainer.style.display = 'none';
    }
    
    // Get patient allergies
    const patientContext = patientStore.getPatientContext();
    const patientId = patientContext?.id;
    
    // Debug logging
    console.log('Patient context:', patientContext);
    console.log('FHIR client state:', fhirClient ? 'Available' : 'Missing');
    
    if (!patientId) {
      throw createError(
        'MISSING_PATIENT_ID',
        'No patient ID available. Please ensure you have selected a patient.',
        { help: 'Try relaunching the application with a patient context.' }
      );
    }
    
    if (!fhirClient) {
      throw createError(
        'MISSING_FHIR_CLIENT',
        'FHIR client is not available. Authentication may have failed.',
        { help: 'Try refreshing the page to re-authenticate.' }
      );
    }
    
    console.log(`Attempting to retrieve allergies for patient ID: ${patientId}`);
    
    // Get patient allergies with pagination support - with error handling
    let allergies;
    try {
      allergies = await getAllergyDataPaginated(fhirClient, patientId, {
        includeReferences: ['patient', 'asserter'],
        sortOrder: '-date',
        maxPages: 5,
        pageSize: 50
      });
      console.log('Allergies retrieved successfully:', allergies);
    } catch (allergyError) {
      console.error('Failed to retrieve allergies:', allergyError);
      throw allergyError; // Re-throw to be caught by outer catch block
    }
    
    // Normalize allergy data for consistent display
    const normalizedAllergies = normalizeAllergyData(allergies);
    
    // Display allergies
    displayAllergies(normalizedAllergies);
    
    // Display raw JSON data
    displayJsonData(allergies, 'json-display-area', {
      title: 'Raw Allergy Data (FHIR R4)',
      showCopyButton: true,
      showLineNumbers: true
    });
    
    // Store data for export
    window.currentAllergyData = allergies;
    
    hideLoadingState();
  } catch (error) {
    console.error('Error loading patient data:', error);
    hideLoadingState();
    
    // Ensure we have a proper error message
    const errorMessage = error.message || 'Unknown error occurred while loading patient data';
    showError(error.type ? error : createError('DATA_LOAD_ERROR', errorMessage));
    
    // Show error in JSON display
    displayJsonData({ 
      error: errorMessage,
      type: error.type || 'ERROR',
      timestamp: new Date().toISOString(),
      details: error.details || {}
    }, 'json-display-area', {
      title: 'Error Loading Allergies'
    });
  }
}

/**
 * Display patient information in the UI
 * @param {Object} patientContext - Patient context object
 */
function displayPatientInfo(patientContext) {
  if (!patientContext || !patientContext.resource) {
    patientBanner.innerHTML = '<div class="alert alert-warning">No patient context available</div>';
    return;
  }

  const patient = formatPatientDisplay(patientContext.resource);
  
  const patientHTML = `
    <div class="patient-info">
      <h4>Patient: ${patient.name}</h4>
      <p><strong>ID:</strong> ${patient.id}</p>
      ${patient.gender ? `<p><strong>Gender:</strong> ${patient.gender}</p>` : ''}
      ${patient.birthDate ? `<p><strong>Birth Date:</strong> ${patient.birthDate}</p>` : ''}
      ${patient.mrn ? `<p><strong>MRN:</strong> ${patient.mrn}</p>` : ''}
    </div>
  `;

  patientBanner.innerHTML = patientHTML;
}

/**
 * Display allergies in the UI
 * @param {Array} allergies - Array of normalized allergy data
 */
function displayAllergies(allergies) {
  if (!allergies || allergies.length === 0) {
    // Use the enhanced empty data handler
    const emptyDataInfo = displayEmptyDataMessage('allergies', allergiesList, {
      level: 'info',
      customMessage: 'No allergies found for this patient.',
      suggestedAction: 'This may indicate that the patient has no known allergies or that allergy information has not been recorded.'
    });
    return;
  }

  const allergiesHTML = allergies.map(allergy => `
    <div class="allergy-item">
      <h4>${allergy.code}</h4>
      <p><strong>Status:</strong> ${allergy.clinicalStatus} (${allergy.verificationStatus})</p>
      <p><strong>Category:</strong> ${allergy.category}</p>
      <p><strong>Criticality:</strong> ${allergy.criticality}</p>
      ${allergy.reactions.length > 0 ? `<p><strong>Reactions:</strong> ${allergy.reactions.map(r => r.manifestation).join(', ')}</p>` : ''}
      ${allergy.recordedDate !== 'Unknown' ? `<p><strong>Recorded:</strong> ${allergy.recordedDate}</p>` : ''}
    </div>
  `).join('');

  allergiesList.innerHTML = allergiesHTML;
}

/**
 * Initialize JSON display controls
 */
function initializeJsonControls() {
  const toggleButton = document.getElementById('toggle-json-display');
  const exportButton = document.getElementById('export-json');
  const jsonContainer = document.getElementById('json-display-container');
  
  let isJsonVisible = false;
  
  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      isJsonVisible = !isJsonVisible;
      
      if (jsonContainer) {
        jsonContainer.style.display = isJsonVisible ? 'block' : 'none';
        toggleButton.textContent = isJsonVisible ? 'Hide Raw JSON' : 'Show Raw JSON';
      }
    });
  }
  
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      if (window.currentAllergyData && window.currentAllergyData.length > 0) {
        exportJsonData(window.currentAllergyData, 'patient-allergies.json');
      } else {
        alert('No allergy data available to export');
      }
    });
  }
}

/**
 * Handle application errors
 * @param {Error|Object} error - The error object
 */
function handleAppError(error) {
  console.error('Application error:', error);
  
  // If the error is already formatted (has type, message, details)
  if (error.type && error.message) {
    displayErrorToUser(error, 'error-container');
    
    // Check if this is an authentication error
    if (error.type.includes('AUTH') || error.type.includes('TOKEN')) {
      authUpdateStatusUI('unauthenticated');
      clearAuthState(); // Clear invalid auth state
    }
    return;
  }
  
  // Format the error based on its characteristics
  let formattedError;
  
  // Check if this is an authentication error
  if (error.message && (error.message.includes('unauthorized') || 
      error.message.includes('Authentication') || 
      error.message.includes('token'))) {
    formattedError = formatAuthError(error);
    authUpdateStatusUI('unauthenticated');
    clearAuthState(); // Clear invalid auth state
  } else {
    // Generic error handling
    formattedError = createError(
      'APP_ERROR',
      `An error occurred: ${error.message || 'Unknown error'}`,
      { 
        originalError: error.stack || error.toString(),
        help: 'Please try refreshing the page. If the problem persists, contact support.'
      }
    );
  }
  
  displayErrorToUser(formattedError, 'error-container');
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', initializeApp);

// Note: Global error handlers are now set up in initializeApp using setupGlobalErrorHandling
