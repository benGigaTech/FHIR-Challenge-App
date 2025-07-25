/**
 * Patient Context Module
 * Extracts and manages patient context from SMART launch parameters
 */

/**
 * Extract patient context from the authenticated FHIR client
 * @param {Object} client - The authenticated FHIR client instance
 * @returns {Promise<Object>} Patient context object with id and resource
 * @throws {Error} When patient context cannot be retrieved
 */
const getPatientContext = async (client) => {
  try {
    // Validate client parameter
    if (!client || typeof client.patient?.read !== 'function') {
      throw new Error('Invalid FHIR client provided');
    }

    // Get patient ID from the FHIR client context
    const patientId = client.patient.id;
    
    if (!patientId) {
      throw new Error('Patient ID not found in client context');
    }

    // Retrieve basic patient information
    const patient = await client.patient.read();
    
    console.log('Patient context retrieved:', {
      id: patientId,
      name: patient.name?.[0]?.text || 'Unknown',
      birthDate: patient.birthDate
    });

    return {
      id: patientId,
      resource: patient
    };
  } catch (error) {
    console.error('Error retrieving patient context:', error);
    throw error;
  }
};

/**
 * Validate patient context object
 * @param {Object} patientContext - The patient context to validate
 * @returns {boolean} True if valid, false otherwise
 */
const validatePatientContext = (patientContext) => {
  return (
    patientContext &&
    typeof patientContext === 'object' &&
    patientContext.id &&
    patientContext.resource &&
    typeof patientContext.resource === 'object'
  );
};

/**
 * Format patient display information
 * @param {Object} patient - The patient FHIR resource
 * @returns {Object} Formatted patient information
 */
const formatPatientDisplay = (patient) => {
  if (!patient) return null;

  const name = patient.name?.[0];
  const displayName = name ? 
    (name.text || `${name.given?.join(' ')} ${name.family || ''}`.trim()) : 
    'Unknown Patient';

  return {
    id: patient.id,
    name: displayName,
    gender: patient.gender,
    birthDate: patient.birthDate,
    mrn: patient.identifier?.find(id => id.system?.includes('MRN'))?.value
  };
};

export { getPatientContext, validatePatientContext, formatPatientDisplay };
