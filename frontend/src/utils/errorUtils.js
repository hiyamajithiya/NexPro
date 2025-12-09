/**
 * Utility functions for handling API errors consistently across the application
 */

/**
 * Extract a user-friendly error message from an API error response
 * @param {Error} error - The error object from axios/API call
 * @param {string} fallbackMessage - Default message if no specific error found
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error, fallbackMessage = 'Operation failed') => {
  if (!error) return fallbackMessage;

  // Handle axios error response
  if (error.response?.data) {
    const data = error.response.data;

    // Case 1: Direct detail message (e.g., { detail: "Error message" })
    if (data.detail) {
      return data.detail;
    }

    // Case 2: Direct error message (e.g., { error: "Error message" })
    if (data.error) {
      return data.error;
    }

    // Case 3: Direct message (e.g., { message: "Error message" })
    if (data.message) {
      return data.message;
    }

    // Case 4: Field-specific errors (e.g., { field_name: ["Error 1", "Error 2"] })
    // This is common in Django REST Framework validation errors
    if (typeof data === 'object' && !Array.isArray(data)) {
      const fieldErrors = [];

      for (const [field, errors] of Object.entries(data)) {
        // Skip non_field_errors as they're handled separately
        if (field === 'non_field_errors') {
          if (Array.isArray(errors)) {
            fieldErrors.push(...errors);
          } else {
            fieldErrors.push(errors);
          }
          continue;
        }

        // Format field name to be more readable
        const fieldName = field
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());

        if (Array.isArray(errors)) {
          errors.forEach((err) => {
            fieldErrors.push(`${fieldName}: ${err}`);
          });
        } else if (typeof errors === 'string') {
          fieldErrors.push(`${fieldName}: ${errors}`);
        } else if (typeof errors === 'object') {
          // Nested object errors
          fieldErrors.push(`${fieldName}: ${JSON.stringify(errors)}`);
        }
      }

      if (fieldErrors.length > 0) {
        // Return first error for snackbar, or join all for detailed view
        return fieldErrors[0];
      }
    }

    // Case 5: Array of errors
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }

    // Case 6: String response
    if (typeof data === 'string') {
      return data;
    }
  }

  // Handle network errors
  if (error.message) {
    if (error.message === 'Network Error') {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    return error.message;
  }

  return fallbackMessage;
};

/**
 * Get all error messages from an API response (for displaying multiple errors)
 * @param {Error} error - The error object from axios/API call
 * @returns {string[]} - Array of error messages
 */
export const getAllErrorMessages = (error) => {
  const messages = [];

  if (!error?.response?.data) {
    return [getErrorMessage(error)];
  }

  const data = error.response.data;

  if (typeof data === 'object' && !Array.isArray(data)) {
    for (const [field, errors] of Object.entries(data)) {
      const fieldName = field === 'non_field_errors'
        ? ''
        : field.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) + ': ';

      if (Array.isArray(errors)) {
        errors.forEach((err) => {
          messages.push(`${fieldName}${err}`);
        });
      } else if (typeof errors === 'string') {
        messages.push(`${fieldName}${errors}`);
      }
    }
  }

  return messages.length > 0 ? messages : [getErrorMessage(error)];
};

export default getErrorMessage;
