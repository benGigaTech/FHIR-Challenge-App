/**
 * Patient Banner Component
 * Displays patient information in a consistent banner format
 */

import { formatPatientDisplay } from '../patient-context.js';

/**
 * Create a patient banner DOM element
 * @param {Object} patientContext - Patient context object
 * @returns {HTMLElement} Patient banner element
 */
export function createPatientBanner(patientContext) {
  const banner = document.createElement('div');
  banner.className = 'patient-banner';
  banner.id = 'patient-banner-content';

  if (!patientContext || !patientContext.resource) {
    banner.innerHTML = `
      <div class="alert alert-warning">
        <strong>Patient information not available</strong>
      </div>
    `;
    return banner;
  }

  const patient = formatPatientDisplay(patientContext.resource);
  
  banner.innerHTML = `
    <div class="patient-info">
      <h4>Patient: ${patient.name}</h4>
      <div class="patient-details">
        <span><strong>ID:</strong> ${patient.id}</span>
        ${patient.gender ? `<span><strong>Gender:</strong> ${patient.gender}</span>` : ''}
        ${patient.birthDate ? `<span><strong>DOB:</strong> ${patient.birthDate}</span>` : ''}
        ${patient.mrn ? `<span><strong>MRN:</strong> ${patient.mrn}</span>` : ''}
      </div>
    </div>
  `;

  return banner;
}

/**
 * Update patient banner with new patient context
 * @param {HTMLElement} banner - Patient banner element
 * @param {Object} patientContext - New patient context
 */
export function updatePatientBanner(banner, patientContext) {
  if (!banner) return;

  const newBanner = createPatientBanner(patientContext);
  banner.innerHTML = newBanner.innerHTML;
}

/**
 * Style definitions for patient banner
 */
export const patientBannerStyles = `
  .patient-banner {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .patient-info h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.2rem;
  }

  .patient-details {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    font-size: 0.9rem;
  }

  .patient-details span {
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    .patient-details {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
`;
