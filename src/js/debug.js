/**
 * Debug utilities for SMART on FHIR application
 * This file provides debugging tools to help troubleshoot issues
 */

// Enable verbose console logging
export const enableVerboseLogging = () => {
  window.SMART_DEBUG = true;
  console.log('Verbose logging enabled');
};

// Log FHIR client state
export const logFhirClientState = (client) => {
  if (!client) {
    console.error('FHIR client is null or undefined');
    return;
  }

  console.log('FHIR Client State:', {
    state: client.state,
    serverUrl: client.state?.serverUrl,
    tokenResponse: client.state?.tokenResponse ? 'Present' : 'Missing',
    patient: client.patient?.id || 'No patient context',
    hasPatientRead: typeof client.patient?.read === 'function' ? 'Available' : 'Missing',
    hasRequest: typeof client.request === 'function' ? 'Available' : 'Missing'
  });
};

// Log allergy query parameters
export const logAllergyQuery = (patientId, options) => {
  console.log('Allergy Query:', {
    patientId,
    options,
    url: `AllergyIntolerance?patient=${patientId}&_sort=${options.sortOrder || '-date'}&_count=${options.pageSize || 50}`
  });
};

// Add global error listener
export const setupDebugErrorListener = () => {
  window.addEventListener('error', (event) => {
    console.error('Global error caught by debug listener:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });

  console.log('Debug error listener installed');
};

// Test FHIR server connection
export const testFhirServerConnection = async (client, endpoint = '') => {
  try {
    console.log(`Testing FHIR server connection to ${client.state.serverUrl}${endpoint}`);
    const response = await client.request(endpoint);
    console.log('FHIR server connection successful:', response);
    return true;
  } catch (error) {
    console.error('FHIR server connection failed:', error);
    return false;
  }
};
