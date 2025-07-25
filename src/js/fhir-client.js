import { createError, retryOperation, DataError } from './error-handler.js';

/**
 * Error types for FHIR server interactions
 */
export const FhirServerError = {
  INVALID_CLIENT: 'INVALID_FHIR_CLIENT',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
  DATA_RETRIEVAL_FAILED: 'DATA_RETRIEVAL_FAILED',
  UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Error types for network issues
 */
export const NetworkError = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED'
};

/**
 * Get allergy data for a specific patient
 * @param {Object} client - Authenticated FHIR client
 * @param {string} patientId - Patient ID to query for
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of allergy resources
 */
export async function getAllergyData(client, patientId, options = {}) {
  const {
    includeReferences = ['patient', 'asserter'],
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
        { help: 'A valid patient ID is required to retrieve allergy information.' }
      );
    }

    console.log(`Retrieving allergy data for patient: ${patientId}`);

    // Build the query URL
    const queryParams = new URLSearchParams({
      patient: patientId,
      _sort: sortOrder,
      _count: Math.min(maxResults, 100) // FHIR servers typically limit to 100 per page
    });

    const url = `AllergyIntolerance?${queryParams.toString()}`;

    // Make the FHIR request
    const response = await client.request(url, {
      resolveReferences: includeReferences,
      pageLimit: pageLimit,
      flat: true
    });

    console.log('Allergy data retrieved successfully:', {
      patientId,
      totalResults: response?.entry?.length || 0,
      url
    });

    const processedResponse = processAllergyResponse(response);
  
  // Validate and normalize the response
  return validateAndNormalizeResponse(processedResponse);

  } catch (error) {
    console.error('Error retrieving allergy data:', error);
    
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
        'Allergy resources not found',
        { 
          originalError: error,
          help: 'The requested allergy information could not be found for this patient.',
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
        `Error retrieving allergy data: ${error.message || 'Unknown error'}`,
        { 
          originalError: error,
          help: 'An unexpected error occurred while retrieving allergy data. Please try again.'
        }
      );
    }
  }
}

/**
 * Process FHIR response and extract allergy resources
 * @param {Object} response - FHIR response bundle
 * @returns {Array} Array of allergy resources
 */
function processAllergyResponse(response) {
  if (!response) {
    console.log('Empty response received from FHIR server');
    throw createError(
      DataError.EMPTY_RESPONSE,
      'Empty response received from FHIR server',
      { help: 'The FHIR server returned an empty response. This may indicate a server issue.' }
    );
  }

  // Handle different response formats
  if (Array.isArray(response)) {
    console.log(`Direct array response with ${response.length} allergies`);
    return response;
  }

  if (response.entry && Array.isArray(response.entry)) {
    const resources = response.entry.map(entry => entry.resource).filter(Boolean);
    console.log(`Bundle response with ${resources.length} allergies`);
    return resources;
  }

  if (response.resourceType === 'Bundle' && response.entry) {
    const resources = response.entry.map(entry => entry.resource).filter(Boolean);
    console.log(`FHIR Bundle with ${resources.length} allergies`);
    return resources;
  }

  // Handle empty bundle case
  if (response.resourceType === 'Bundle' && (!response.entry || response.entry.length === 0)) {
    console.log('Empty FHIR Bundle received - no allergies found');
    return [];
  }

  // If we get here with an unrecognized format, log and return empty array
  // but don't throw an error as this might just be a case of no allergies
  console.log('Unexpected response format:', response);
  return [];
}

/**
 * Get allergy data with pagination support
 * @param {Object} client - Authenticated FHIR client
 * @param {string} patientId - Patient ID to query for
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of allergy resources
 */
export async function getAllergyDataPaginated(client, patientId, options = {}) {
  const {
    maxPages = 10,
    pageSize = 100,
    ...queryOptions
  } = options;

  let allAllergies = [];
  let currentPage = 0;
  let hasMorePages = true;
  let nextUrl = null;

  try {
    // Initial query
    let response = await getAllergyData(client, patientId, {
      ...queryOptions,
      pageLimit: 1 // Start with first page
    });

    // Handle case where response is already flattened
    if (Array.isArray(response)) {
      return response.slice(0, maxPages * pageSize);
    }

    // Handle paginated response
    allAllergies = response;
    currentPage++;

    // Check for pagination links
    while (hasMorePages && currentPage < maxPages) {
      const link = response.link?.find(l => l.relation === 'next');
      if (link && link.url) {
        response = await client.request(link.url, {
          resolveReferences: queryOptions.includeReferences || ['patient', 'asserter'],
          flat: true
        });
        
        const pageAllergies = processAllergyResponse(response);
        allAllergies = allAllergies.concat(pageAllergies);
        currentPage++;
      } else {
        hasMorePages = false;
      }
    }

    return allAllergies;

  } catch (error) {
    console.error('Error in paginated allergy query:', error);
    throw error;
  }
}

/**
 * Validate and normalize FHIR response
 * @param {Array} allergies - Array of allergy resources
 * @returns {Array} Validated and normalized allergy data
 */
function validateAndNormalizeResponse(allergies) {
  if (!Array.isArray(allergies)) {
    console.error('Invalid allergies data format:', allergies);
    throw createError(
      DataError.INVALID_FORMAT,
      'Invalid allergies data format received',
      { 
        help: 'The data returned from the FHIR server was not in the expected format.',
        receivedType: typeof allergies
      }
    );
  }

  if (allergies.length === 0) {
    console.log('No allergies found for patient');
    return [];
  }

  console.log(`Processing ${allergies.length} allergy resources`);

  const validAllergies = [];
  const invalidAllergies = [];

  allergies.forEach((allergy, index) => {
    const validation = validateAllergyResource(allergy);
    
    if (validation.valid) {
      validAllergies.push(allergy);
    } else {
      invalidAllergies.push({
        index,
        errors: validation.errors,
        warnings: validation.warnings,
        resource: allergy
      });
    }
  });

  if (invalidAllergies.length > 0) {
    console.warn('Invalid allergy resources found:', invalidAllergies.length);
    console.warn('Invalid resources:', invalidAllergies);
  }

  console.log(`Validated ${validAllergies.length} out of ${allergies.length} allergy resources`);
  return validAllergies;
}

/**
 * Validate allergy resource structure (FHIR R4 compliance)
 * @param {Object} allergy - Allergy resource to validate
 * @returns {Object} Validation result
 */
export function validateAllergyResource(allergy) {
  const errors = [];
  const warnings = [];
  const info = [];

  if (!allergy) {
    errors.push('Allergy resource is null or undefined');
    return { valid: false, errors, warnings, info };
  }

  // FHIR R4 validation according to latest standards
  if (allergy.resourceType !== 'AllergyIntolerance') {
    errors.push(`Invalid resource type: ${allergy.resourceType}. Expected: AllergyIntolerance`);
  }

  // Required fields per FHIR R4 specification
  if (!allergy.id) {
    warnings.push('AllergyIntolerance resource missing recommended id field');
  }

  // Patient reference is required per FHIR R4
  if (!allergy.patient) {
    errors.push('AllergyIntolerance.patient is required per FHIR R4 specification');
  } else {
    // Validate patient reference format
    const patientRef = allergy.patient.reference || allergy.patient.id;
    if (!patientRef) {
      warnings.push('AllergyIntolerance.patient should have valid reference format');
    }
  }

  // Clinical status validation per FHIR R4 ValueSet
  if (allergy.clinicalStatus) {
    const validClinicalStatuses = ['active', 'inactive', 'resolved'];
    const status = allergy.clinicalStatus?.coding?.[0]?.code || allergy.clinicalStatus?.text;
    if (status && !validClinicalStatuses.includes(status.toLowerCase())) {
      warnings.push(`Invalid clinicalStatus: ${status}. Expected values: ${validClinicalStatuses.join(', ')}`);
    }
  }

  // Verification status validation per FHIR R4 ValueSet
  if (allergy.verificationStatus) {
    const validVerificationStatuses = ['unconfirmed', 'confirmed', 'refuted', 'entered-in-error'];
    const status = allergy.verificationStatus?.coding?.[0]?.code || allergy.verificationStatus?.text;
    if (status && !validVerificationStatuses.includes(status.toLowerCase())) {
      warnings.push(`Invalid verificationStatus: ${status}. Expected values: ${validVerificationStatuses.join(', ')}`);
    }
  }

  // Criticality validation per FHIR R4 ValueSet
  if (allergy.criticality) {
    const validCriticalities = ['low', 'high', 'unable-to-assess'];
    if (!validCriticalities.includes(allergy.criticality.toLowerCase())) {
      warnings.push(`Invalid criticality: ${allergy.criticality}. Expected values: ${validCriticalities.join(', ')}`);
    }
  }

  // Code validation - either code or substance is required
  if (!allergy.code) {
    warnings.push('AllergyIntolerance.code is recommended for meaningful allergy data');
  } else {
    // Validate code structure per FHIR R4
    const hasCoding = allergy.code.coding && Array.isArray(allergy.code.coding) && allergy.code.coding.length > 0;
    const hasText = allergy.code.text;
    
    if (!hasCoding && !hasText) {
      warnings.push('AllergyIntolerance.code should contain either coding array or text field');
    }
    
    if (hasCoding) {
      allergy.code.coding.forEach((coding, index) => {
        if (!coding.system && !coding.code && !coding.display) {
          warnings.push(`AllergyIntolerance.code.coding[${index}] should have at least system, code, or display`);
        }
      });
    }
  }

  // Type validation - required per FHIR R4
  if (!allergy.type) {
    warnings.push('AllergyIntolerance.type is recommended (allergy or intolerance)');
  } else {
    const validTypes = ['allergy', 'intolerance'];
    if (!validTypes.includes(allergy.type.toLowerCase())) {
      warnings.push(`Invalid type: ${allergy.type}. Expected values: ${validTypes.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
    resource: allergy,
    fhirVersion: 'R4',
    validationTimestamp: new Date().toISOString()
  };
}

/**
 * Normalize allergy data for consistent display per FHIR R4 standards
 * @param {Array} allergies - Array of allergy resources
 * @returns {Array} Normalized allergy data
 */
export function normalizeAllergyData(allergies) {
  if (!Array.isArray(allergies)) {
    console.log('normalizeAllergyData received non-array input:', typeof allergies);
    return [];
  }

  if (allergies.length === 0) {
    console.log('normalizeAllergyData received empty array');
    return [];
  }

  return allergies.map((allergy, index) => {
    try {
      // Extract substance information with fallback hierarchy
      const substance = extractSubstanceInfo(allergy);
      
      // Normalize reactions per FHIR R4 structure
      const reactions = normalizeReactions(allergy.reaction);
      
      // Normalize clinical status per FHIR R4 ValueSet
      const clinicalStatus = normalizeStatus(allergy.clinicalStatus, 'clinical');
      
      // Normalize verification status per FHIR R4 ValueSet
      const verificationStatus = normalizeStatus(allergy.verificationStatus, 'verification');
      
      return {
        id: allergy.id || `allergy-${index}`,
        resourceType: 'AllergyIntolerance',
        
        // FHIR R4 required fields
        patient: normalizeReference(allergy.patient),
        
        // Code information (substance/allergen)
        code: {
          text: allergy.code?.text,
          coding: normalizeCoding(allergy.code?.coding),
          display: extractDisplayText(allergy.code)
        },
        
        // Clinical information
        clinicalStatus: clinicalStatus,
        verificationStatus: verificationStatus,
        
        // Type classification
        type: allergy.type || 'allergy', // allergy or intolerance
        
        // Criticality assessment
        criticality: normalizeCriticality(allergy.criticality),
        
        // Category classification
        category: normalizeCategory(allergy.category),
        
        // Substance information
        substance: substance,
        
        // Reaction details
        reactions: reactions,
        
        // Metadata
        recordedDate: allergy.recordedDate,
        recorder: normalizeReference(allergy.recorder),
        asserter: normalizeReference(allergy.asserter),
        
        // Notes
        note: normalizeNotes(allergy.note),
        
        // FHIR compliance metadata
        fhirVersion: 'R4',
        normalizedTimestamp: new Date().toISOString(),
        
        // Original resource reference
        originalResource: allergy
      };
    } catch (error) {
      console.error('Error normalizing allergy data:', error, allergy);
      return {
        id: `error-${index}`,
        resourceType: 'AllergyIntolerance',
        code: { text: 'Error processing allergy' },
        clinicalStatus: 'unknown',
        verificationStatus: 'unknown',
        criticality: 'unable-to-assess',
        substance: { text: 'Error processing allergy' },
        reactions: [],
        patient: 'Unknown',
        recordedDate: null,
        error: error.message,
        fhirVersion: 'R4',
        normalizedTimestamp: new Date().toISOString()
      };
    }
  });
}

/**
 * Extract substance information with fallback hierarchy
 */
function extractSubstanceInfo(allergy) {
  if (!allergy.code) {
    return { text: 'Unknown substance' };
  }

  // Priority: display text > coding display > coding code
  const text = allergy.code.text;
  const coding = allergy.code.coding?.[0];
  
  return {
    text: text || coding?.display || coding?.code || 'Unknown substance',
    coding: coding ? [{
      system: coding.system,
      code: coding.code,
      display: coding.display
    }] : []
  };
}

/**
 * Normalize status fields per FHIR R4 ValueSets
 */
function normalizeStatus(statusObj, type) {
  if (!statusObj) return 'unknown';
  
  const value = statusObj.coding?.[0]?.code || statusObj.text;
  if (!value) return 'unknown';
  
  const normalized = value.toLowerCase();
  
  if (type === 'clinical') {
    const valid = ['active', 'inactive', 'resolved'];
    return valid.includes(normalized) ? normalized : 'unknown';
  }
  
  if (type === 'verification') {
    const valid = ['unconfirmed', 'confirmed', 'refuted', 'entered-in-error'];
    return valid.includes(normalized) ? normalized : 'unknown';
  }
  
  return normalized;
}

/**
 * Normalize criticality per FHIR R4 ValueSet
 */
function normalizeCriticality(criticality) {
  if (!criticality) return 'unable-to-assess';
  
  const valid = ['low', 'high', 'unable-to-assess'];
  return valid.includes(criticality.toLowerCase()) ? criticality.toLowerCase() : 'unable-to-assess';
}

/**
 * Normalize category per FHIR R4 ValueSet
 */
function normalizeCategory(category) {
  if (!category) return 'unknown';
  
  const valid = ['food', 'medication', 'environment', 'biologic'];
  
  if (Array.isArray(category)) {
    return category.filter(c => valid.includes(c.toLowerCase()));
  }
  
  return valid.includes(category.toLowerCase()) ? category.toLowerCase() : 'unknown';
}

/**
 * Normalize reactions per FHIR R4 structure
 */
function normalizeReactions(reactions) {
  if (!Array.isArray(reactions) || reactions.length === 0) {
    return [];
  }

  return reactions.map((reaction, index) => {
    return {
      id: reaction.id || `reaction-${index}`,
      substance: extractSubstanceInfo(reaction.substance),
      manifestation: normalizeManifestations(reaction.manifestation),
      severity: normalizeSeverity(reaction.severity),
      description: reaction.description,
      onset: reaction.onset,
      note: normalizeNotes(reaction.note)
    };
  });
}

/**
 * Normalize manifestations per FHIR R4 structure
 */
function normalizeManifestations(manifestations) {
  if (!Array.isArray(manifestations) || manifestations.length === 0) {
    return [];
  }

  return manifestations.map(manifest => {
    return {
      text: manifest.text,
      coding: normalizeCoding(manifest.coding),
      display: extractDisplayText(manifest)
    };
  });
}

/**
 * Normalize coding arrays
 */
function normalizeCoding(coding) {
  if (!Array.isArray(coding)) return [];
  
  return coding.map(c => ({
    system: c.system,
    code: c.code,
    display: c.display
  })).filter(c => c.system || c.code || c.display);
}

/**
 * Normalize severity per FHIR R4 ValueSet
 */
function normalizeSeverity(severity) {
  if (!severity) return 'mild';
  
  const valid = ['mild', 'moderate', 'severe'];
  return valid.includes(severity.toLowerCase()) ? severity.toLowerCase() : 'mild';
}

/**
 * Normalize reference fields
 */
function normalizeReference(reference) {
  if (!reference) return null;
  
  if (typeof reference === 'string') {
    return { reference: reference };
  }
  
  return {
    reference: reference.reference,
    display: reference.display,
    type: reference.type
  };
}

/**
 * Normalize notes
 */
function normalizeNotes(notes) {
  if (!notes) return [];
  
  if (Array.isArray(notes)) {
    return notes.map(note => ({
      text: note.text,
      author: normalizeReference(note.author),
      time: note.time
    }));
  }
  
  if (typeof notes === 'string') {
    return [{ text: notes }];
  }
  
  return [];
}

/**
 * Extract display text with fallback
 */
function extractDisplayText(code) {
  if (!code) return 'Unknown';
  
  return code.text || 
         code.coding?.[0]?.display || 
         code.coding?.[0]?.code || 
         'Unknown';
}

/**
 * Get allergy data with retry mechanism
 * @param {Object} client - Authenticated FHIR client
 * @param {string} patientId - Patient ID to query for
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of allergy resources
 */
export async function getAllergyDataWithRetry(client, patientId, options = {}) {
  const retryOptions = {
    maxRetries: 3,
    delay: 1000,
    backoff: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504], // Retry on these HTTP status codes
    retryCondition: (error) => {
      // Retry on network errors or specific FHIR server errors
      return (
        (error.type && error.type.includes('NETWORK')) ||
        (error.details && error.details.status && [408, 429, 500, 502, 503, 504].includes(error.details.status))
      );
    },
    onRetry: (attempt, error) => {
      console.warn(`Retry attempt ${attempt} for allergy query:`, error.message || error);
      // Return a user-friendly message about the retry
      return `Retrying connection to FHIR server (attempt ${attempt} of 3)...`;
    },
    onFailure: (error) => {
      // Format the final error after all retries have failed
      if (error.type) {
        // If it's already a structured error, add retry information
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
      () => getAllergyData(client, patientId, options),
      { ...retryOptions, ...options }
    );
  } catch (error) {
    // If it's already a structured error, throw it as is
    if (error.type) {
      throw error;
    }
    
    // Otherwise, create a structured error
    throw createError(
      FhirServerError.DATA_RETRIEVAL_FAILED,
      'Failed to retrieve allergy data after multiple attempts',
      {
        originalError: error,
        patientId,
        help: 'Please try again later. If the problem persists, contact support.'
      }
    );
  }
}
