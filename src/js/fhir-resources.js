import { createError, retryOperation, DataError } from './error-handler.js';
import { FhirServerError, NetworkError, getAllergyDataWithRetry } from './fhir-client.js';

/**
 * Resource types supported by the application
 */
export const ResourceTypes = {
  ALLERGY: 'allergies',
  MEDICATION: 'medications',
  IMMUNIZATION: 'immunizations'
};

/**
 * Fetch FHIR resources based on resource type
 * @param {Object} client - Authenticated FHIR client
 * @param {string} patientId - Patient ID to query for
 * @param {string} resourceType - Type of resource to fetch (from ResourceTypes)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of resources
 */
export async function fetchResourceData(client, patientId, resourceType, options = {}) {
  try {
    if (!client || !client.request) {
      throw createError(
        FhirServerError.INVALID_CLIENT, 
        'Invalid FHIR client provided',
        { help: 'Please ensure you are properly authenticated before accessing FHIR resources.' }
      );
    }

    if (!patientId) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Patient ID is required',
        { help: 'A valid patient ID is required to retrieve health information.' }
      );
    }

    if (!resourceType) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Resource type is required',
        { help: 'A valid resource type is required to retrieve health information.' }
      );
    }

    console.log(`Fetching ${resourceType} data for patient: ${patientId}`);

    switch (resourceType) {
      case ResourceTypes.ALLERGY:
        return await getAllergyDataWithRetry(client, patientId, options);
      case ResourceTypes.MEDICATION:
        return await getMedicationDataWithRetry(client, patientId, options);
      case ResourceTypes.IMMUNIZATION:
        return await getImmunizationDataWithRetry(client, patientId, options);
      default:
        throw createError(
          FhirServerError.INVALID_PARAMETER,
          `Unsupported resource type: ${resourceType}`,
          { help: 'Please select a supported resource type.' }
        );
    }
  } catch (error) {
    // If the error is already a structured error object, pass it through
    if (error.type) {
      throw error;
    }
    
    // Otherwise, create a structured error
    throw createError(
      FhirServerError.DATA_RETRIEVAL_FAILED,
      `Failed to retrieve ${resourceType} data`,
      {
        originalError: error,
        patientId,
        resourceType,
        help: 'Please try again later. If the problem persists, contact support.'
      }
    );
  }
}

/**
 * Get medication data for a specific patient
 * @param {Object} client - Authenticated FHIR client
 * @param {string} patientId - Patient ID to query for
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of medication resources
 */
export async function getMedicationData(client, patientId, options = {}) {
  const {
    includeReferences = ['patient', 'prescriber'],
    pageLimit = 0,
    maxResults = 1000,
    sortOrder = '-date'
  } = options;

  try {
    if (!client || !client.request) {
      throw createError(
        FhirServerError.INVALID_CLIENT, 
        'Invalid FHIR client provided',
        { help: 'Please ensure you are properly authenticated before accessing FHIR resources.' }
      );
    }

    if (!patientId) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Patient ID is required',
        { help: 'A valid patient ID is required to retrieve medication information.' }
      );
    }

    console.log(`Retrieving medication data for patient: ${patientId}`);

    // Build the query URL
    const queryParams = new URLSearchParams({
      patient: patientId,
      _sort: sortOrder,
      _count: Math.min(maxResults, 100) // FHIR servers typically limit to 100 per page
    });

    const url = `MedicationRequest?${queryParams.toString()}`;

    // Make the FHIR request
    const response = await client.request(url, {
      resolveReferences: includeReferences,
      pageLimit: pageLimit,
      flat: true
    });

    console.log('Medication data retrieved successfully:', {
      patientId,
      totalResults: response?.entry?.length || 0,
      url
    });

    return processMedicationResponse(response);
  } catch (error) {
    console.error('Error retrieving medication data:', error);
    
    // If the error is already a structured error object, pass it through
    if (error.type) {
      throw error;
    }
    
    // Otherwise, format the error based on its characteristics
    if (error.status === 401 || error.status === 403) {
      throw createError(
        FhirServerError.UNAUTHORIZED,
        'Unauthorized access to FHIR resources',
        { 
          originalError: error,
          help: 'Your session may have expired. Please try refreshing the page to re-authenticate.',
          status: error.status
        }
      );
    } else if (error.status === 404) {
      throw createError(
        FhirServerError.RESOURCE_NOT_FOUND,
        'Medication resources not found',
        { 
          originalError: error,
          help: 'The requested medication information could not be found for this patient.',
          status: error.status,
          patientId
        }
      );
    } else if (error.status >= 500) {
      throw createError(
        FhirServerError.SERVER_ERROR,
        'FHIR server error occurred',
        { 
          originalError: error,
          help: 'The FHIR server encountered an error. Please try again later.',
          status: error.status
        }
      );
    } else if (error.message && error.message.includes('network')) {
      throw createError(
        NetworkError.CONNECTION_FAILED,
        'Network error while connecting to FHIR server',
        { 
          originalError: error,
          help: 'Please check your internet connection and try again.'
        }
      );
    } else {
      throw createError(
        FhirServerError.UNKNOWN,
        'Unknown error retrieving medication data',
        { 
          originalError: error,
          help: 'An unexpected error occurred. Please try again later.'
        }
      );
    }
  }
}

/**
 * Process FHIR response and extract medication resources
 * @param {Object} response - FHIR response bundle
 * @returns {Array} Array of medication resources
 */
function processMedicationResponse(response) {
  if (!response) {
    return [];
  }

  // Handle both Bundle and direct resource formats
  if (response.resourceType === 'Bundle' && response.entry) {
    return response.entry
      .filter(entry => entry.resource && entry.resource.resourceType === 'MedicationRequest')
      .map(entry => normalizeMedicationData(entry.resource));
  } else if (response.resourceType === 'MedicationRequest') {
    return [normalizeMedicationData(response)];
  } else if (Array.isArray(response)) {
    return response
      .filter(item => item && item.resourceType === 'MedicationRequest')
      .map(item => normalizeMedicationData(item));
  }

  return [];
}

/**
 * Normalize medication data for consistent display
 * @param {Object} medication - Medication resource
 * @returns {Object} Normalized medication data
 */
function normalizeMedicationData(medication) {
  if (!medication) return null;

  try {
    return {
      id: medication.id || '',
      resourceType: medication.resourceType || 'MedicationRequest',
      status: medication.status || 'unknown',
      intent: medication.intent || 'order',
      medicationDisplay: extractMedicationDisplay(medication),
      dosageInstructions: extractDosageInstructions(medication),
      dateWritten: medication.authoredOn || '',
      prescriber: extractPrescriberInfo(medication),
      note: extractNotes(medication.note)
    };
  } catch (error) {
    console.error('Error normalizing medication data:', error);
    return {
      id: medication.id || '',
      resourceType: medication.resourceType || 'MedicationRequest',
      status: 'unknown',
      error: 'Error processing medication data'
    };
  }
}

/**
 * Extract medication display name
 * @param {Object} medication - Medication resource
 * @returns {string} Medication display name
 */
function extractMedicationDisplay(medication) {
  if (medication.medicationCodeableConcept) {
    return medication.medicationCodeableConcept.text || 
           medication.medicationCodeableConcept.coding?.[0]?.display ||
           'Unnamed Medication';
  }
  
  if (medication.medicationReference) {
    return medication.medicationReference.display || 'Medication Reference';
  }
  
  return 'Unnamed Medication';
}

/**
 * Extract dosage instructions
 * @param {Object} medication - Medication resource
 * @returns {Array} Dosage instructions
 */
function extractDosageInstructions(medication) {
  if (!medication.dosageInstruction || !Array.isArray(medication.dosageInstruction)) {
    return ['No dosage information available'];
  }
  
  return medication.dosageInstruction.map(dosage => {
    if (dosage.text) {
      return dosage.text;
    }
    
    let instructions = [];
    
    if (dosage.timing) {
      if (dosage.timing.code) {
        instructions.push(dosage.timing.code.text || dosage.timing.code.coding?.[0]?.display || '');
      }
      
      if (dosage.timing.repeat) {
        const frequency = dosage.timing.repeat.frequency;
        const period = dosage.timing.repeat.period;
        const periodUnit = dosage.timing.repeat.periodUnit;
        
        if (frequency && period && periodUnit) {
          instructions.push(`${frequency} time(s) per ${period} ${periodUnit}`);
        }
      }
    }
    
    if (dosage.doseAndRate) {
      dosage.doseAndRate.forEach(dose => {
        if (dose.doseQuantity) {
          instructions.push(`${dose.doseQuantity.value || ''} ${dose.doseQuantity.unit || ''}`);
        }
      });
    }
    
    if (dosage.route) {
      instructions.push(`Route: ${dosage.route.coding?.[0]?.display || dosage.route.text || ''}`);
    }
    
    return instructions.filter(Boolean).join(', ') || 'No specific dosage instructions';
  });
}

/**
 * Extract prescriber information
 * @param {Object} medication - Medication resource
 * @returns {Object} Prescriber information
 */
function extractPrescriberInfo(medication) {
  if (!medication.requester) {
    return { display: 'Unknown prescriber' };
  }
  
  return {
    reference: medication.requester.reference || '',
    display: medication.requester.display || 'Unnamed prescriber',
    type: medication.requester.type || ''
  };
}

/**
 * Extract notes
 * @param {Array} notes - Notes from the resource
 * @returns {string} Combined notes text
 */
function extractNotes(notes) {
  if (!notes || !Array.isArray(notes) || notes.length === 0) {
    return '';
  }
  
  return notes.map(note => note.text || '').filter(Boolean).join('; ');
}

/**
 * Get medication data with retry mechanism
 * @param {Object} client - Authenticated FHIR client
 * @param {string} patientId - Patient ID to query for
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of medication resources
 */
export async function getMedicationDataWithRetry(client, patientId, options = {}) {
  const retryOptions = {
    maxRetries: 3,
    delay: 1000,
    backoff: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    retryCondition: (error) => {
      return (
        (error.type && error.type.includes('NETWORK')) ||
        (error.details && error.details.status && [408, 429, 500, 502, 503, 504].includes(error.details.status))
      );
    },
    onRetry: (attempt, error) => {
      console.warn(`Retry attempt ${attempt} for medication query:`, error.message || error);
      return `Retrying connection to FHIR server (attempt ${attempt} of 3)...`;
    },
    onFailure: (error) => {
      if (error.type) {
        error.details = { ...error.details, retriesAttempted: 3 };
        return error;
      }
      
      return createError(
        NetworkError.MAX_RETRIES_EXCEEDED,
        'Failed to connect to FHIR server after multiple attempts',
        {
          originalError: error,
          retriesAttempted: 3,
          help: 'The server may be temporarily unavailable. Please try again later.'
        }
      );
    }
  };

  try {
    return await retryOperation(
      () => getMedicationData(client, patientId, options),
      { ...retryOptions, ...options }
    );
  } catch (error) {
    if (error.type) {
      throw error;
    }
    
    throw createError(
      FhirServerError.DATA_RETRIEVAL_FAILED,
      'Failed to retrieve medication data after multiple attempts',
      {
        originalError: error,
        patientId,
        help: 'Please try again later. If the problem persists, contact support.'
      }
    );
  }
}

/**
 * Get immunization data for a specific patient
 * @param {Object} client - Authenticated FHIR client
 * @param {string} patientId - Patient ID to query for
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of immunization resources
 */
export async function getImmunizationData(client, patientId, options = {}) {
  const {
    includeReferences = ['patient', 'performer'],
    pageLimit = 0,
    maxResults = 1000,
    sortOrder = '-date'
  } = options;

  try {
    if (!client || !client.request) {
      throw createError(
        FhirServerError.INVALID_CLIENT, 
        'Invalid FHIR client provided',
        { help: 'Please ensure you are properly authenticated before accessing FHIR resources.' }
      );
    }

    if (!patientId) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Patient ID is required',
        { help: 'A valid patient ID is required to retrieve immunization information.' }
      );
    }

    console.log(`Retrieving immunization data for patient: ${patientId}`);

    // Build the query URL
    const queryParams = new URLSearchParams({
      patient: patientId,
      _sort: sortOrder,
      _count: Math.min(maxResults, 100) // FHIR servers typically limit to 100 per page
    });

    const url = `Immunization?${queryParams.toString()}`;

    // Make the FHIR request
    const response = await client.request(url, {
      resolveReferences: includeReferences,
      pageLimit: pageLimit,
      flat: true
    });

    console.log('Immunization data retrieved successfully:', {
      patientId,
      totalResults: response?.entry?.length || 0,
      url
    });

    return processImmunizationResponse(response);
  } catch (error) {
    console.error('Error retrieving immunization data:', error);
    
    // If the error is already a structured error object, pass it through
    if (error.type) {
      throw error;
    }
    
    // Otherwise, format the error based on its characteristics
    if (error.status === 401 || error.status === 403) {
      throw createError(
        FhirServerError.UNAUTHORIZED,
        'Unauthorized access to FHIR resources',
        { 
          originalError: error,
          help: 'Your session may have expired. Please try refreshing the page to re-authenticate.',
          status: error.status
        }
      );
    } else if (error.status === 404) {
      throw createError(
        FhirServerError.RESOURCE_NOT_FOUND,
        'Immunization resources not found',
        { 
          originalError: error,
          help: 'The requested immunization information could not be found for this patient.',
          status: error.status,
          patientId
        }
      );
    } else if (error.status >= 500) {
      throw createError(
        FhirServerError.SERVER_ERROR,
        'FHIR server error occurred',
        { 
          originalError: error,
          help: 'The FHIR server encountered an error. Please try again later.',
          status: error.status
        }
      );
    } else if (error.message && error.message.includes('network')) {
      throw createError(
        NetworkError.CONNECTION_FAILED,
        'Network error while connecting to FHIR server',
        { 
          originalError: error,
          help: 'Please check your internet connection and try again.'
        }
      );
    } else {
      throw createError(
        FhirServerError.UNKNOWN,
        'Unknown error retrieving immunization data',
        { 
          originalError: error,
          help: 'An unexpected error occurred. Please try again later.'
        }
      );
    }
  }
}

/**
 * Process FHIR response and extract immunization resources
 * @param {Object} response - FHIR response bundle
 * @returns {Array} Array of immunization resources
 */
function processImmunizationResponse(response) {
  if (!response) {
    return [];
  }

  // Handle both Bundle and direct resource formats
  if (response.resourceType === 'Bundle' && response.entry) {
    return response.entry
      .filter(entry => entry.resource && entry.resource.resourceType === 'Immunization')
      .map(entry => normalizeImmunizationData(entry.resource));
  } else if (response.resourceType === 'Immunization') {
    return [normalizeImmunizationData(response)];
  } else if (Array.isArray(response)) {
    return response
      .filter(item => item && item.resourceType === 'Immunization')
      .map(item => normalizeImmunizationData(item));
  }

  return [];
}

/**
 * Normalize immunization data for consistent display
 * @param {Object} immunization - Immunization resource
 * @returns {Object} Normalized immunization data
 */
function normalizeImmunizationData(immunization) {
  if (!immunization) return null;

  try {
    return {
      id: immunization.id || '',
      resourceType: immunization.resourceType || 'Immunization',
      status: immunization.status || 'unknown',
      vaccineDisplay: extractVaccineDisplay(immunization),
      occurrenceDate: extractOccurrenceDate(immunization),
      performer: extractPerformerInfo(immunization),
      lotNumber: immunization.lotNumber || '',
      site: extractSite(immunization),
      route: extractRoute(immunization),
      note: extractNotes(immunization.note)
    };
  } catch (error) {
    console.error('Error normalizing immunization data:', error);
    return {
      id: immunization.id || '',
      resourceType: immunization.resourceType || 'Immunization',
      status: 'unknown',
      error: 'Error processing immunization data'
    };
  }
}

/**
 * Extract vaccine display name
 * @param {Object} immunization - Immunization resource
 * @returns {string} Vaccine display name
 */
function extractVaccineDisplay(immunization) {
  if (!immunization.vaccineCode) {
    return 'Unknown vaccine';
  }
  
  return immunization.vaccineCode.text || 
         immunization.vaccineCode.coding?.[0]?.display ||
         'Unknown vaccine';
}

/**
 * Extract occurrence date
 * @param {Object} immunization - Immunization resource
 * @returns {string} Occurrence date
 */
function extractOccurrenceDate(immunization) {
  if (immunization.occurrenceDateTime) {
    return immunization.occurrenceDateTime;
  }
  
  if (immunization.occurrenceString) {
    return immunization.occurrenceString;
  }
  
  return '';
}

/**
 * Extract performer information
 * @param {Object} immunization - Immunization resource
 * @returns {Object} Performer information
 */
function extractPerformerInfo(immunization) {
  if (!immunization.performer || !Array.isArray(immunization.performer) || immunization.performer.length === 0) {
    return { display: 'Unknown performer' };
  }
  
  const performer = immunization.performer[0];
  
  if (!performer.actor) {
    return { display: 'Unknown performer' };
  }
  
  return {
    reference: performer.actor.reference || '',
    display: performer.actor.display || 'Unnamed performer',
    type: performer.actor.type || ''
  };
}

/**
 * Extract site information
 * @param {Object} immunization - Immunization resource
 * @returns {string} Site information
 */
function extractSite(immunization) {
  if (!immunization.site) {
    return '';
  }
  
  return immunization.site.text || 
         immunization.site.coding?.[0]?.display ||
         '';
}

/**
 * Extract route information
 * @param {Object} immunization - Immunization resource
 * @returns {string} Route information
 */
function extractRoute(immunization) {
  if (!immunization.route) {
    return '';
  }
  
  return immunization.route.text || 
         immunization.route.coding?.[0]?.display ||
         '';
}

/**
 * Get immunization data with retry mechanism
 * @param {Object} client - Authenticated FHIR client
 * @param {string} patientId - Patient ID to query for
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of immunization resources
 */
export async function getImmunizationDataWithRetry(client, patientId, options = {}) {
  const retryOptions = {
    maxRetries: 3,
    delay: 1000,
    backoff: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    retryCondition: (error) => {
      return (
        (error.type && error.type.includes('NETWORK')) ||
        (error.details && error.details.status && [408, 429, 500, 502, 503, 504].includes(error.details.status))
      );
    },
    onRetry: (attempt, error) => {
      console.warn(`Retry attempt ${attempt} for immunization query:`, error.message || error);
      return `Retrying connection to FHIR server (attempt ${attempt} of 3)...`;
    },
    onFailure: (error) => {
      if (error.type) {
        error.details = { ...error.details, retriesAttempted: 3 };
        return error;
      }
      
      return createError(
        NetworkError.MAX_RETRIES_EXCEEDED,
        'Failed to connect to FHIR server after multiple attempts',
        {
          originalError: error,
          retriesAttempted: 3,
          help: 'The server may be temporarily unavailable. Please try again later.'
        }
      );
    }
  };

  try {
    return await retryOperation(
      () => getImmunizationData(client, patientId, options),
      { ...retryOptions, ...options }
    );
  } catch (error) {
    if (error.type) {
      throw error;
    }
    
    throw createError(
      FhirServerError.DATA_RETRIEVAL_FAILED,
      'Failed to retrieve immunization data after multiple attempts',
      {
        originalError: error,
        patientId,
        help: 'Please try again later. If the problem persists, contact support.'
      }
    );
  }
}
