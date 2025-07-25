/**
 * SMART on FHIR Application JavaScript
 * Main application file that handles FHIR client interactions and displays patient health information
 * including allergies, medications, and immunizations
 */

// Import error handling utilities
import { createError, displayErrorToUser, handleEmptyData, displayEmptyDataMessage, setupGlobalErrorHandling, hideLoadingState, PatientContextError, ApiError, DataError } from './error-handler.js';

// Import auth module functions
import { authorize, isAuthenticated, formatAuthError, getAuthState, clearAuthState, getTokenInfo, displayAuthError, updateAuthStatusUI as authUpdateStatusUI, AuthError } from './auth.js';

// Import API utility functions
import { searchResources, getResource } from './api.js';

// Import FHIR client module for allergy queries
import { getAllergyData, getAllergyDataPaginated, normalizeAllergyData } from './fhir-client.js';

// Import FHIR resources module for multi-resource support
import { ResourceTypes, fetchResourceData } from './fhir-resources.js';

// Import expandable cards UI components
import { 
  createExpandableCard, 
  createResourceTypeSelector, 
  createResourceCardContainer,
  setCardContent,
  createLoadingIndicator,
  createCardError,
  createNoDataMessage
} from './expandable-cards.js';

// Import JSON display functionality
import { displayJsonData, displayFhirResourcesList, exportJsonData } from './json-display.js';

// Import patient context utilities
import { getPatientContext, formatPatientDisplay } from './patient-context.js';

// Import patient store
import patientStore from './patient-store.js';

// DOM elements
const patientBanner = document.getElementById('patient-banner');
const allergiesList = document.getElementById('allergies-list');
const resourceContainer = document.getElementById('resource-container');
const resourceSelectorContainer = document.getElementById('resource-selector-container');
const authStatus = document.getElementById('auth-status');
const errorContainer = document.getElementById('error-container');
const connectionInfo = document.getElementById('connection-info');

let fhirClient = null;
let currentResourceType = ResourceTypes.ALLERGY; // Default resource type

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
      initializeResourceSelector();
      await loadResourceData(currentResourceType);
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
 * Show loading state in the resource container
 * @param {string} message - The loading message to display
 * @param {string} containerId - The ID of the container to show loading in (defaults to resource-cards)
 */
function showLoadingState(message = 'Loading...', containerId = 'resource-cards') {
  const container = document.getElementById(containerId) || allergiesList;
  
  if (!container) return;
  
  // If using the new expandable cards system
  if (containerId === 'resource-cards') {
    setCardContent(containerId, createLoadingIndicator(message));
    return;
  }
  
  // Legacy loading display for allergiesList
  container.innerHTML = `
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
 * Initialize resource selector
 * Creates a resource type selector and adds it to the resource selector container
 */
function initializeResourceSelector() {
  // Check if the container exists
  if (!resourceSelectorContainer) {
    console.error('Resource selector container not found');
    return;
  }
  
  // Create resource cards container if it doesn't exist
  if (!document.getElementById('resource-cards')) {
    const cardContainer = createResourceCardContainer('resource-cards');
    resourceContainer.appendChild(cardContainer);
  }
  
  // Define resource types
  const resourceTypes = [
    { id: ResourceTypes.ALLERGY, name: 'Allergies' },
    { id: ResourceTypes.MEDICATION, name: 'Medications' },
    { id: ResourceTypes.IMMUNIZATION, name: 'Immunizations' },
    { id: ResourceTypes.MEDICATION_REQUEST, name: 'Medication Requests' }
  ];
  
  // Create resource selector
  const resourceSelector = createResourceTypeSelector(resourceTypes, handleResourceSelect, currentResourceType);
  resourceSelectorContainer.innerHTML = '';
  resourceSelectorContainer.appendChild(resourceSelector);
}

/**
 * Handle resource type selection
 * @param {string} resourceType - Selected resource type
 */
async function handleResourceSelect(resourceType) {
  console.log(`Selected resource type: ${resourceType}`);
  currentResourceType = resourceType;
  await loadResourceData(resourceType);
}

/**
 * Load resource data based on the selected resource type
 * @param {string} resourceType - Type of resource to load
 * @returns {Promise<void>}
 */
async function loadResourceData(resourceType) {
  try {
    // Show loading state
    showLoadingState(`Loading ${resourceType} data...`);
    
    // Get patient ID
    const patientId = fhirClient.patient.id;
    
    if (!patientId) {
      throw createError(
        PatientContextError.MISSING_PATIENT_ID,
        'Patient ID is missing',
        { help: 'Please ensure you have selected a patient in the EHR.' }
      );
    }
    
    // Fetch resource data using the appropriate function based on resource type
    const resources = await fetchResourceData(fhirClient, patientId, resourceType);
    
    // Store data for export
    window.currentResourceData = resources;
    
    // Display resources in the UI
    displayResources(resources, resourceType);
    
    // Display raw JSON data
    displayJsonData(resources, 'json-display-area', {
      title: `Raw ${capitalizeFirstLetter(resourceType)} Data (FHIR R4)`,
      showCopyButton: true,
      showLineNumbers: true
    });
    
    hideLoadingState();
  } catch (error) {
    console.error(`Error loading ${resourceType} data:`, error);
    hideLoadingState();
    
    // Display error message
    const errorMessage = error.message || `Failed to load ${resourceType} data`;
    const errorType = error.type || 'DATA_LOAD_ERROR';
    const errorHelp = error.details?.help || 'Please try again later';
    
    // Set error content in the card container
    const cardContainer = document.getElementById('resource-cards');
    if (cardContainer) {
      setCardContent('resource-cards', createCardError(
        errorMessage,
        errorType,
        errorHelp
      ));
    }
    
    // Show error in JSON display
    displayJsonData({ 
      error: errorMessage,
      type: errorType,
      timestamp: new Date().toISOString(),
      details: error.details || {}
    }, 'json-display-area', {
      title: `Error Loading ${capitalizeFirstLetter(resourceType)}`
    });
  }
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
    await loadResourceData(currentResourceType);
    
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
 * @deprecated Use loadResourceData instead for the new expandable cards UI
 */
async function loadPatientData() {
  try {
    // Show loading state
    showLoadingState('Loading allergy data...');
    
    // Get patient ID from the client
    const fhirPatientId = fhirClient.patient.id;
    
    if (!fhirPatientId) {
      throw createError(
        PatientContextError.MISSING_PATIENT_ID,
        'Patient ID is missing',
        { help: 'Please ensure you have selected a patient in the EHR.' }
      );
    }
    
    // Get patient allergies
    const patientContext = patientStore.getPatientContext();
    
    // Debug logging
    console.log('Patient context:', patientContext);
    console.log('FHIR client state:', fhirClient ? 'Available' : 'Missing');
    
    if (!fhirPatientId) {
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
    
    console.log(`Attempting to retrieve allergies for patient ID: ${fhirPatientId}`);
    
    // Get patient allergies with pagination support - with error handling
    let allergies;
    try {
      allergies = await getAllergyDataPaginated(fhirClient, fhirPatientId, {
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
 * Display allergies in the UI (legacy function for backward compatibility)
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
 * Display resources in the UI using expandable cards
 * @param {Array} resources - Array of resource data
 * @param {string} resourceType - Type of resource being displayed
 */
function displayResources(resources, resourceType) {
  const cardContainer = document.getElementById('resource-cards');
  
  if (!cardContainer) {
    console.error('Resource card container not found');
    return;
  }
  
  // Clear existing cards
  cardContainer.innerHTML = '';
  
  // Check if we have data
  if (!resources || resources.length === 0) {
    // Show no data message
    setCardContent('resource-cards', createNoDataMessage(
      capitalizeFirstLetter(resourceType),
      `No ${resourceType} found for this patient.`
    ));
    return;
  }
  
  // Create cards for each resource
  resources.forEach((resource, index) => {
    const cardId = `${resourceType}-${index}`;
    const cardTitle = getResourceCardTitle(resource, resourceType);
    const card = createExpandableCard(cardTitle, cardId, index === 0);
    cardContainer.appendChild(card);
    
    // Set card content
    const content = formatResourceCardContent(resource, resourceType);
    setCardContent(cardId, content);
  });
}

/**
 * Get card title based on resource type and data
 * @param {Object} resource - Resource data
 * @param {string} resourceType - Type of resource
 * @returns {string} Card title
 */
function getResourceCardTitle(resource, resourceType) {
  switch (resourceType) {
    case ResourceTypes.ALLERGY:
      return resource.display || 'Unknown Allergy';
    case ResourceTypes.MEDICATION:
      return resource.medicationDisplay || 'Unknown Medication';
    case ResourceTypes.IMMUNIZATION:
      return resource.vaccineDisplay || 'Unknown Vaccine';
    case ResourceTypes.MEDICATION_REQUEST:
      return resource.medicationDisplay || 'Unknown Medication Request';
    default:
      return 'Unknown Resource';
  }
}

/**
 * Format card content based on resource type and data
 * @param {Object} resource - Resource data
 * @param {string} resourceType - Type of resource
 * @returns {string} Formatted HTML content
 */
function formatResourceCardContent(resource, resourceType) {
  switch (resourceType) {
    case ResourceTypes.ALLERGY:
      return formatAllergyContent(resource);
    case ResourceTypes.MEDICATION:
      return formatMedicationContent(resource);
    case ResourceTypes.IMMUNIZATION:
      return formatImmunizationContent(resource);
    case ResourceTypes.MEDICATION_REQUEST:
      return formatMedicationRequestContent(resource);
    default:
      return `<div class="card-content"><p>No formatted content available for ${resourceType}</p></div>`;
  }
}

/**
 * Format allergy content
 * @param {Object} allergy - Allergy resource
 * @returns {string} Formatted HTML content
 */
function formatAllergyContent(allergy) {
  // Handle different code structure formats
  const allergyName = allergy.substance?.display || 
                     allergy.code?.display || 
                     allergy.code?.text || 
                     (typeof allergy.code === 'string' ? allergy.code : 'Unknown Substance');
  
  return `
    <div class="allergy-item">
      <h4>${allergyName}</h4>
      <p><strong>Category:</strong> ${Array.isArray(allergy.category) ? allergy.category.join(', ') : allergy.category || 'Unknown'}</p>
      <p><strong>Criticality:</strong> ${allergy.criticality || 'Unknown'}</p>
      ${allergy.reactions && allergy.reactions.length > 0 ? 
        `<p><strong>Reaction:</strong> ${allergy.reactions.map(r => r.manifestation || 'Unknown').join(', ')}</p>` : 
        ''}
      ${allergy.recordedDate && allergy.recordedDate !== 'Unknown' ? `<p><strong>Recorded:</strong> ${formatDate(allergy.recordedDate)}</p>` : ''}
    </div>
  `;
}

/**
 * Format medication content
 * @param {Object} medication - Medication resource
 * @returns {string} Formatted HTML content
 */
function formatMedicationContent(medication) {
  return `
    <div class="allergy-item">
      <h4>${medication.medicationDisplay || 'Unknown Medication'}</h4>
      <p><strong>Status:</strong> ${medication.status || 'Unknown'}</p>
      <p><strong>Intent:</strong> ${medication.intent || 'Unknown'}</p>
      ${medication.dosageInstructions && medication.dosageInstructions.length > 0 ? 
        `<p><strong>Dosage:</strong> ${medication.dosageInstructions.join('; ')}</p>` : 
        ''}
      ${medication.dateWritten ? `<p><strong>Date Written:</strong> ${formatDate(medication.dateWritten)}</p>` : ''}
      ${medication.prescriber ? `<p><strong>Prescriber:</strong> ${medication.prescriber.display || 'Unknown'}</p>` : ''}
      ${medication.note ? `<p><strong>Note:</strong> ${medication.note}</p>` : ''}
    </div>
  `;
}

/**
 * Format immunization content
 * @param {Object} immunization - Immunization resource
 * @returns {string} Formatted HTML content
 */
function formatImmunizationContent(immunization) {
  return `
    <div class="immunization-item">
      <h4>${immunization.vaccineDisplay || 'Unknown Vaccine'}</h4>
      <p><strong>Status:</strong> ${immunization.status || 'Unknown'}</p>
      <p><strong>Date:</strong> ${immunization.occurrenceDate ? formatDate(immunization.occurrenceDate) : 'Unknown'}</p>
      ${immunization.manufacturer ? `<p><strong>Manufacturer:</strong> ${immunization.manufacturer}</p>` : ''}
      ${immunization.lotNumber ? `<p><strong>Lot Number:</strong> ${immunization.lotNumber}</p>` : ''}
      ${immunization.site ? `<p><strong>Site:</strong> ${immunization.site}</p>` : ''}
      ${immunization.route ? `<p><strong>Route:</strong> ${immunization.route}</p>` : ''}
    </div>
  `;
}

/**
 * Format medication request content
 * @param {Object} medicationRequest - MedicationRequest resource
 * @returns {string} Formatted HTML content
 */
function formatMedicationRequestContent(medicationRequest) {
  // Get status class based on medication request status
  const getStatusClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'status-active';
      case 'completed': return 'status-completed';
      case 'stopped': 
      case 'cancelled': 
      case 'on-hold': return 'status-stopped';
      case 'draft': 
      case 'entered-in-error': return 'status-draft';
      default: return '';
    }
  };
  
  // Format dosage instructions
  const formatDosage = (dosageInstructions) => {
    if (!dosageInstructions || dosageInstructions.length === 0) {
      return '';
    }
    
    // Take the first dosage instruction (most common case)
    const dosage = dosageInstructions[0];
    let dosageText = '';
    
    // Add dosage text if available
    if (typeof dosage === 'string') {
      dosageText = dosage;
    } else if (dosage.text) {
      dosageText = dosage.text;
    } else {
      // Construct dosage from components if available
      const doseQuantity = dosage.doseAndRate?.[0]?.doseQuantity;
      const timing = dosage.timing?.code?.text || dosage.timing?.code?.coding?.[0]?.display;
      const route = dosage.route?.coding?.[0]?.display;
      
      if (doseQuantity) {
        dosageText += `${doseQuantity.value} ${doseQuantity.unit || ''}`;
      }
      
      if (route) {
        dosageText += dosageText ? ` ${route}` : route;
      }
      
      if (timing) {
        dosageText += dosageText ? ` ${timing}` : timing;
      }
    }
    
    return dosageText ? `<div class="dosage-instructions">${dosageText}</div>` : '';
  };
  
  return `
    <div class="medication-request-card">
      <div class="medication-name">${medicationRequest.medicationDisplay || 'Unknown Medication'}</div>
      
      <div class="medication-status ${getStatusClass(medicationRequest.status)}">
        ${medicationRequest.status || 'Unknown'}
      </div>
      
      <div class="medication-details">
        <div class="medication-detail-item">
          <span class="detail-label">Prescribed:</span>
          <span>${medicationRequest.authoredOn ? formatDate(medicationRequest.authoredOn) : 'Unknown'}</span>
        </div>
        
        <div class="medication-detail-item">
          <span class="detail-label">Prescriber:</span>
          <span>${medicationRequest.requester ? medicationRequest.requester.display || 'Unknown' : 'Unknown'}</span>
        </div>
        
        ${medicationRequest.dosageInstructions ? formatDosage(medicationRequest.dosageInstructions) : ''}
        
        ${medicationRequest.note ? `<div class="notes">${medicationRequest.note}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Format date for display
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch (e) {
    return dateString;
  }
}

/**
 * Capitalize first letter of a string
 * @param {string} string - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
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
      // Use current resource data if available, otherwise fall back to allergy data
      const dataToExport = window.currentResourceData || window.currentAllergyData;
      
      if (dataToExport && dataToExport.length > 0) {
        const filename = `patient-${currentResourceType || 'allergies'}.json`;
        exportJsonData(dataToExport, filename);
      } else {
        alert('No data available to export');
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
