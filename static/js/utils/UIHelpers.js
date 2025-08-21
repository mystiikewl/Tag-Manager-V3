/**
 * UIHelpers.js - Enhanced UI utility functions for modal interactions and user feedback
 * 
 * This module provides additional UI utilities specifically for modal components,
 * complementing the existing ui.js utilities with modal-specific functionality.
 */

// Fallback implementations for missing dependencies
const showNotification = window.showNotification || ((message, type) => console.log(`${type}: ${message}`));
const showLoadingOverlay = (show, message) => console.log(`Loading: ${show ? 'show' : 'hide'} - ${message}`);

const createElement = (tag, attrs = {}, children = []) => {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'class') {
            element.className = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });
    return element;
};

const setLoadingState = (element, loading) => {
    if (element) {
        element.disabled = loading;
    }
};

/**
 * Loading state management for individual elements
 */
export class LoadingManager {
    constructor() {
        this.loadingElements = new Map();
    }
    
    /**
     * Show loading state on an element
     * @param {HTMLElement} element - The element to show loading on
     * @param {string} message - Loading message
     * @param {Object} options - Loading options
     */
    show(element, message = 'Loading...', options = {}) {
        if (!element) return;
        
        const config = {
            showSpinner: true,
            disableElement: true,
            preserveContent: false,
            ...options
        };
        
        // Store original state
        const originalState = {
            innerHTML: element.innerHTML,
            disabled: element.disabled,
            className: element.className
        };
        
        this.loadingElements.set(element, originalState);
        
        // Disable element if requested
        if (config.disableElement) {
            element.disabled = true;
        }
        
        // Create loading content
        let loadingContent = `<span>${message}</span>`;
        
        if (config.showSpinner) {
            loadingContent = `
                <div class="flex items-center justify-center">
                    <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>${message}</span>
                </div>
            `;
        }
        
        // Update element content
        if (!config.preserveContent) {
            element.innerHTML = loadingContent;
        }
        
        // Add loading class
        element.classList.add('loading');
    }
    
    /**
     * Hide loading state from an element
     * @param {HTMLElement} element - The element to hide loading from
     */
    hide(element) {
        if (!element || !this.loadingElements.has(element)) return;
        
        const originalState = this.loadingElements.get(element);
        
        // Restore original state
        element.innerHTML = originalState.innerHTML;
        element.disabled = originalState.disabled;
        element.className = originalState.className;
        
        // Clean up
        this.loadingElements.delete(element);
    }
    
    /**
     * Check if element is in loading state
     * @param {HTMLElement} element - The element to check
     * @returns {boolean} True if element is loading
     */
    isLoading(element) {
        return this.loadingElements.has(element);
    }
    
    /**
     * Clear all loading states
     */
    clearAll() {
        this.loadingElements.forEach((originalState, element) => {
            this.hide(element);
        });
    }
}

// Global loading manager instance
export const loadingManager = new LoadingManager();

/**
 * Enhanced notification system for modals
 */
export class ModalNotificationManager {
    /**
     * Show success notification with modal-specific styling
     * @param {string} message - Success message
     * @param {Object} options - Notification options
     */
    static showSuccess(message, options = {}) {
        const config = {
            duration: 4000,
            position: 'top-right',
            ...options
        };
        
        showNotification(message, 'success');
        
        // Auto-hide modal if specified
        if (config.autoHideModal && config.modal) {
            setTimeout(() => {
                config.modal.hide();
            }, config.duration - 500);
        }
    }
    
    /**
     * Show error notification with modal-specific styling
     * @param {string} message - Error message
     * @param {Object} options - Notification options
     */
    static showError(message, options = {}) {
        const config = {
            duration: 6000,
            position: 'top-right',
            persistent: false,
            ...options
        };
        
        showNotification(message, 'error');
    }
    
    /**
     * Show inline error within modal
     * @param {HTMLElement} container - Container element for the error
     * @param {string} message - Error message
     * @param {string} type - Error type ('error', 'warning', 'info')
     */
    static showInlineError(container, message, type = 'error') {
        if (!container) return;
        
        // Remove existing inline errors
        const existingError = container.querySelector('.inline-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Create error element
        const errorElement = createElement('div', {
            class: `inline-error mt-2 p-3 rounded-md text-sm ${this.getInlineErrorClasses(type)}`
        });
        
        // Add icon based on type
        const icon = this.getErrorIcon(type);
        errorElement.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    ${icon}
                </div>
                <div class="ml-3">
                    <p>${message}</p>
                </div>
            </div>
        `;
        
        container.appendChild(errorElement);
        
        // Auto-remove after delay for non-persistent errors
        if (type !== 'error') {
            setTimeout(() => {
                if (errorElement.parentNode) {
                    errorElement.remove();
                }
            }, 5000);
        }
    }
    
    /**
     * Clear inline errors from container
     * @param {HTMLElement} container - Container element
     */
    static clearInlineErrors(container) {
        if (!container) return;
        
        const errors = container.querySelectorAll('.inline-error');
        errors.forEach(error => error.remove());
    }
    
    /**
     * Get CSS classes for inline error types
     * @private
     * @param {string} type - Error type
     * @returns {string} CSS classes
     */
    static getInlineErrorClasses(type) {
        switch (type) {
            case 'error':
                return 'bg-red-50 text-red-800 border border-red-200';
            case 'warning':
                return 'bg-yellow-50 text-yellow-800 border border-yellow-200';
            case 'info':
                return 'bg-blue-50 text-blue-800 border border-blue-200';
            default:
                return 'bg-gray-50 text-gray-800 border border-gray-200';
        }
    }
    
    /**
     * Get icon SVG for error types
     * @private
     * @param {string} type - Error type
     * @returns {string} SVG icon
     */
    static getErrorIcon(type) {
        switch (type) {
            case 'error':
                return `<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>`;
            case 'warning':
                return `<svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>`;
            case 'info':
                return `<svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>`;
            default:
                return '';
        }
    }
}

/**
 * Form utilities for modal forms
 */
export class ModalFormUtils {
    /**
     * Reset form to initial state
     * @param {HTMLFormElement} form - The form to reset
     * @param {Object} options - Reset options
     */
    static resetForm(form, options = {}) {
        if (!form) return;
        
        const config = {
            clearValidation: true,
            resetToDefaults: true,
            focusFirst: true,
            ...options
        };
        
        // Reset form fields
        if (config.resetToDefaults) {
            form.reset();
        }
        
        // Clear validation states
        if (config.clearValidation) {
            this.clearFormValidation(form);
        }
        
        // Clear inline errors
        ModalNotificationManager.clearInlineErrors(form);
        
        // Focus first field
        if (config.focusFirst) {
            const firstField = form.querySelector('input, select, textarea');
            if (firstField) {
                firstField.focus();
            }
        }
    }
    
    /**
     * Clear form validation states
     * @param {HTMLFormElement} form - The form to clear
     */
    static clearFormValidation(form) {
        if (!form) return;
        
        // Remove validation classes
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            field.classList.remove('border-red-500', 'border-green-500');
            field.classList.add('border-gray-300');
        });
        
        // Remove error messages
        const errorElements = form.querySelectorAll('.field-error');
        errorElements.forEach(element => element.remove());
    }
    
    /**
     * Serialize form data to object
     * @param {HTMLFormElement} form - The form to serialize
     * @returns {Object} Form data as object
     */
    static serializeForm(form) {
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }
    
    /**
     * Populate form with data
     * @param {HTMLFormElement} form - The form to populate
     * @param {Object} data - Data to populate form with
     */
    static populateForm(form, data) {
        if (!form || !data) return;
        
        Object.entries(data).forEach(([key, value]) => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'checkbox' || field.type === 'radio') {
                    field.checked = Boolean(value);
                } else {
                    field.value = value;
                }
            }
        });
    }
}

/**
 * Dropdown utilities for dynamic content loading
 */
export class DropdownUtils {
    /**
     * Populate dropdown with options
     * @param {HTMLSelectElement} dropdown - The dropdown element
     * @param {Array} options - Array of option objects
     * @param {Object} config - Configuration options
     */
    static populateDropdown(dropdown, options, config = {}) {
        if (!dropdown) return;
        
        const settings = {
            valueKey: 'id',
            textKey: 'name',
            placeholder: 'Select an option...',
            clearExisting: true,
            ...config
        };
        
        // Clear existing options
        if (settings.clearExisting) {
            dropdown.innerHTML = '';
        }
        
        // Add placeholder option
        if (settings.placeholder) {
            const placeholderOption = createElement('option', {
                value: '',
                disabled: 'disabled',
                selected: 'selected'
            }, [settings.placeholder]);
            dropdown.appendChild(placeholderOption);
        }
        
        // Add options
        options.forEach(option => {
            const optionElement = createElement('option', {
                value: option[settings.valueKey]
            }, [option[settings.textKey]]);
            
            dropdown.appendChild(optionElement);
        });
        
        // Trigger change event
        dropdown.dispatchEvent(new Event('change'));
    }
    
    /**
     * Show loading state in dropdown
     * @param {HTMLSelectElement} dropdown - The dropdown element
     * @param {string} message - Loading message
     */
    static showDropdownLoading(dropdown, message = 'Loading...') {
        if (!dropdown) return;
        
        dropdown.innerHTML = '';
        const loadingOption = createElement('option', {
            value: '',
            disabled: 'disabled',
            selected: 'selected'
        }, [message]);
        dropdown.appendChild(loadingOption);
        dropdown.disabled = true;
    }
    
    /**
     * Show error state in dropdown
     * @param {HTMLSelectElement} dropdown - The dropdown element
     * @param {string} message - Error message
     */
    static showDropdownError(dropdown, message = 'Error loading options') {
        if (!dropdown) return;
        
        dropdown.innerHTML = '';
        const errorOption = createElement('option', {
            value: '',
            disabled: 'disabled',
            selected: 'selected'
        }, [message]);
        dropdown.appendChild(errorOption);
        dropdown.disabled = false;
    }
}

/**
 * Animation utilities for smooth transitions
 */
export class AnimationUtils {
    /**
     * Fade in element
     * @param {HTMLElement} element - Element to fade in
     * @param {number} duration - Animation duration in ms
     * @returns {Promise} Promise that resolves when animation completes
     */
    static fadeIn(element, duration = 300) {
        return new Promise((resolve) => {
            if (!element) {
                resolve();
                return;
            }
            
            element.style.opacity = '0';
            element.style.display = 'block';
            element.style.transition = `opacity ${duration}ms ease-in-out`;
            
            // Force reflow
            element.offsetHeight;
            
            element.style.opacity = '1';
            
            setTimeout(resolve, duration);
        });
    }
    
    /**
     * Fade out element
     * @param {HTMLElement} element - Element to fade out
     * @param {number} duration - Animation duration in ms
     * @returns {Promise} Promise that resolves when animation completes
     */
    static fadeOut(element, duration = 300) {
        return new Promise((resolve) => {
            if (!element) {
                resolve();
                return;
            }
            
            element.style.transition = `opacity ${duration}ms ease-in-out`;
            element.style.opacity = '0';
            
            setTimeout(() => {
                element.style.display = 'none';
                resolve();
            }, duration);
        });
    }
    
    /**
     * Slide down element
     * @param {HTMLElement} element - Element to slide down
     * @param {number} duration - Animation duration in ms
     * @returns {Promise} Promise that resolves when animation completes
     */
    static slideDown(element, duration = 300) {
        return new Promise((resolve) => {
            if (!element) {
                resolve();
                return;
            }
            
            element.style.height = '0';
            element.style.overflow = 'hidden';
            element.style.display = 'block';
            element.style.transition = `height ${duration}ms ease-in-out`;
            
            const targetHeight = element.scrollHeight + 'px';
            
            // Force reflow
            element.offsetHeight;
            
            element.style.height = targetHeight;
            
            setTimeout(() => {
                element.style.height = '';
                element.style.overflow = '';
                resolve();
            }, duration);
        });
    }
    
    /**
     * Slide up element
     * @param {HTMLElement} element - Element to slide up
     * @param {number} duration - Animation duration in ms
     * @returns {Promise} Promise that resolves when animation completes
     */
    static slideUp(element, duration = 300) {
        return new Promise((resolve) => {
            if (!element) {
                resolve();
                return;
            }
            
            element.style.height = element.scrollHeight + 'px';
            element.style.overflow = 'hidden';
            element.style.transition = `height ${duration}ms ease-in-out`;
            
            // Force reflow
            element.offsetHeight;
            
            element.style.height = '0';
            
            setTimeout(() => {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
                resolve();
            }, duration);
        });
    }
}

/**
 * Utility functions for common modal operations
 */

/**
 * Create a confirmation dialog
 * @param {string} message - Confirmation message
 * @param {Object} options - Dialog options
 * @returns {Promise<boolean>} Promise that resolves to user's choice
 */
export function showConfirmDialog(message, options = {}) {
    const config = {
        title: 'Confirm Action',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        type: 'warning',
        ...options
    };
    
    return new Promise((resolve) => {
        // For now, use browser confirm - can be enhanced with custom modal later
        const result = confirm(`${config.title}\n\n${message}`);
        resolve(result);
    });
}

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to execute immediately
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func(...args);
    };
}

/**
 * Throttle function for performance optimization
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}