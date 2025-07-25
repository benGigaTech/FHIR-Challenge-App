/**
 * Expandable Cards UI Module
 * 
 * This module provides functionality for creating expandable card UI components
 * and resource type selectors for displaying different FHIR resource types.
 */

/**
 * Error types for expandable cards
 */
export const CardError = {
  INVALID_ELEMENT: 'INVALID_ELEMENT',
  RENDER_ERROR: 'RENDER_ERROR',
  CONTENT_ERROR: 'CONTENT_ERROR'
};

/**
 * Creates an expandable card component with a header and collapsible content
 * 
 * @param {string} title - The title to display in the card header
 * @param {string} contentId - The ID to assign to the content container
 * @param {boolean} isExpanded - Whether the card should be expanded by default
 * @returns {HTMLElement} The card element
 */
export const createExpandableCard = (title, contentId, isExpanded = false) => {
  const card = document.createElement('div');
  card.className = 'expandable-card';
  
  const header = document.createElement('div');
  header.className = 'card-header';
  
  const titleElement = document.createElement('h3');
  titleElement.textContent = title;
  
  const toggleButton = document.createElement('button');
  toggleButton.className = `toggle-button ${isExpanded ? 'expanded' : 'collapsed'}`;
  toggleButton.innerHTML = isExpanded ? '&#9650;' : '&#9660;';
  toggleButton.setAttribute('aria-label', isExpanded ? 'Collapse' : 'Expand');
  toggleButton.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  toggleButton.setAttribute('aria-controls', contentId);
  
  const contentContainer = document.createElement('div');
  contentContainer.id = contentId;
  contentContainer.className = 'card-content';
  contentContainer.style.display = isExpanded ? 'block' : 'none';
  
  header.appendChild(titleElement);
  header.appendChild(toggleButton);
  card.appendChild(header);
  card.appendChild(contentContainer);
  
  toggleButton.addEventListener('click', () => {
    const isCurrentlyExpanded = contentContainer.style.display === 'block';
    contentContainer.style.display = isCurrentlyExpanded ? 'none' : 'block';
    toggleButton.innerHTML = isCurrentlyExpanded ? '&#9660;' : '&#9650;';
    toggleButton.className = `toggle-button ${isCurrentlyExpanded ? 'collapsed' : 'expanded'}`;
    toggleButton.setAttribute('aria-label', isCurrentlyExpanded ? 'Expand' : 'Collapse');
    toggleButton.setAttribute('aria-expanded', isCurrentlyExpanded ? 'false' : 'true');
  });
  
  return card;
};

/**
 * Creates a resource type selector component
 * 
 * @param {Array<{id: string, name: string}>} resourceTypes - Array of resource types with id and display name
 * @param {Function} onSelectCallback - Callback function when a resource type is selected
 * @param {string} defaultSelected - The ID of the default selected resource type
 * @returns {HTMLElement} The resource selector element
 */
export const createResourceTypeSelector = (resourceTypes, onSelectCallback, defaultSelected = null) => {
  if (!Array.isArray(resourceTypes) || resourceTypes.length === 0) {
    console.error('Resource types must be a non-empty array');
    return null;
  }
  
  const container = document.createElement('div');
  container.className = 'resource-selector';
  
  const label = document.createElement('label');
  label.textContent = 'Select Resource Type:';
  label.setAttribute('for', 'resource-type-select');
  
  const select = document.createElement('select');
  select.id = 'resource-type-select';
  select.className = 'resource-select';
  
  resourceTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type.id;
    option.textContent = type.name;
    
    if (defaultSelected && type.id === defaultSelected) {
      option.selected = true;
    }
    
    select.appendChild(option);
  });
  
  select.addEventListener('change', (event) => {
    if (typeof onSelectCallback === 'function') {
      onSelectCallback(event.target.value);
    }
  });
  
  container.appendChild(label);
  container.appendChild(select);
  
  return container;
};

/**
 * Creates a resource card container to hold multiple expandable cards
 * 
 * @param {string} containerId - The ID to assign to the container
 * @returns {HTMLElement} The resource card container element
 */
export const createResourceCardContainer = (containerId) => {
  const container = document.createElement('div');
  container.id = containerId;
  container.className = 'resource-card-container';
  return container;
};

/**
 * Sets the content of an expandable card
 * 
 * @param {string} contentId - The ID of the content container
 * @param {HTMLElement|string} content - The content to set (HTML element or HTML string)
 * @returns {boolean} True if content was set successfully, false otherwise
 */
export const setCardContent = (contentId, content) => {
  const contentContainer = document.getElementById(contentId);
  
  if (!contentContainer) {
    console.error(`Card content container with ID "${contentId}" not found`);
    return false;
  }
  
  // Clear existing content
  contentContainer.innerHTML = '';
  
  // Add new content
  if (content instanceof HTMLElement) {
    contentContainer.appendChild(content);
  } else if (typeof content === 'string') {
    contentContainer.innerHTML = content;
  } else {
    console.error('Content must be an HTML element or string');
    return false;
  }
  
  return true;
};

/**
 * Creates a loading indicator for cards
 * 
 * @param {string} message - The loading message to display
 * @returns {HTMLElement} The loading indicator element
 */
export const createLoadingIndicator = (message = 'Loading...') => {
  const loadingContainer = document.createElement('div');
  loadingContainer.className = 'card-loading';
  
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  
  const loadingText = document.createElement('p');
  loadingText.textContent = message;
  
  loadingContainer.appendChild(spinner);
  loadingContainer.appendChild(loadingText);
  
  return loadingContainer;
};

/**
 * Creates an error display for cards
 * 
 * @param {string} message - The error message to display
 * @param {string} type - The type of error
 * @returns {HTMLElement} The error display element
 */
export const createCardError = (message, type = CardError.CONTENT_ERROR) => {
  const errorContainer = document.createElement('div');
  errorContainer.className = 'card-error';
  
  const errorIcon = document.createElement('span');
  errorIcon.className = 'error-icon';
  errorIcon.innerHTML = '&#9888;'; // Warning symbol
  
  const errorMessage = document.createElement('p');
  errorMessage.textContent = message;
  
  const errorType = document.createElement('small');
  errorType.textContent = `Error type: ${type}`;
  
  errorContainer.appendChild(errorIcon);
  errorContainer.appendChild(errorMessage);
  errorContainer.appendChild(errorType);
  
  return errorContainer;
};

/**
 * Creates a no-data message for cards when no resources are found
 * 
 * @param {string} resourceType - The resource type that has no data
 * @param {string} customMessage - Optional custom message to display
 * @returns {HTMLElement} The no-data message element
 */
export const createNoDataMessage = (resourceType, customMessage = null) => {
  const messageContainer = document.createElement('div');
  messageContainer.className = 'card-no-data';
  
  const infoIcon = document.createElement('span');
  infoIcon.className = 'info-icon';
  infoIcon.innerHTML = '&#8505;'; // Info symbol
  
  const message = document.createElement('p');
  message.textContent = customMessage || `No ${resourceType} found for this patient.`;
  
  messageContainer.appendChild(infoIcon);
  messageContainer.appendChild(message);
  
  return messageContainer;
};
