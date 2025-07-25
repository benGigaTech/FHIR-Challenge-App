/**
 * JSON Display Module for FHIR Resource Visualization
 * Provides functionality to display FHIR resources in formatted JSON with copy-to-clipboard support
 */

/**
 * Display JSON data in a formatted, readable way
 * @param {Object} data - The data to display (FHIR resources or any object)
 * @param {string} targetElementId - ID of the target DOM element
 * @param {Object} options - Display options
 */
export function displayJsonData(data, targetElementId, options = {}) {
  const {
    title = 'FHIR Resource',
    expandLevel = 2,
    showCopyButton = true,
    showLineNumbers = true,
    maxLength = 10000
  } = options;

  const targetElement = document.getElementById(targetElementId);
  if (!targetElement) {
    console.error(`Target element ${targetElementId} not found`);
    return;
  }

  try {
    // Handle empty or null data
    if (!data) {
      displayEmptyState(targetElement, title);
      return;
    }

    // Handle arrays vs single objects
    const displayData = Array.isArray(data) ? data : [data];
    
    // Truncate if data is too large
    if (JSON.stringify(displayData).length > maxLength) {
      console.warn(`Data too large, truncating to ${maxLength} characters`);
    }

    // Clear previous content
    targetElement.innerHTML = '';

    // Create container
    const container = document.createElement('div');
    container.className = 'json-display-container';

    // Add title if provided
    if (title) {
      const titleElement = document.createElement('h3');
      titleElement.className = 'json-display-title';
      titleElement.textContent = title;
      container.appendChild(titleElement);
    }

    // Create display area
    const displayArea = document.createElement('div');
    displayArea.className = 'json-display-area';

    // Format JSON with proper indentation
    const formattedJson = JSON.stringify(displayData, null, 2);
    
    // Create pre element for formatted display
    const preElement = document.createElement('pre');
    preElement.className = 'json-display';
    
    if (showLineNumbers) {
      const codeElement = document.createElement('code');
      codeElement.className = 'language-json';
      codeElement.textContent = formattedJson;
      preElement.appendChild(codeElement);
    } else {
      preElement.textContent = formattedJson;
    }

    displayArea.appendChild(preElement);

    // Add controls (copy button)
    if (showCopyButton) {
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'json-display-controls';

      const copyButton = document.createElement('button');
      copyButton.className = 'json-copy-button';
      copyButton.textContent = 'Copy to Clipboard';
      copyButton.onclick = () => copyToClipboard(formattedJson, copyButton);
      
      controlsDiv.appendChild(copyButton);
      displayArea.appendChild(controlsDiv);
    }

    container.appendChild(displayArea);
    targetElement.appendChild(container);

    // Add syntax highlighting if available
    if (window.Prism) {
      Prism.highlightElement(preElement.querySelector('code') || preElement);
    }

  } catch (error) {
    console.error('Error displaying JSON data:', error);
    displayErrorState(targetElement, error.message);
  }
}

/**
 * Display empty state when no data is available
 * @param {HTMLElement} targetElement - Target DOM element
 * @param {string} title - Display title
 */
function displayEmptyState(targetElement, title) {
  targetElement.innerHTML = `
    <div class="json-empty-state">
      <h3>${title}</h3>
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        No data available to display
      </div>
    </div>
  `;
}

/**
 * Display error state when data processing fails
 * @param {HTMLElement} targetElement - Target DOM element
 * @param {string} errorMessage - Error message to display
 */
function displayErrorState(targetElement, errorMessage) {
  targetElement.innerHTML = `
    <div class="json-error-state">
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle"></i>
        <strong>Error displaying data:</strong>
        <pre>${errorMessage}</pre>
      </div>
    </div>
  `;
}

/**
 * Copy JSON data to clipboard with user feedback
 * @param {string} text - Text to copy
 * @param {HTMLElement} button - Button element for feedback
 */
async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    
    // Visual feedback
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('copied');
    
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 2000);

  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = 'Copy to Clipboard';
      }, 2000);
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError);
      button.textContent = 'Copy Failed';
    }
    
    document.body.removeChild(textArea);
  }
}

/**
 * Display FHIR resource in collapsible sections
 * @param {Object} resource - FHIR resource to display
 * @param {string} targetElementId - Target DOM element ID
 * @param {Object} options - Display options
 */
export function displayFhirResource(resource, targetElementId, options = {}) {
  const {
    showMetadata = true,
    collapsible = true,
    expanded = false
  } = options;

  const displayData = {
    resourceType: resource.resourceType,
    id: resource.id,
    meta: showMetadata ? resource.meta : undefined,
    ...resource
  };

  displayJsonData(displayData, targetElementId, {
    title: `${resource.resourceType || 'FHIR Resource'}: ${resource.id || 'Unknown'}`,
    ...options
  });
}

/**
 * Display multiple FHIR resources in a list format
 * @param {Array} resources - Array of FHIR resources
 * @param {string} targetElementId - Target DOM element ID
 * @param {Object} options - Display options
 */
export function displayFhirResourcesList(resources, targetElementId, options = {}) {
  const {
    showCount = true,
    groupByType = true
  } = options;

  const targetElement = document.getElementById(targetElementId);
  if (!targetElement) return;

  targetElement.innerHTML = '';

  if (showCount) {
    const countElement = document.createElement('div');
    countElement.className = 'json-resources-count';
    countElement.textContent = `Found ${resources.length} resource${resources.length !== 1 ? 's' : ''}`;
    targetElement.appendChild(countElement);
  }

  if (groupByType) {
    const grouped = resources.reduce((acc, resource) => {
      const type = resource.resourceType || 'Unknown';
      acc[type] = acc[type] || [];
      acc[type].push(resource);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([type, typeResources]) => {
      const section = document.createElement('div');
      section.className = 'json-resource-section';
      
      const header = document.createElement('h4');
      header.textContent = `${type} (${typeResources.length})`;
      section.appendChild(header);

      typeResources.forEach(resource => {
        const resourceDiv = document.createElement('div');
        resourceDiv.className = 'json-resource-item';
        
        const resourceJson = JSON.stringify(resource, null, 2);
        const pre = document.createElement('pre');
        pre.className = 'json-resource-code';
        pre.textContent = resourceJson;
        
        resourceDiv.appendChild(pre);
        section.appendChild(resourceDiv);
      });

      targetElement.appendChild(section);
    });
  } else {
    displayJsonData(resources, targetElementId, options);
  }
}

/**
 * Export data as downloadable JSON file
 * @param {Object} data - Data to export
 * @param {string} filename - Output filename
 */
export function exportJsonData(data, filename = 'fhir-data.json') {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting JSON data:', error);
  }
}

/**
 * Validate and display FHIR resource structure
 * @param {Object} resource - FHIR resource to validate
 * @param {string} targetElementId - Target DOM element ID
 */
export function displayFhirValidation(resource, targetElementId) {
  const validation = validateFhirStructure(resource);
  const displayData = {
    resource: resource,
    validation: validation,
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings
  };

  displayJsonData(displayData, targetElementId, {
    title: 'FHIR Resource Validation'
  });
}

/**
 * Basic FHIR structure validation
 * @param {Object} resource - FHIR resource to validate
 * @returns {Object} Validation result
 */
function validateFhirStructure(resource) {
  const errors = [];
  const warnings = [];

  if (!resource) {
    errors.push('Resource is null or undefined');
    return { isValid: false, errors, warnings };
  }

  if (!resource.resourceType) {
    errors.push('Missing required resourceType field');
  }

  if (!resource.id) {
    warnings.push('Missing recommended id field');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
