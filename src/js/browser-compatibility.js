/**
 * Browser Compatibility Module
 * 
 * This module provides utilities for checking browser compatibility
 * with features required by the SMART on FHIR application.
 */

/**
 * Check if the current browser supports all required features
 * @returns {Object} Object containing compatibility status and details
 */
export function checkBrowserCompatibility() {
  // Check for essential features
  const features = {
    fetch: typeof fetch !== 'undefined',
    promises: typeof Promise !== 'undefined',
    localStorage: typeof localStorage !== 'undefined',
    sessionStorage: typeof sessionStorage !== 'undefined',
    json: typeof JSON !== 'undefined'
  };
  
  // Check for FHIR-specific features
  const fhirFeatures = {
    cors: 'XMLHttpRequest' in window && 'withCredentials' in new XMLHttpRequest(),
    blob: typeof Blob !== 'undefined',
    formData: typeof FormData !== 'undefined'
  };
  
  // Identify incompatible features
  const incompatibleFeatures = Object.entries(features)
    .filter(([_, supported]) => !supported)
    .map(([feature]) => feature);
  
  const incompatibleFhirFeatures = Object.entries(fhirFeatures)
    .filter(([_, supported]) => !supported)
    .map(([feature]) => feature);
  
  // Determine overall compatibility
  const isCompatible = incompatibleFeatures.length === 0 && incompatibleFhirFeatures.length === 0;
  
  // Return detailed compatibility report
  return {
    isCompatible,
    features: {
      core: features,
      fhir: fhirFeatures
    },
    incompatibleFeatures: {
      core: incompatibleFeatures,
      fhir: incompatibleFhirFeatures
    },
    browserInfo: {
      userAgent: navigator.userAgent,
      vendor: navigator.vendor,
      platform: navigator.platform
    }
  };
}

/**
 * Display browser compatibility warnings if issues are detected
 * @param {HTMLElement} container - Element to display warnings in
 * @returns {boolean} True if browser is compatible, false otherwise
 */
export function displayCompatibilityWarnings(container) {
  const compatibility = checkBrowserCompatibility();
  
  if (!compatibility.isCompatible) {
    const warningElement = document.createElement('div');
    warningElement.className = 'browser-compatibility-warning';
    warningElement.style.padding = '10px';
    warningElement.style.margin = '10px 0';
    warningElement.style.backgroundColor = '#fff3cd';
    warningElement.style.color = '#856404';
    warningElement.style.borderRadius = '4px';
    warningElement.style.border = '1px solid #ffeeba';
    
    let warningMessage = '<strong>Browser Compatibility Warning</strong><br>';
    warningMessage += 'Your browser may not fully support all features required by this application.<br>';
    
    if (compatibility.incompatibleFeatures.core.length > 0) {
      warningMessage += '<strong>Missing core features:</strong> ' + 
        compatibility.incompatibleFeatures.core.join(', ') + '<br>';
    }
    
    if (compatibility.incompatibleFeatures.fhir.length > 0) {
      warningMessage += '<strong>Missing FHIR features:</strong> ' + 
        compatibility.incompatibleFeatures.fhir.join(', ') + '<br>';
    }
    
    warningMessage += 'Please consider using a modern browser like Chrome, Firefox, Safari, or Edge.';
    
    warningElement.innerHTML = warningMessage;
    container.prepend(warningElement);
    
    // Log detailed compatibility information
    console.warn('Browser compatibility issues detected:', compatibility);
    return false;
  }
  
  return true;
}
