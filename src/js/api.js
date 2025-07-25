/**
 * SMART on FHIR API Utility Module
 * 
 * This module provides utility functions for making authenticated API requests
 * to FHIR servers with proper authorization headers.
 */

import { addAuthToRequest, formatAuthError, isAuthenticated, AuthError } from './auth.js?v=1';
import { createError, retryOperation, ApiError } from './error-handler.js?v=1';

/**
 * Make an authenticated request to the FHIR server
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} options - Request options (method, headers, body)
 * @returns {Promise<Object>} The response data
 */
export async function fhirRequest(endpoint, options = {}) {
  try {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      throw createError(
        AuthError.UNAUTHENTICATED,
        'User is not authenticated',
        { help: 'Please authenticate before making FHIR requests.' }
      );
    }

    // Add authorization headers to the request
    const requestOptions = addAuthToRequest({
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json+fhir',
        'Accept': 'application/json+fhir',
        ...(options.headers || {})
      },
      ...(options.body && { body: JSON.stringify(options.body) })
    });

    // Make the request
    const response = await fetch(endpoint, requestOptions);

    // Check if the response is successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const status = response.status;
      const errorMessage = errorData.message || `Request failed with status ${status}`;
      
      // Create appropriate error based on status code
      if (status === 401 || status === 403) {
        throw createError(
          FhirServerError.UNAUTHORIZED,
          `Unauthorized: ${errorMessage}`,
          { 
            status,
            endpoint,
            help: 'Your session may have expired. Please try refreshing the page to re-authenticate.'
          }
        );
      } else if (status === 404) {
        throw createError(
          FhirServerError.RESOURCE_NOT_FOUND,
          `Resource not found: ${errorMessage}`,
          { 
            status,
            endpoint,
            help: 'The requested resource could not be found on the FHIR server.'
          }
        );
      } else if (status === 400) {
        throw createError(
          FhirServerError.BAD_REQUEST,
          `Bad request: ${errorMessage}`,
          { 
            status,
            endpoint,
            errorDetails: errorData,
            help: 'The request was invalid. Please check the request parameters.'
          }
        );
      } else if (status === 422) {
        throw createError(
          FhirServerError.VALIDATION_ERROR,
          `Validation error: ${errorMessage}`,
          { 
            status,
            endpoint,
            errorDetails: errorData,
            help: 'The FHIR resource failed validation. Please check the resource structure.'
          }
        );
      } else if (status >= 500) {
        throw createError(
          FhirServerError.SERVER_ERROR,
          `Server error: ${errorMessage}`,
          { 
            status,
            endpoint,
            help: 'The FHIR server encountered an internal error. Please try again later.'
          }
        );
      } else {
        throw createError(
          ApiError.HTTP_ERROR,
          errorMessage,
          { 
            status,
            endpoint,
            errorDetails: errorData,
            help: 'An error occurred while communicating with the FHIR server.'
          }
        );
      }
    }

    // Parse and return the response data
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    
    // If the error is already a structured error object, pass it through
    if (error.type) {
      throw error;
    }
    
    // Handle authentication errors
    if (error.message && (error.message.includes('authentication') || 
        error.message.includes('unauthorized') || 
        error.message.includes('token'))) {
      throw formatAuthError(error);
    }
    
    // Handle network errors
    if (error.name === 'TypeError' || error.message?.includes('network') || !navigator.onLine) {
      throw createError(
        NetworkError.CONNECTION_FAILED,
        'Network error while connecting to FHIR server',
        { 
          originalError: error,
          endpoint,
          help: 'Please check your internet connection and try again.'
        }
      );
    }
    
    // Generic API error
    throw createError(
      ApiError.REQUEST_FAILED,
      `API request failed: ${error.message || 'Unknown error'}`,
      { 
        originalError: error,
        endpoint,
        help: 'An unexpected error occurred while communicating with the FHIR server.'
      }
    );
  }
}

/**
 * Get a resource from the FHIR server
 * @param {string} resourceType - The FHIR resource type (e.g., 'Patient', 'AllergyIntolerance')
 * @param {string} id - The resource ID
 * @param {Object} options - Additional request options
 * @returns {Promise<Object>} The resource data
 */
export async function getResource(resourceType, id, options = {}) {
  try {
    if (!resourceType) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Resource type is required',
        { help: 'Please specify a FHIR resource type to retrieve.' }
      );
    }
    
    if (!id) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Resource ID is required',
        { help: 'Please specify a resource ID to retrieve.' }
      );
    }
    
    const endpoint = `${options.serverUrl || ''}/${resourceType}/${id}`;
    return fhirRequest(endpoint, options);
  } catch (error) {
    // If the error is already a structured error, pass it through
    if (error.type) throw error;
    
    throw createError(
      ApiError.GET_FAILED,
      `Failed to get ${resourceType}/${id}: ${error.message || 'Unknown error'}`,
      {
        originalError: error,
        resourceType,
        resourceId: id,
        help: 'An error occurred while retrieving the resource. The resource may not exist or you may not have permission to access it.'
      }
    );
  }
}

/**
 * Search for resources on the FHIR server
 * @param {string} resourceType - The FHIR resource type to search
 * @param {Object} searchParams - Search parameters
 * @param {Object} options - Additional request options
 * @returns {Promise<Object>} The search results bundle
 */
export async function searchResources(resourceType, searchParams = {}, options = {}) {
  try {
    if (!resourceType) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Resource type is required for search',
        { help: 'Please specify a FHIR resource type to search for.' }
      );
    }
    
    // Build the query string from search parameters
    const queryParams = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      queryParams.append(key, value);
    });
    
    const queryString = queryParams.toString();
    const endpoint = `${options.serverUrl || ''}/${resourceType}${queryString ? `?${queryString}` : ''}`;
    
    return fhirRequest(endpoint, options);
  } catch (error) {
    // If the error is already a structured error, pass it through
    if (error.type) throw error;
    
    throw createError(
      ApiError.SEARCH_FAILED,
      `Failed to search for ${resourceType} resources: ${error.message || 'Unknown error'}`,
      {
        originalError: error,
        resourceType,
        searchParams,
        help: 'An error occurred while searching for resources. Please check your search parameters.'
      }
    );
  }
}

/**
 * Create a new resource on the FHIR server
 * @param {string} resourceType - The FHIR resource type
 * @param {Object} resourceData - The resource data to create
 * @param {Object} options - Additional request options
 * @returns {Promise<Object>} The created resource
 */
export async function createResource(resourceType, resourceData, options = {}) {
  try {
    if (!resourceType) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Resource type is required for creation',
        { help: 'Please specify a FHIR resource type to create.' }
      );
    }
    
    if (!resourceData) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Resource data is required for creation',
        { help: 'Please provide resource data to create a new resource.' }
      );
    }
    
    const endpoint = `${options.serverUrl || ''}/${resourceType}`;
    
    return fhirRequest(endpoint, {
      method: 'POST',
      body: resourceData,
      ...options
    });
  } catch (error) {
    // If the error is already a structured error, pass it through
    if (error.type) throw error;
    
    throw createError(
      ApiError.CREATE_FAILED,
      `Failed to create ${resourceType} resource: ${error.message || 'Unknown error'}`,
      {
        originalError: error,
        resourceType,
        help: 'An error occurred while creating the resource. Please check the resource data and your permissions.'
      }
    );
  }
}

/**
 * Update an existing resource on the FHIR server
 * @param {string} resourceType - The FHIR resource type
 * @param {string} id - The resource ID
 * @param {Object} resourceData - The updated resource data
 * @param {Object} options - Additional request options
 * @returns {Promise<Object>} The updated resource
 */
export async function updateResource(resourceType, id, resourceData, options = {}) {
  try {
    if (!resourceType) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Resource type is required for update',
        { help: 'Please specify a FHIR resource type to update.' }
      );
    }
    
    if (!id) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Resource ID is required for update',
        { help: 'Please specify a resource ID to update.' }
      );
    }
    
    if (!resourceData) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Resource data is required for update',
        { help: 'Please provide resource data to update the resource.' }
      );
    }
    
    const endpoint = `${options.serverUrl || ''}/${resourceType}/${id}`;
    
    return fhirRequest(endpoint, {
      method: 'PUT',
      body: resourceData,
      ...options
    });
  } catch (error) {
    // If the error is already a structured error, pass it through
    if (error.type) throw error;
    
    throw createError(
      ApiError.UPDATE_FAILED,
      `Failed to update ${resourceType}/${id}: ${error.message || 'Unknown error'}`,
      {
        originalError: error,
        resourceType,
        resourceId: id,
        help: 'An error occurred while updating the resource. The resource may not exist or you may not have permission to update it.'
      }
    );
  }
}

/**
 * Delete a resource from the FHIR server
 * @param {string} resourceType - The FHIR resource type
 * @param {string} id - The resource ID
 * @param {Object} options - Additional request options
 * @returns {Promise<Object>} The operation outcome
 */
export async function deleteResource(resourceType, id, options = {}) {
  try {
    if (!resourceType) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Resource type is required for deletion',
        { help: 'Please specify a FHIR resource type to delete.' }
      );
    }
    
    if (!id) {
      throw createError(
        FhirServerError.MISSING_PARAMETER,
        'Resource ID is required for deletion',
        { help: 'Please specify a resource ID to delete.' }
      );
    }
    
    const endpoint = `${options.serverUrl || ''}/${resourceType}/${id}`;
    
    return fhirRequest(endpoint, {
      method: 'DELETE',
      ...options
    });
  } catch (error) {
    // If the error is already a structured error, pass it through
    if (error.type) throw error;
    
    throw createError(
      ApiError.DELETE_FAILED,
      `Failed to delete ${resourceType}/${id}: ${error.message || 'Unknown error'}`,
      {
        originalError: error,
        resourceType,
        resourceId: id,
        help: 'An error occurred while deleting the resource. The resource may not exist or you may not have permission to delete it.'
      }
    );
  }
}
