/**
 * Medication Request Module Tests
 * 
 * Unit tests for the medication-request.js module functionality
 */

import { 
  getMedicationRequestData,
  processMedicationRequestResponse,
  normalizeMedicationRequestData,
  getMedicationRequestDataWithRetry
} from '../medication-request.js';

import { createError } from '../error-handler.js';
import { FhirServerError } from '../fhir-client.js';

/**
 * Mock data for testing
 */
const mockMedicationRequest = {
  resourceType: 'MedicationRequest',
  id: 'med-request-123',
  status: 'active',
  intent: 'order',
  medicationCodeableConcept: {
    coding: [
      {
        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        code: '1234',
        display: 'Ibuprofen 200mg'
      }
    ],
    text: 'Ibuprofen 200mg'
  },
  subject: {
    reference: 'Patient/patient-123'
  },
  authoredOn: '2023-01-15',
  requester: {
    reference: 'Practitioner/pract-456',
    display: 'Dr. Smith'
  },
  dosageInstruction: [
    {
      text: 'Take 1 tablet by mouth every 6 hours as needed for pain',
      timing: {
        repeat: {
          frequency: 1,
          period: 6,
          periodUnit: 'h'
        }
      },
      route: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '26643006',
            display: 'Oral route'
          }
        ],
        text: 'Oral'
      },
      doseQuantity: {
        value: 1,
        unit: 'tablet',
        system: 'http://unitsofmeasure.org',
        code: 'TAB'
      },
      asNeeded: true
    }
  ],
  note: [
    {
      text: 'Patient has reported good response to this medication in the past'
    }
  ]
};

const mockBundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 1,
  entry: [
    {
      resource: mockMedicationRequest
    }
  ]
};

/**
 * Test suite for medication request module
 */
describe('Medication Request Module', () => {
  
  /**
   * Tests for processMedicationRequestResponse function
   */
  describe('processMedicationRequestResponse', () => {
    test('should process a bundle with medication requests', () => {
      const result = processMedicationRequestResponse(mockBundle);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('med-request-123');
      expect(result[0].medicationDisplay).toBe('Ibuprofen 200mg');
    });

    test('should handle an empty bundle', () => {
      const emptyBundle = { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] };
      const result = processMedicationRequestResponse(emptyBundle);
      expect(result).toHaveLength(0);
    });

    test('should handle a null response', () => {
      const result = processMedicationRequestResponse(null);
      expect(result).toHaveLength(0);
    });

    test('should handle an array of resources', () => {
      const resourceArray = [mockMedicationRequest];
      const result = processMedicationRequestResponse(resourceArray);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('med-request-123');
    });
  });

  /**
   * Tests for normalizeMedicationRequestData function
   */
  describe('normalizeMedicationRequestData', () => {
    test('should normalize medication request data', () => {
      const result = normalizeMedicationRequestData(mockMedicationRequest);
      
      expect(result.id).toBe('med-request-123');
      expect(result.status).toBe('active');
      expect(result.intent).toBe('order');
      expect(result.medicationDisplay).toBe('Ibuprofen 200mg');
      expect(result.authoredOn).toBe('2023-01-15');
      expect(result.requester.display).toBe('Dr. Smith');
      expect(result.dosageInstructions).toHaveLength(1);
      expect(result.note).toBe('Patient has reported good response to this medication in the past');
    });

    test('should handle missing medication reference/codeable concept', () => {
      const noMedication = { ...mockMedicationRequest };
      delete noMedication.medicationCodeableConcept;
      
      const result = normalizeMedicationRequestData(noMedication);
      expect(result.medicationDisplay).toBe('Unknown Medication');
    });

    test('should handle missing dosage instructions', () => {
      const noDosage = { ...mockMedicationRequest };
      delete noDosage.dosageInstruction;
      
      const result = normalizeMedicationRequestData(noDosage);
      expect(result.dosageInstructions).toHaveLength(0);
    });

    test('should handle missing requester', () => {
      const noRequester = { ...mockMedicationRequest };
      delete noRequester.requester;
      
      const result = normalizeMedicationRequestData(noRequester);
      expect(result.requester.display).toBe('Unknown prescriber');
    });

    test('should handle null input', () => {
      const result = normalizeMedicationRequestData(null);
      expect(result.status).toBe('unknown');
      expect(result.error).toBe('Error processing medication request data');
    });
  });

  /**
   * Tests for getMedicationRequestData function
   */
  describe('getMedicationRequestData', () => {
    // Mock FHIR client
    const mockClient = {
      request: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should throw error for invalid client', async () => {
      await expect(getMedicationRequestData(null, 'patient-123'))
        .rejects
        .toHaveProperty('type', FhirServerError.INVALID_CLIENT);
    });

    test('should throw error for missing patient ID', async () => {
      await expect(getMedicationRequestData(mockClient, null))
        .rejects
        .toHaveProperty('type', FhirServerError.MISSING_PARAMETER);
    });

    test('should fetch medication request data successfully', async () => {
      mockClient.request.mockResolvedValueOnce(mockBundle);
      
      const result = await getMedicationRequestData(mockClient, 'patient-123');
      
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.stringContaining('MedicationRequest?patient=patient-123'),
        expect.objectContaining({
          resolveReferences: ['medication', 'requester']
        })
      );
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('med-request-123');
    });

    test('should handle FHIR request errors', async () => {
      const error = new Error('FHIR server error');
      mockClient.request.mockRejectedValueOnce(error);
      
      await expect(getMedicationRequestData(mockClient, 'patient-123'))
        .rejects
        .toHaveProperty('type', FhirServerError.DATA_RETRIEVAL_FAILED);
    });
  });

  /**
   * Tests for getMedicationRequestDataWithRetry function
   */
  describe('getMedicationRequestDataWithRetry', () => {
    // Mock FHIR client
    const mockClient = {
      request: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should retry on network errors', async () => {
      const networkError = createError(
        'NETWORK_ERROR',
        'Network error',
        { status: 503 }
      );
      
      mockClient.request.mockRejectedValueOnce(networkError);
      mockClient.request.mockResolvedValueOnce(mockBundle);
      
      // Mock the retryOperation function
      // This is a simplified test since we can't easily test the actual retry logic
      const result = await getMedicationRequestDataWithRetry(mockClient, 'patient-123');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('med-request-123');
    });
  });
});

/**
 * Integration test for medication request module with FHIR client
 */
describe('Medication Request Integration', () => {
  test('should integrate with FHIR client', async () => {
    // This test would normally be run in an environment with a FHIR client
    // For now, we'll just mock it
    
    const mockFhirClient = {
      request: jest.fn().mockResolvedValue(mockBundle)
    };
    
    const result = await getMedicationRequestData(mockFhirClient, 'patient-123');
    
    expect(result).toHaveLength(1);
    expect(result[0].medicationDisplay).toBe('Ibuprofen 200mg');
  });
});
