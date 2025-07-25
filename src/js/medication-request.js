/**
 * Medication Request Module
 * 
 * This module provides functionality for retrieving and processing MedicationRequest resources
 * from a FHIR server, specifically focusing on active medication requests.
 */

import { createError, retryOperation } from './error-handler.js';
import { FhirServerError, NetworkError } from './fhir-client.js';

/**
 * Get medication request data for a specific patient
 * @param {Object} client - Authenticated FHIR client
 * @param {string} patientId - Patient ID to query for
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of medication request resources
 */
export async function getMedicationRequestData(client, patientId, options = {}) {
  const {
    status = 'active',
    includeReferences = ['medication', 'requester'],
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
        { help: 'A valid patient ID is required to retrieve medication request information.' }
      );
    }

    console.log(`Retrieving medication request data for patient: ${patientId}`);

    // Build the query URL
    const queryParams = new URLSearchParams({
      patient: patientId,
      status: status,
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

    return processMedicationRequestResponse(response);
  } catch (error) {
    console.error('Error retrieving medication request data:', error);
    
    // If the error is already a structured error object, pass it through
    if (error.type) {
      throw error;
    }
    
    // Otherwise, create a structured error
    throw createError(
      FhirServerError.DATA_RETRIEVAL_FAILED,
      'Failed to retrieve medication request data',
      {
        originalError: error,
        patientId,
        help: 'Please try again later. If the problem persists, contact support.'
      }
    );
  }
}

/**
 * Process FHIR response and extract medication request resources
 * @param {Object} response - FHIR response bundle
 * @returns {Array} Array of medication request resources
 */
export function processMedicationRequestResponse(response) {
  try {
    if (!response) {
      return [];
    }
    
    // Handle both bundle and direct array responses
    if (response.entry && Array.isArray(response.entry)) {
      return response.entry
        .filter(entry => entry.resource && entry.resource.resourceType === 'MedicationRequest')
        .map(entry => normalizeMedicationRequestData(entry.resource));
    } else if (Array.isArray(response)) {
      return response
        .filter(resource => resource && resource.resourceType === 'MedicationRequest')
        .map(resource => normalizeMedicationRequestData(resource));
    }
    
    return [];
  } catch (error) {
    console.error('Error processing medication request response:', error);
    throw createError(
      FhirServerError.DATA_PROCESSING_FAILED,
      'Failed to process medication request data',
      {
        originalError: error,
        help: 'The server response may be in an unexpected format.'
      }
    );
  }
}

/**
 * Normalize medication request data for consistent display
 * @param {Object} medicationRequest - Medication request resource
 * @returns {Object} Normalized medication request data
 */
export function normalizeMedicationRequestData(medicationRequest) {
  try {
    if (!medicationRequest) {
      throw new Error('Invalid medication request resource');
    }

    return {
      id: medicationRequest.id || '',
      resourceType: medicationRequest.resourceType || 'MedicationRequest',
      status: medicationRequest.status || 'unknown',
      intent: medicationRequest.intent || 'unknown',
      priority: medicationRequest.priority || 'routine',
      medicationDisplay: extractMedicationDisplay(medicationRequest),
      authoredOn: medicationRequest.authoredOn || '',
      dosageInstructions: extractDosageInstructions(medicationRequest),
      requester: extractRequesterInfo(medicationRequest),
      note: extractNotes(medicationRequest.note),
      rawResource: medicationRequest
    };
  } catch (error) {
    console.error('Error normalizing medication request data:', error);
    return {
      id: medicationRequest?.id || 'unknown',
      resourceType: 'MedicationRequest',
      status: 'unknown',
      error: 'Error processing medication request data'
    };
  }
}

/**
 * Extract medication display name
 * @param {Object} medicationRequest - Medication request resource
 * @returns {string} Medication display name
 */
function extractMedicationDisplay(medicationRequest) {
  if (medicationRequest.medicationReference) {
    return medicationRequest.medicationReference.display || 'Unknown Medication';
  }
  
  if (medicationRequest.medicationCodeableConcept) {
    return medicationRequest.medicationCodeableConcept.text || 
           medicationRequest.medicationCodeableConcept.coding?.[0]?.display ||
           'Unknown Medication';
  }
  
  return 'Unknown Medication';
}

/**
 * Extract dosage instructions
 * @param {Object} medicationRequest - Medication request resource
 * @returns {Array} Dosage instructions
 */
function extractDosageInstructions(medicationRequest) {
  if (!medicationRequest.dosageInstruction || !Array.isArray(medicationRequest.dosageInstruction)) {
    return [];
  }
  
  return medicationRequest.dosageInstruction.map(dosage => {
    const instruction = {
      text: dosage.text || '',
      timing: dosage.timing ? extractTiming(dosage.timing) : '',
      route: dosage.route ? (dosage.route.text || dosage.route.coding?.[0]?.display || '') : '',
      doseQuantity: dosage.doseQuantity ? extractDoseQuantity(dosage.doseQuantity) : '',
      asNeeded: dosage.asNeeded === true ? 'As needed' : 
               (dosage.asNeededCodeableConcept ? dosage.asNeededCodeableConcept.text || '' : ''),
      patientInstruction: dosage.patientInstruction || ''
    };
    
    // Create a formatted string for display
    instruction.display = formatDosageInstruction(instruction);
    
    return instruction;
  });
}

/**
 * Extract timing information
 * @param {Object} timing - Timing object
 * @returns {string} Formatted timing string
 */
function extractTiming(timing) {
  if (!timing) return '';
  
  if (timing.code && timing.code.text) {
    return timing.code.text;
  }
  
  if (timing.repeat) {
    const repeat = timing.repeat;
    let timingStr = '';
    
    if (repeat.frequency && repeat.period) {
      timingStr += `${repeat.frequency} time(s) per ${repeat.period} ${repeat.periodUnit || ''}`;
    }
    
    if (repeat.when && Array.isArray(repeat.when)) {
      if (timingStr) timingStr += ', ';
      timingStr += repeat.when.join(', ');
    }
    
    return timingStr || '';
  }
  
  return '';
}

/**
 * Extract dose quantity
 * @param {Object} doseQuantity - Dose quantity object
 * @returns {string} Formatted dose quantity string
 */
function extractDoseQuantity(doseQuantity) {
  if (!doseQuantity) return '';
  
  const value = doseQuantity.value || '';
  const unit = doseQuantity.unit || doseQuantity.code || '';
  
  if (value && unit) {
    return `${value} ${unit}`;
  } else if (value) {
    return `${value}`;
  }
  
  return '';
}

/**
 * Format dosage instruction for display
 * @param {Object} instruction - Normalized dosage instruction
 * @returns {string} Formatted dosage instruction
 */
function formatDosageInstruction(instruction) {
  // If there's a text representation, prefer that
  if (instruction.text) {
    return instruction.text;
  }
  
  // Otherwise build from components
  const parts = [];
  
  if (instruction.doseQuantity) {
    parts.push(instruction.doseQuantity);
  }
  
  if (instruction.route) {
    parts.push(`via ${instruction.route}`);
  }
  
  if (instruction.timing) {
    parts.push(instruction.timing);
  }
  
  if (instruction.asNeeded) {
    parts.push(instruction.asNeeded);
  }
  
  if (instruction.patientInstruction) {
    parts.push(`(${instruction.patientInstruction})`);
  }
  
  return parts.join(' ');
}

/**
 * Extract requester information
 * @param {Object} medicationRequest - Medication request resource
 * @returns {Object} Requester information
 */
function extractRequesterInfo(medicationRequest) {
  if (!medicationRequest.requester) {
    return { display: 'Unknown prescriber' };
  }
  
  return {
    reference: medicationRequest.requester.reference || '',
    display: medicationRequest.requester.display || 'Unnamed prescriber',
    type: medicationRequest.requester.type || ''
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
  
  return notes.map(note => note.text || '').filter(text => text).join('; ');
}

/**
 * Get medication request data with retry mechanism
 * @param {Object} client - Authenticated FHIR client
 * @param {string} patientId - Patient ID to query for
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of medication request resources
 */
export async function getMedicationRequestDataWithRetry(client, patientId, options = {}) {
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
      console.warn(`Retry attempt ${attempt} for medication request query:`, error.message || error);
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
      () => getMedicationRequestData(client, patientId, options),
      { ...retryOptions, ...options }
    );
  } catch (error) {
    if (error.type) {
      throw error;
    }
    
    throw createError(
      FhirServerError.DATA_RETRIEVAL_FAILED,
      'Failed to retrieve medication request data after multiple attempts',
      {
        originalError: error,
        patientId,
        help: 'Please try again later. If the problem persists, contact support.'
      }
    );
  }
}
