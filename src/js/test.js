/**
 * Test Module
 * 
 * This module provides testing utilities for the SMART on FHIR application
 * to validate functionality across different browsers.
 */

import { checkBrowserCompatibility } from './browser-compatibility.js?v=1';
import { isAuthenticated } from './auth.js?v=1';
import { searchResources } from './api.js?v=1';

/**
 * Run a suite of tests to validate application functionality
 * @returns {Promise<Object>} Test results object
 */
export async function runTests() {
  console.log('Running application tests...');
  const results = {
    browserCompatibility: { status: 'pending' },
    authentication: { status: 'pending' },
    patientContext: { status: 'pending' },
    allergyRetrieval: { status: 'pending' },
    timestamp: new Date().toISOString()
  };
  
  // Test 1: Browser compatibility
  try {
    const compatibility = checkBrowserCompatibility();
    results.browserCompatibility = {
      status: compatibility.isCompatible ? 'pass' : 'fail',
      details: compatibility
    };
    console.log('Browser compatibility:', results.browserCompatibility.status);
  } catch (error) {
    results.browserCompatibility = {
      status: 'error',
      error: error.message || 'Unknown error during compatibility check'
    };
    console.error('Browser compatibility test error:', error);
  }
  
  // Test 2: Authentication status
  try {
    const authenticated = isAuthenticated();
    results.authentication = {
      status: authenticated ? 'pass' : 'fail',
      details: { authenticated }
    };
    console.log('Authentication test:', results.authentication.status);
  } catch (error) {
    results.authentication = {
      status: 'error',
      error: error.message || 'Unknown error during authentication check'
    };
    console.error('Authentication test error:', error);
  }
  
  // Test 3: Patient context
  try {
    // This requires the FHIR client to be initialized
    if (window.FHIR && window.FHIR.oauth2) {
      const client = await FHIR.oauth2.ready();
      const patient = await client.patient.read();
      
      results.patientContext = {
        status: patient && patient.id ? 'pass' : 'fail',
        details: { 
          patientId: patient ? patient.id : null,
          hasPatientData: !!patient
        }
      };
      console.log('Patient context test:', results.patientContext.status);
      
      // Test 4: Allergy retrieval
      try {
        const patientId = patient.id;
        const allergies = await searchResources('AllergyIntolerance', { patient: patientId });
        
        results.allergyRetrieval = {
          status: allergies && allergies.entry ? 'pass' : 'fail',
          details: { 
            hasEntries: allergies && Array.isArray(allergies.entry),
            count: allergies && allergies.entry ? allergies.entry.length : 0
          }
        };
        console.log('Allergy retrieval test:', results.allergyRetrieval.status);
      } catch (allergyError) {
        results.allergyRetrieval = {
          status: 'error',
          error: allergyError.message || 'Unknown error during allergy retrieval'
        };
        console.error('Allergy retrieval test error:', allergyError);
      }
    } else {
      results.patientContext = {
        status: 'skip',
        details: { reason: 'FHIR client not initialized' }
      };
      results.allergyRetrieval = {
        status: 'skip',
        details: { reason: 'FHIR client not initialized' }
      };
      console.log('Patient context test: skipped (FHIR client not initialized)');
      console.log('Allergy retrieval test: skipped (FHIR client not initialized)');
    }
  } catch (error) {
    results.patientContext = {
      status: 'error',
      error: error.message || 'Unknown error during patient context check'
    };
    console.error('Patient context test error:', error);
    
    results.allergyRetrieval = {
      status: 'skip',
      details: { reason: 'Patient context test failed' }
    };
  }
  
  return results;
}

/**
 * Generate a test report HTML element
 * @param {Object} testResults - Results from runTests()
 * @returns {HTMLElement} Report element
 */
export function generateTestReport(testResults) {
  const reportElement = document.createElement('div');
  reportElement.className = 'test-report';
  reportElement.style.padding = '15px';
  reportElement.style.margin = '15px 0';
  reportElement.style.backgroundColor = '#f8f9fa';
  reportElement.style.border = '1px solid #dee2e6';
  reportElement.style.borderRadius = '4px';
  
  // Create report header
  const header = document.createElement('h3');
  header.textContent = 'Browser Compatibility Report';
  reportElement.appendChild(header);
  
  // Add timestamp
  const timestamp = document.createElement('p');
  timestamp.textContent = `Generated: ${new Date(testResults.timestamp).toLocaleString()}`;
  timestamp.style.fontSize = '0.8em';
  timestamp.style.color = '#6c757d';
  reportElement.appendChild(timestamp);
  
  // Add browser info
  if (testResults.browserCompatibility && testResults.browserCompatibility.details) {
    const browserInfo = testResults.browserCompatibility.details.browserInfo;
    const browserInfoElement = document.createElement('div');
    browserInfoElement.innerHTML = `
      <strong>Browser Information:</strong>
      <ul>
        <li>User Agent: ${browserInfo.userAgent}</li>
        <li>Vendor: ${browserInfo.vendor}</li>
        <li>Platform: ${browserInfo.platform}</li>
      </ul>
    `;
    reportElement.appendChild(browserInfoElement);
  }
  
  // Create results table
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.marginTop = '10px';
  
  // Add table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th style="text-align: left; padding: 8px; border-bottom: 2px solid #dee2e6;">Test</th>
      <th style="text-align: left; padding: 8px; border-bottom: 2px solid #dee2e6;">Status</th>
      <th style="text-align: left; padding: 8px; border-bottom: 2px solid #dee2e6;">Details</th>
    </tr>
  `;
  table.appendChild(thead);
  
  // Add table body
  const tbody = document.createElement('tbody');
  
  // Add browser compatibility row
  const compatRow = document.createElement('tr');
  const compatStatus = testResults.browserCompatibility.status;
  compatRow.innerHTML = `
    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">Browser Compatibility</td>
    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
      <span class="${getStatusClass(compatStatus)}">${formatStatus(compatStatus)}</span>
    </td>
    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
      ${formatCompatibilityDetails(testResults.browserCompatibility)}
    </td>
  `;
  tbody.appendChild(compatRow);
  
  // Add authentication row
  const authRow = document.createElement('tr');
  const authStatus = testResults.authentication.status;
  authRow.innerHTML = `
    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">Authentication</td>
    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
      <span class="${getStatusClass(authStatus)}">${formatStatus(authStatus)}</span>
    </td>
    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
      ${formatAuthDetails(testResults.authentication)}
    </td>
  `;
  tbody.appendChild(authRow);
  
  // Add patient context row
  const patientRow = document.createElement('tr');
  const patientStatus = testResults.patientContext.status;
  patientRow.innerHTML = `
    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">Patient Context</td>
    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
      <span class="${getStatusClass(patientStatus)}">${formatStatus(patientStatus)}</span>
    </td>
    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
      ${formatPatientDetails(testResults.patientContext)}
    </td>
  `;
  tbody.appendChild(patientRow);
  
  // Add allergy retrieval row
  const allergyRow = document.createElement('tr');
  const allergyStatus = testResults.allergyRetrieval.status;
  allergyRow.innerHTML = `
    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">Allergy Retrieval</td>
    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
      <span class="${getStatusClass(allergyStatus)}">${formatStatus(allergyStatus)}</span>
    </td>
    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
      ${formatAllergyDetails(testResults.allergyRetrieval)}
    </td>
  `;
  tbody.appendChild(allergyRow);
  
  table.appendChild(tbody);
  reportElement.appendChild(table);
  
  // Add summary
  const summary = document.createElement('div');
  summary.style.marginTop = '15px';
  summary.style.padding = '10px';
  summary.style.backgroundColor = getSummaryBackgroundColor(testResults);
  summary.style.borderRadius = '4px';
  summary.style.color = getSummaryTextColor(testResults);
  
  const passCount = Object.values(testResults).filter(r => r.status === 'pass').length;
  const totalTests = Object.values(testResults).filter(r => typeof r === 'object' && r !== null && 'status' in r).length;
  
  summary.innerHTML = `
    <strong>Summary:</strong> ${passCount} of ${totalTests} tests passed
    ${getSummaryMessage(testResults)}
  `;
  
  reportElement.appendChild(summary);
  
  return reportElement;
}

/**
 * Get CSS class for status
 * @param {string} status - Test status
 * @returns {string} CSS class
 */
function getStatusClass(status) {
  switch (status) {
    case 'pass': return 'status-pass';
    case 'fail': return 'status-fail';
    case 'error': return 'status-error';
    case 'skip': return 'status-skip';
    default: return 'status-pending';
  }
}

/**
 * Format status for display
 * @param {string} status - Test status
 * @returns {string} Formatted status
 */
function formatStatus(status) {
  switch (status) {
    case 'pass': return '<span style="color: green;">PASS</span>';
    case 'fail': return '<span style="color: red;">FAIL</span>';
    case 'error': return '<span style="color: #dc3545;">ERROR</span>';
    case 'skip': return '<span style="color: #6c757d;">SKIPPED</span>';
    default: return '<span style="color: #6c757d;">PENDING</span>';
  }
}

/**
 * Format compatibility details
 * @param {Object} compatibility - Compatibility test results
 * @returns {string} Formatted details
 */
function formatCompatibilityDetails(compatibility) {
  if (compatibility.status === 'error') {
    return `Error: ${compatibility.error}`;
  }
  
  if (!compatibility.details) {
    return 'No details available';
  }
  
  const { incompatibleFeatures } = compatibility.details;
  
  if (compatibility.status === 'pass') {
    return 'All required features supported';
  }
  
  let details = '';
  
  if (incompatibleFeatures.core.length > 0) {
    details += `Missing core features: ${incompatibleFeatures.core.join(', ')}<br>`;
  }
  
  if (incompatibleFeatures.fhir.length > 0) {
    details += `Missing FHIR features: ${incompatibleFeatures.fhir.join(', ')}`;
  }
  
  return details || 'Compatibility issues detected';
}

/**
 * Format authentication details
 * @param {Object} auth - Authentication test results
 * @returns {string} Formatted details
 */
function formatAuthDetails(auth) {
  if (auth.status === 'error') {
    return `Error: ${auth.error}`;
  }
  
  if (auth.status === 'pass') {
    return 'User is authenticated';
  }
  
  return 'User is not authenticated';
}

/**
 * Format patient context details
 * @param {Object} patient - Patient context test results
 * @returns {string} Formatted details
 */
function formatPatientDetails(patient) {
  if (patient.status === 'error') {
    return `Error: ${patient.error}`;
  }
  
  if (patient.status === 'skip') {
    return `Skipped: ${patient.details?.reason || 'Unknown reason'}`;
  }
  
  if (patient.status === 'pass') {
    return `Patient ID: ${patient.details?.patientId || 'Unknown'}`;
  }
  
  return 'Failed to retrieve patient context';
}

/**
 * Format allergy retrieval details
 * @param {Object} allergy - Allergy retrieval test results
 * @returns {string} Formatted details
 */
function formatAllergyDetails(allergy) {
  if (allergy.status === 'error') {
    return `Error: ${allergy.error}`;
  }
  
  if (allergy.status === 'skip') {
    return `Skipped: ${allergy.details?.reason || 'Unknown reason'}`;
  }
  
  if (allergy.status === 'pass') {
    return `Retrieved ${allergy.details?.count || 0} allergies`;
  }
  
  return 'Failed to retrieve allergies';
}

/**
 * Get background color for summary based on test results
 * @param {Object} results - Test results
 * @returns {string} CSS color
 */
function getSummaryBackgroundColor(results) {
  const statuses = Object.values(results)
    .filter(r => typeof r === 'object' && r !== null && 'status' in r)
    .map(r => r.status);
  
  if (statuses.includes('error')) {
    return '#f8d7da'; // Light red
  }
  
  if (statuses.includes('fail')) {
    return '#fff3cd'; // Light yellow
  }
  
  if (statuses.every(s => s === 'pass')) {
    return '#d4edda'; // Light green
  }
  
  return '#e2e3e5'; // Light gray
}

/**
 * Get text color for summary based on test results
 * @param {Object} results - Test results
 * @returns {string} CSS color
 */
function getSummaryTextColor(results) {
  const statuses = Object.values(results)
    .filter(r => typeof r === 'object' && r !== null && 'status' in r)
    .map(r => r.status);
  
  if (statuses.includes('error')) {
    return '#721c24'; // Dark red
  }
  
  if (statuses.includes('fail')) {
    return '#856404'; // Dark yellow
  }
  
  if (statuses.every(s => s === 'pass')) {
    return '#155724'; // Dark green
  }
  
  return '#383d41'; // Dark gray
}

/**
 * Get summary message based on test results
 * @param {Object} results - Test results
 * @returns {string} Summary message
 */
function getSummaryMessage(results) {
  const statuses = Object.values(results)
    .filter(r => typeof r === 'object' && r !== null && 'status' in r)
    .map(r => r.status);
  
  if (statuses.includes('error')) {
    return '<br>Critical errors detected. Some functionality may not work correctly.';
  }
  
  if (statuses.includes('fail')) {
    return '<br>Some tests failed. Application may have limited functionality.';
  }
  
  if (statuses.every(s => s === 'pass')) {
    return '<br>All tests passed. Application should work correctly.';
  }
  
  return '<br>Some tests were skipped. Application may have limited functionality.';
}
