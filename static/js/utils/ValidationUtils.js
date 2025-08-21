/**
 * ValidationUtils.js - Comprehensive form validation utilities
 * 
 * This module provides validation functions for category management forms,
 * including real-time validation feedback and error message formatting.
 */

/**
 * Validation result object structure
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the validation passed
 * @property {string} message - Error message if validation failed
 * @property {string} field - Field name that failed validation
 */

/**
 * Category validation rules and patterns
 */
const VALIDATION_RULES = {
    categoryName: {
        minLength: 1,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9\s\-_&().,]+$/,
        reservedNames: ['all', 'none', 'undefined', 'null']
    },
    categoryLevel: {
        validLevels: [1, 2, 3]
    }
};

/**
 * Validates a category name
 * @param {string} name - The category name to validate
 * @param {Array<string>} existingNames - Array of existing category names to check uniqueness
 * @returns {ValidationResult} Validation result
 */
export function validateCategoryName(name, existingNames = []) {
    // Check if name is provided
    if (!name || typeof name !== 'string') {
        return {
            isValid: false,
            message: 'Category name is required',
            field: 'name'
        };
    }
    
    // Trim and check again
    const trimmedName = name.trim();
    if (!trimmedName) {
        return {
            isValid: false,
            message: 'Category name cannot be empty',
            field: 'name'
        };
    }
    
    // Check length
    if (trimmedName.length < VALIDATION_RULES.categoryName.minLength) {
        return {
            isValid: false,
            message: 'Category name is too short',
            field: 'name'
        };
    }
    
    if (trimmedName.length > VALIDATION_RULES.categoryName.maxLength) {
        return {
            isValid: false,
            message: `Category name cannot exceed ${VALIDATION_RULES.categoryName.maxLength} characters`,
            field: 'name'
        };
    }
    
    // Check pattern
    if (!VALIDATION_RULES.categoryName.pattern.test(trimmedName)) {
        return {
            isValid: false,
            message: 'Category name contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed',
            field: 'name'
        };
    }
    
    // Check reserved names
    if (VALIDATION_RULES.categoryName.reservedNames.includes(trimmedName.toLowerCase())) {
        return {
            isValid: false,
            message: 'This category name is reserved and cannot be used',
            field: 'name'
        };
    }
    
    // Check uniqueness
    if (existingNames.some(existing => existing.toLowerCase() === trimmedName.toLowerCase())) {
        return {
            isValid: false,
            message: 'A category with this name already exists',
            field: 'name'
        };
    }
    
    return {
        isValid: true,
        message: '',
        field: 'name'
    };
}

/**
 * Validates a category level
 * @param {number|string} level - The category level to validate
 * @returns {ValidationResult} Validation result
 */
export function validateCategoryLevel(level) {
    // Convert to number if string
    const numLevel = typeof level === 'string' ? parseInt(level, 10) : level;
    
    // Check if valid number
    if (isNaN(numLevel)) {
        return {
            isValid: false,
            message: 'Category level must be a valid number',
            field: 'level'
        };
    }
    
    // Check if valid level
    if (!VALIDATION_RULES.categoryLevel.validLevels.includes(numLevel)) {
        return {
            isValid: false,
            message: 'Category level must be 1, 2, or 3',
            field: 'level'
        };
    }
    
    return {
        isValid: true,
        message: '',
        field: 'level'
    };
}

/**
 * Validates parent category requirement based on level
 * @param {number|string} level - The category level
 * @param {string} parentId - The parent category ID
 * @param {Array<Object>} availableParents - Array of available parent categories
 * @returns {ValidationResult} Validation result
 */
export function validateParentCategory(level, parentId, availableParents = []) {
    const numLevel = typeof level === 'string' ? parseInt(level, 10) : level;
    
    // Level 1 categories should not have a parent
    if (numLevel === 1) {
        if (parentId && parentId.trim()) {
            return {
                isValid: false,
                message: 'Level 1 categories cannot have a parent category',
                field: 'parent'
            };
        }
        return {
            isValid: true,
            message: '',
            field: 'parent'
        };
    }
    
    // Level 2 and 3 categories must have a parent
    if (numLevel > 1) {
        if (!parentId || !parentId.trim()) {
            return {
                isValid: false,
                message: `Level ${numLevel} categories must have a parent category`,
                field: 'parent'
            };
        }
        
        // Check if parent exists in available parents
        if (availableParents.length > 0) {
            const parentExists = availableParents.some(parent => 
                parent.id === parentId || parent.name === parentId
            );
            
            if (!parentExists) {
                return {
                    isValid: false,
                    message: 'Selected parent category is not valid',
                    field: 'parent'
                };
            }
        }
    }
    
    return {
        isValid: true,
        message: '',
        field: 'parent'
    };
}

/**
 * Validates a complete category creation form
 * @param {Object} formData - The form data to validate
 * @param {string} formData.name - Category name
 * @param {number|string} formData.level - Category level
 * @param {string} formData.parentId - Parent category ID (optional)
 * @param {Array<string>} existingNames - Array of existing category names
 * @param {Array<Object>} availableParents - Array of available parent categories
 * @returns {Object} Validation result with all field validations
 */
export function validateCategoryForm(formData, existingNames = [], availableParents = []) {
    const results = {
        isValid: true,
        errors: {},
        messages: []
    };
    
    // Validate name
    const nameValidation = validateCategoryName(formData.name, existingNames);
    if (!nameValidation.isValid) {
        results.isValid = false;
        results.errors.name = nameValidation.message;
        results.messages.push(nameValidation.message);
    }
    
    // Validate level
    const levelValidation = validateCategoryLevel(formData.level);
    if (!levelValidation.isValid) {
        results.isValid = false;
        results.errors.level = levelValidation.message;
        results.messages.push(levelValidation.message);
    }
    
    // Validate parent category
    const parentValidation = validateParentCategory(formData.level, formData.parentId, availableParents);
    if (!parentValidation.isValid) {
        results.isValid = false;
        results.errors.parent = parentValidation.message;
        results.messages.push(parentValidation.message);
    }
    
    return results;
}

/**
 * Validates category deletion safety
 * @param {Object} categoryInfo - Information about the category to delete
 * @param {number} categoryInfo.productCount - Number of products assigned to category
 * @param {number} categoryInfo.childCount - Number of child categories
 * @param {Array<string>} categoryInfo.children - Array of child category names
 * @returns {Object} Validation result with warnings
 */
export function validateCategoryDeletion(categoryInfo) {
    const result = {
        canDelete: true,
        warnings: [],
        confirmationRequired: false
    };
    
    // Check for assigned products
    if (categoryInfo.productCount > 0) {
        result.warnings.push(
            `This category is assigned to ${categoryInfo.productCount} product${categoryInfo.productCount === 1 ? '' : 's'}. ` +
            'Deleting it will remove the category from all assigned products.'
        );
        result.confirmationRequired = true;
    }
    
    // Check for child categories
    if (categoryInfo.childCount > 0) {
        result.canDelete = false;
        result.warnings.push(
            `This category has ${categoryInfo.childCount} child categor${categoryInfo.childCount === 1 ? 'y' : 'ies'}: ` +
            `${categoryInfo.children.join(', ')}. Please delete all child categories first.`
        );
    }
    
    return result;
}

/**
 * Real-time validation for form fields
 * @param {HTMLElement} field - The form field element
 * @param {Function} validator - The validation function to use
 * @param {Array} additionalArgs - Additional arguments for the validator
 * @returns {boolean} Whether the field is valid
 */
export function validateFieldRealTime(field, validator, ...additionalArgs) {
    if (!field) return false;
    
    const value = field.value;
    const validation = validator(value, ...additionalArgs);
    
    // Update field styling and error message
    updateFieldValidationUI(field, validation);
    
    return validation.isValid;
}

/**
 * Updates the UI to show validation state for a field
 * @param {HTMLElement} field - The form field element
 * @param {ValidationResult} validation - The validation result
 */
export function updateFieldValidationUI(field, validation) {
    if (!field) return;
    
    // Remove existing validation classes
    field.classList.remove('border-red-500', 'border-green-500', 'border-gray-300');
    
    // Find or create error message element
    const fieldContainer = field.closest('.form-field') || field.parentElement;
    let errorElement = fieldContainer.querySelector('.field-error');
    
    if (validation.isValid) {
        // Field is valid
        field.classList.add('border-green-500');
        if (errorElement) {
            errorElement.remove();
        }
    } else {
        // Field has error
        field.classList.add('border-red-500');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error text-red-600 text-sm mt-1';
            fieldContainer.appendChild(errorElement);
        }
        
        errorElement.textContent = validation.message;
    }
}

/**
 * Clears all validation UI from a form
 * @param {HTMLElement} form - The form element
 */
export function clearFormValidation(form) {
    if (!form) return;
    
    // Remove validation classes from all fields
    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
        field.classList.remove('border-red-500', 'border-green-500');
        field.classList.add('border-gray-300');
    });
    
    // Remove all error messages
    const errorElements = form.querySelectorAll('.field-error');
    errorElements.forEach(element => element.remove());
}

/**
 * Sets up real-time validation for a form
 * @param {HTMLElement} form - The form element
 * @param {Object} validationConfig - Configuration for field validations
 */
export function setupRealTimeValidation(form, validationConfig) {
    if (!form || !validationConfig) return;
    
    Object.entries(validationConfig).forEach(([fieldName, config]) => {
        const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (!field) return;
        
        // Set up event listeners for real-time validation
        const events = config.events || ['blur', 'input'];
        events.forEach(eventType => {
            field.addEventListener(eventType, () => {
                // Handle args as function or array
                const args = typeof config.args === 'function' ? config.args() : (config.args || []);
                validateFieldRealTime(field, config.validator, ...args);
            });
        });
    });
}

/**
 * Formats validation errors for display
 * @param {Array<string>} errors - Array of error messages
 * @param {string} format - Format type ('list', 'paragraph', 'inline', or 'detailed')
 * @returns {string} Formatted error message
 */
export function formatValidationErrors(errors, format = 'list') {
    if (!errors || errors.length === 0) return '';
    
    switch (format) {
        case 'list':
            return errors.length === 1 
                ? errors[0]
                : `<ul class="list-disc list-inside space-y-1">${errors.map(error => `<li class="text-sm">${error}</li>`).join('')}</ul>`;
        
        case 'paragraph':
            return errors.join(' ');
        
        case 'inline':
            return errors.join(', ');
        
        case 'detailed':
            return `<div class="space-y-2">${errors.map(error => 
                `<div class="flex items-start space-x-2">
                    <svg class="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-sm text-red-700">${error}</span>
                </div>`
            ).join('')}</div>`;
        
        default:
            return errors.join(' ');
    }
}

/**
 * Debounced validation function for performance
 * @param {Function} validator - The validation function
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced validation function
 */
export function debounceValidation(validator, delay = 300) {
    let timeoutId;
    
    return function(...args) {
        clearTimeout(timeoutId);
        
        return new Promise((resolve) => {
            timeoutId = setTimeout(() => {
                resolve(validator(...args));
            }, delay);
        });
    };
}

/**
 * Creates a comprehensive error message with suggested actions
 * @param {string} error - The error message
 * @param {string} field - The field that caused the error
 * @param {string} operation - The operation being performed ('create' or 'delete')
 * @returns {Object} Enhanced error object with suggestions
 */
export function createDetailedErrorMessage(error, field, operation = 'create') {
    const suggestions = {
        name: {
            create: [
                'Choose a unique category name',
                'Use only letters, numbers, spaces, and basic punctuation',
                'Keep the name between 1-100 characters'
            ],
            delete: [
                'Select a valid category from the dropdown',
                'Refresh the page if categories are not loading'
            ]
        },
        level: {
            create: [
                'Select a valid category level (1, 2, or 3)',
                'Level 1 categories are top-level categories',
                'Level 2 and 3 categories require a parent'
            ],
            delete: []
        },
        parent: {
            create: [
                'Select a valid parent category for levels 2 and 3',
                'Level 1 categories should not have a parent',
                'Refresh the page if parent categories are not loading'
            ],
            delete: []
        }
    };
    
    const fieldSuggestions = suggestions[field]?.[operation] || [];
    
    return {
        message: error,
        field: field,
        operation: operation,
        suggestions: fieldSuggestions,
        timestamp: Date.now()
    };
}

/**
 * Validates form data with enhanced error reporting
 * @param {Object} formData - Form data to validate
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Enhanced validation result
 */
export async function validateFormWithDetails(formData, options = {}) {
    const {
        existingNames = [],
        availableParents = [],
        operation = 'create',
        includeServerValidation = false
    } = options;
    
    const result = {
        isValid: true,
        errors: {},
        detailedErrors: [],
        warnings: [],
        suggestions: {}
    };
    
    // Validate name
    const nameValidation = validateCategoryName(formData.name, existingNames);
    if (!nameValidation.isValid) {
        result.isValid = false;
        result.errors.name = nameValidation.message;
        result.detailedErrors.push(createDetailedErrorMessage(nameValidation.message, 'name', operation));
        result.suggestions.name = createDetailedErrorMessage(nameValidation.message, 'name', operation).suggestions;
    }
    
    // Validate level
    const levelValidation = validateCategoryLevel(formData.level);
    if (!levelValidation.isValid) {
        result.isValid = false;
        result.errors.level = levelValidation.message;
        result.detailedErrors.push(createDetailedErrorMessage(levelValidation.message, 'level', operation));
        result.suggestions.level = createDetailedErrorMessage(levelValidation.message, 'level', operation).suggestions;
    }
    
    // Validate parent category
    const parentValidation = validateParentCategory(formData.level, formData.parentId, availableParents);
    if (!parentValidation.isValid) {
        result.isValid = false;
        result.errors.parent = parentValidation.message;
        result.detailedErrors.push(createDetailedErrorMessage(parentValidation.message, 'parent', operation));
        result.suggestions.parent = createDetailedErrorMessage(parentValidation.message, 'parent', operation).suggestions;
    }
    
    // Add warnings for potential issues
    if (formData.name && formData.name.length > 50) {
        result.warnings.push('Long category names may be truncated in some displays');
    }
    
    if (formData.level === 3 && availableParents.length === 0) {
        result.warnings.push('No level 2 categories available as parents. You may need to create level 2 categories first.');
    }
    
    return result;
}

/**
 * Creates a user-friendly error notification
 * @param {Object} validationResult - Result from validateFormWithDetails
 * @param {string} containerSelector - CSS selector for the error container
 */
export function displayDetailedValidationErrors(validationResult, containerSelector = '.validation-errors') {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    // Clear existing errors
    container.innerHTML = '';
    
    if (validationResult.isValid) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    
    // Create error display
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-50 border border-red-200 rounded-lg p-4 space-y-3';
    
    // Add main error message
    const mainMessage = document.createElement('div');
    mainMessage.className = 'flex items-center space-x-2';
    mainMessage.innerHTML = `
        <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
        </svg>
        <span class="text-red-800 font-medium">Please fix the following issues:</span>
    `;
    errorDiv.appendChild(mainMessage);
    
    // Add detailed errors
    validationResult.detailedErrors.forEach(error => {
        const errorItem = document.createElement('div');
        errorItem.className = 'ml-7 space-y-2';
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'text-red-700 text-sm font-medium';
        errorMessage.textContent = error.message;
        errorItem.appendChild(errorMessage);
        
        if (error.suggestions.length > 0) {
            const suggestionsList = document.createElement('ul');
            suggestionsList.className = 'text-red-600 text-xs space-y-1 ml-4';
            
            error.suggestions.forEach(suggestion => {
                const suggestionItem = document.createElement('li');
                suggestionItem.className = 'flex items-start space-x-1';
                suggestionItem.innerHTML = `
                    <span class="text-red-400 mt-0.5">•</span>
                    <span>${suggestion}</span>
                `;
                suggestionsList.appendChild(suggestionItem);
            });
            
            errorItem.appendChild(suggestionsList);
        }
        
        errorDiv.appendChild(errorItem);
    });
    
    // Add warnings if any
    if (validationResult.warnings.length > 0) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'border-t border-red-200 pt-3 mt-3';
        
        const warningHeader = document.createElement('div');
        warningHeader.className = 'flex items-center space-x-2 mb-2';
        warningHeader.innerHTML = `
            <svg class="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
            <span class="text-yellow-800 font-medium text-sm">Warnings:</span>
        `;
        warningDiv.appendChild(warningHeader);
        
        validationResult.warnings.forEach(warning => {
            const warningItem = document.createElement('div');
            warningItem.className = 'text-yellow-700 text-xs ml-6';
            warningItem.textContent = warning;
            warningDiv.appendChild(warningItem);
        });
        
        errorDiv.appendChild(warningDiv);
    }
    
    container.appendChild(errorDiv);
}

/**
 * Validates category deletion with enhanced safety checks
 * @param {Object} categoryInfo - Category information
 * @param {Object} options - Validation options
 * @returns {Object} Enhanced deletion validation result
 */
export function validateCategoryDeletionWithDetails(categoryInfo, options = {}) {
    const { forceDelete = false, confirmationRequired = true } = options;
    
    const result = {
        canDelete: true,
        warnings: [],
        errors: [],
        confirmationRequired: false,
        severity: 'low', // low, medium, high
        impactSummary: '',
        suggestedActions: []
    };
    
    // Check for assigned products
    if (categoryInfo.productCount > 0) {
        const productWarning = `This category is assigned to ${categoryInfo.productCount} product${categoryInfo.productCount === 1 ? '' : 's'}. Deleting it will remove the category from all assigned products.`;
        result.warnings.push(productWarning);
        result.confirmationRequired = true;
        result.severity = categoryInfo.productCount > 10 ? 'high' : 'medium';
        result.suggestedActions.push('Review affected products before deletion');
        result.suggestedActions.push('Consider reassigning products to another category first');
    }
    
    // Check for child categories
    if (categoryInfo.childCount > 0) {
        result.canDelete = false;
        result.severity = 'high';
        const childError = `This category has ${categoryInfo.childCount} child categor${categoryInfo.childCount === 1 ? 'y' : 'ies'}: ${categoryInfo.children.join(', ')}. Please delete all child categories first.`;
        result.errors.push(childError);
        result.suggestedActions.push('Delete child categories first');
        result.suggestedActions.push('Or move child categories to another parent');
    }
    
    // Create impact summary
    if (result.errors.length > 0) {
        result.impactSummary = 'Cannot delete: Category has dependencies that must be resolved first.';
    } else if (result.warnings.length > 0) {
        result.impactSummary = `Deletion will affect ${categoryInfo.productCount} product${categoryInfo.productCount === 1 ? '' : 's'}.`;
    } else {
        result.impactSummary = 'Safe to delete: No dependencies found.';
    }
    
    return result;
}

/**
 * Creates a validation state manager for forms
 * @param {HTMLFormElement} form - The form element
 * @returns {Object} Validation state manager
 */
export function createValidationStateManager(form) {
    const state = {
        isValid: true,
        errors: {},
        warnings: [],
        validatedFields: new Set(),
        lastValidation: null
    };
    
    return {
        /**
         * Update validation state for a field
         * @param {string} fieldName - Name of the field
         * @param {ValidationResult} validation - Validation result
         */
        updateField(fieldName, validation) {
            state.validatedFields.add(fieldName);
            
            if (validation.isValid) {
                delete state.errors[fieldName];
            } else {
                state.errors[fieldName] = validation.message;
            }
            
            state.isValid = Object.keys(state.errors).length === 0;
            state.lastValidation = Date.now();
            
            // Dispatch validation state change event
            const event = new CustomEvent('validationStateChange', {
                detail: {
                    fieldName,
                    validation,
                    formState: { ...state }
                }
            });
            form.dispatchEvent(event);
        },
        
        /**
         * Get current validation state
         * @returns {Object} Current state
         */
        getState() {
            return { ...state };
        },
        
        /**
         * Reset validation state
         */
        reset() {
            state.isValid = true;
            state.errors = {};
            state.warnings = [];
            state.validatedFields.clear();
            state.lastValidation = null;
            
            clearFormValidation(form);
        },
        
        /**
         * Check if form is ready for submission
         * @returns {boolean} True if form is valid and ready
         */
        isReadyForSubmission() {
            return state.isValid && state.validatedFields.size > 0;
        }
    };
}

/**
 * Enhanced field validation with accessibility features
 * @param {HTMLElement} field - The form field element
 * @param {ValidationResult} validation - The validation result
 * @param {Object} options - Validation options
 */
export function updateFieldValidationUIEnhanced(field, validation, options = {}) {
    if (!field) return;
    
    const {
        showSuccessState = true,
        announceToScreenReader = true,
        focusOnError = false
    } = options;
    
    // Remove existing validation classes and attributes
    field.classList.remove('border-red-500', 'border-green-500', 'border-gray-300');
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
    
    // Find or create error message element
    const fieldContainer = field.closest('.form-field') || field.parentElement;
    let errorElement = fieldContainer.querySelector('.field-error');
    let successElement = fieldContainer.querySelector('.field-success');
    
    if (validation.isValid) {
        // Field is valid
        if (showSuccessState) {
            field.classList.add('border-green-500');
            
            if (!successElement && field.value.trim()) {
                successElement = document.createElement('div');
                successElement.className = 'field-success text-green-600 text-sm mt-1 flex items-center space-x-1';
                successElement.innerHTML = `
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span>Valid</span>
                `;
                fieldContainer.appendChild(successElement);
            }
        } else {
            field.classList.add('border-gray-300');
        }
        
        // Remove error elements
        if (errorElement) {
            errorElement.remove();
        }
        
        // Announce success to screen readers
        if (announceToScreenReader && field.value.trim()) {
            field.setAttribute('aria-invalid', 'false');
            announceToScreenReaders(`${field.name || field.id} is valid`);
        }
    } else {
        // Field has error
        field.classList.add('border-red-500');
        field.setAttribute('aria-invalid', 'true');
        
        // Remove success element
        if (successElement) {
            successElement.remove();
        }
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error text-red-600 text-sm mt-1 flex items-start space-x-1';
            errorElement.setAttribute('role', 'alert');
            fieldContainer.appendChild(errorElement);
        }
        
        // Create unique ID for error element
        const errorId = `${field.id || field.name}-error`;
        errorElement.id = errorId;
        field.setAttribute('aria-describedby', errorId);
        
        errorElement.innerHTML = `
            <svg class="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
            <span>${validation.message}</span>
        `;
        
        // Focus on error if requested
        if (focusOnError) {
            field.focus();
        }
        
        // Announce error to screen readers
        if (announceToScreenReader) {
            announceToScreenReaders(`Error in ${field.name || field.id}: ${validation.message}`);
        }
    }
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 */
function announceToScreenReaders(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

/**
 * Validates category name with enhanced checks
 * @param {string} name - Category name to validate
 * @param {Array<string>} existingNames - Existing category names
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Enhanced validation result
 */
export function validateCategoryNameEnhanced(name, existingNames = [], options = {}) {
    const {
        level = null,
        parentName = null,
        checkSimilarity = true,
        suggestAlternatives = true
    } = options;
    
    // Run basic validation first
    const basicValidation = validateCategoryName(name, existingNames);
    if (!basicValidation.isValid) {
        return basicValidation;
    }
    
    const trimmedName = name.trim();
    const result = {
        isValid: true,
        message: '',
        field: 'name',
        warnings: [],
        suggestions: []
    };
    
    // Check for similar names (potential typos)
    if (checkSimilarity && existingNames.length > 0) {
        const similarNames = existingNames.filter(existing => {
            const similarity = calculateStringSimilarity(trimmedName.toLowerCase(), existing.toLowerCase());
            return similarity > 0.8 && similarity < 1.0;
        });
        
        if (similarNames.length > 0) {
            result.warnings.push(`Similar category names exist: ${similarNames.join(', ')}`);
        }
    }
    
    // Check for naming conventions
    if (level && parentName) {
        const hasParentPrefix = trimmedName.toLowerCase().includes(parentName.toLowerCase());
        if (hasParentPrefix) {
            result.warnings.push('Category name includes parent name - this may cause confusion');
        }
    }
    
    // Suggest alternatives if name is too generic
    const genericNames = ['category', 'item', 'product', 'type', 'group'];
    if (genericNames.some(generic => trimmedName.toLowerCase().includes(generic))) {
        result.warnings.push('Consider using a more specific category name');
        if (suggestAlternatives) {
            result.suggestions.push('Use descriptive names that clearly identify the category purpose');
        }
    }
    
    return result;
}

/**
 * Calculate string similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity ratio (0-1)
 */
function calculateStringSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Export validation rules for external use
export { VALIDATION_RULES };