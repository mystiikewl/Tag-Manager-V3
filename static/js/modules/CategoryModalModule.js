/**
 * CategoryModalModule.js - Main module for category modal functionality
 * 
 * This module sets up the modular infrastructure and defines the dependencies
 * for the category modal enhancement system.
 */

import ModuleLoader from '../core/ModuleLoader.js';
import { ModalBase } from '../components/modals/ModalBase.js';
import { CategoryService } from '../services/CategoryService.js';
import * as ValidationUtils from '../utils/ValidationUtils.js';
import * as UIHelpers from '../utils/UIHelpers.js';

/**
 * Register core infrastructure modules
 */

// Register ModalBase as a module
ModuleLoader.define('ModalBase', [], () => {
    return ModalBase;
});

// Register CategoryService as a module
ModuleLoader.define('CategoryService', [], () => {
    return new CategoryService();
});

// Register ValidationUtils as a module
ModuleLoader.define('ValidationUtils', [], () => {
    return ValidationUtils;
});

// Register UIHelpers as a module
ModuleLoader.define('UIHelpers', [], () => {
    return UIHelpers;
});

/**
 * Category Modal Infrastructure Module
 * This module provides the foundation for category modal functionality
 */
ModuleLoader.define('CategoryModalInfrastructure', [
    'ModalBase',
    'CategoryService', 
    'ValidationUtils',
    'UIHelpers'
], (dependencies) => {
    const { ModalBase, CategoryService, ValidationUtils, UIHelpers } = dependencies;
    
    /**
     * Infrastructure class that provides common functionality for category modals
     */
    class CategoryModalInfrastructure {
        constructor() {
            this.modalBase = ModalBase;
            this.categoryService = CategoryService;
            this.validationUtils = ValidationUtils;
            this.uiHelpers = UIHelpers;
            this.initialized = false;
        }
        
        /**
         * Initialize the infrastructure
         * @param {Object} config - Configuration options
         */
        async init(config = {}) {
            if (this.initialized) {
                return;
            }
            
            this.config = {
                enableDebugMode: false,
                cacheTimeout: 5 * 60 * 1000, // 5 minutes
                validationDebounceDelay: 300,
                ...config
            };
            
            // Set up global error handling for modal operations
            this.setupErrorHandling();
            
            // Initialize UI helpers
            this.initializeUIHelpers();
            
            // Set up validation system
            this.setupValidationSystem();
            
            this.initialized = true;
            
            if (this.config.enableDebugMode) {
                console.log('CategoryModalInfrastructure initialized with config:', this.config);
            }
        }
        
        /**
         * Set up global error handling
         * @private
         */
        setupErrorHandling() {
            // Global error handler for modal operations
            window.addEventListener('unhandledrejection', (event) => {
                if (event.reason && event.reason.operation) {
                    console.error('Unhandled modal operation error:', event.reason);
                    
                    // Show user-friendly error message
                    if (event.reason.userMessage) {
                        this.uiHelpers.ModalNotificationManager.showError(event.reason.userMessage);
                    }
                }
            });
        }
        
        /**
         * Initialize UI helpers
         * @private
         */
        initializeUIHelpers() {
            // Set up loading manager cleanup on page unload
            window.addEventListener('beforeunload', () => {
                this.uiHelpers.loadingManager.clearAll();
            });
        }
        
        /**
         * Set up validation system
         * @private
         */
        setupValidationSystem() {
            // Create debounced validation functions
            this.debouncedValidation = {
                categoryName: this.validationUtils.debounceValidation(
                    this.validationUtils.validateCategoryName,
                    this.config.validationDebounceDelay
                ),
                categoryLevel: this.validationUtils.debounceValidation(
                    this.validationUtils.validateCategoryLevel,
                    this.config.validationDebounceDelay
                ),
                parentCategory: this.validationUtils.debounceValidation(
                    this.validationUtils.validateParentCategory,
                    this.config.validationDebounceDelay
                )
            };
        }
        
        /**
         * Create a new modal instance with common configuration
         * @param {string} modalId - Modal element ID
         * @param {Object} options - Modal options
         * @returns {ModalBase} Modal instance
         */
        createModal(modalId, options = {}) {
            const defaultOptions = {
                closeOnEscape: true,
                closeOnOverlay: true,
                preventBodyScroll: true,
                focusOnShow: true,
                animationClass: 'modal-fade'
            };
            
            return new this.modalBase(modalId, { ...defaultOptions, ...options });
        }
        
        /**
         * Get category service instance
         * @returns {CategoryService} Category service instance
         */
        getCategoryService() {
            return this.categoryService;
        }
        
        /**
         * Get validation utilities
         * @returns {Object} Validation utilities
         */
        getValidationUtils() {
            return this.validationUtils;
        }
        
        /**
         * Get UI helpers
         * @returns {Object} UI helpers
         */
        getUIHelpers() {
            return this.uiHelpers;
        }
        
        /**
         * Get debounced validation functions
         * @returns {Object} Debounced validation functions
         */
        getDebouncedValidation() {
            return this.debouncedValidation;
        }
        
        /**
         * Validate form data using the infrastructure
         * @param {Object} formData - Form data to validate
         * @param {Object} options - Validation options
         * @returns {Promise<Object>} Validation result
         */
        async validateFormData(formData, options = {}) {
            const config = {
                checkExistingNames: true,
                validateHierarchy: true,
                ...options
            };
            
            let existingNames = [];
            let availableParents = [];
            
            if (config.checkExistingNames) {
                existingNames = await this.categoryService.getExistingCategoryNames(formData.level);
            }
            
            if (config.validateHierarchy && formData.level > 1) {
                availableParents = await this.categoryService.getParentCategories(formData.level);
            }
            
            return this.validationUtils.validateCategoryForm(formData, existingNames, availableParents);
        }
        
        /**
         * Set up real-time validation for a form
         * @param {HTMLFormElement} form - Form element
         * @param {Object} config - Validation configuration
         */
        setupFormValidation(form, config = {}) {
            const validationConfig = {
                name: {
                    validator: this.debouncedValidation.categoryName,
                    events: ['blur', 'input'],
                    args: []
                },
                level: {
                    validator: this.debouncedValidation.categoryLevel,
                    events: ['change'],
                    args: []
                },
                parentId: {
                    validator: this.debouncedValidation.parentCategory,
                    events: ['change'],
                    args: []
                },
                ...config
            };
            
            this.validationUtils.setupRealTimeValidation(form, validationConfig);
        }
        
        /**
         * Handle form submission with validation and error handling
         * @param {HTMLFormElement} form - Form element
         * @param {Function} submitHandler - Function to handle form submission
         * @param {Object} options - Submission options
         * @returns {Promise<boolean>} True if submission was successful
         */
        async handleFormSubmission(form, submitHandler, options = {}) {
            const config = {
                showLoadingState: true,
                validateBeforeSubmit: true,
                clearErrorsOnSubmit: true,
                ...options
            };
            
            try {
                // Clear existing errors
                if (config.clearErrorsOnSubmit) {
                    this.uiHelpers.ModalNotificationManager.clearInlineErrors(form);
                    this.validationUtils.clearFormValidation(form);
                }
                
                // Get form data
                const formData = this.uiHelpers.ModalFormUtils.serializeForm(form);
                
                // Validate form data
                if (config.validateBeforeSubmit) {
                    const validation = await this.validateFormData(formData);
                    if (!validation.isValid) {
                        // Show validation errors
                        validation.messages.forEach(message => {
                            this.uiHelpers.ModalNotificationManager.showInlineError(form, message, 'error');
                        });
                        return false;
                    }
                }
                
                // Show loading state
                const submitButton = form.querySelector('button[type="submit"]');
                if (config.showLoadingState && submitButton) {
                    this.uiHelpers.loadingManager.show(submitButton, 'Processing...');
                }
                
                // Call submit handler
                const result = await submitHandler(formData);
                
                // Hide loading state
                if (config.showLoadingState && submitButton) {
                    this.uiHelpers.loadingManager.hide(submitButton);
                }
                
                return result;
                
            } catch (error) {
                // Hide loading state on error
                const submitButton = form.querySelector('button[type="submit"]');
                if (config.showLoadingState && submitButton) {
                    this.uiHelpers.loadingManager.hide(submitButton);
                }
                
                // Show error message
                const errorMessage = error.userMessage || error.message || 'An error occurred while processing your request';
                this.uiHelpers.ModalNotificationManager.showInlineError(form, errorMessage, 'error');
                
                throw error;
            }
        }
        
        /**
         * Get debug information about the infrastructure
         * @returns {Object} Debug information
         */
        getDebugInfo() {
            return {
                initialized: this.initialized,
                config: this.config,
                categoryServiceCache: this.categoryService.getCacheStats(),
                moduleInfo: ModuleLoader.getDebugInfo()
            };
        }
    }
    
    return new CategoryModalInfrastructure();
});

/**
 * Export utilities for direct use
 */
export { ModuleLoader };
export { ModalBase };
export { CategoryService };
export { ValidationUtils };
export { UIHelpers };

/**
 * Initialize the category modal infrastructure
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Infrastructure instance
 */
export async function initializeCategoryModalInfrastructure(config = {}) {
    try {
        const infrastructure = await ModuleLoader.require('CategoryModalInfrastructure');
        await infrastructure.init(config);
        return infrastructure;
    } catch (error) {
        console.error('Failed to initialize category modal infrastructure:', error);
        throw error;
    }
}

/**
 * Get the category modal infrastructure instance
 * @returns {Object|null} Infrastructure instance or null if not initialized
 */
export function getCategoryModalInfrastructure() {
    return ModuleLoader.getInstance('CategoryModalInfrastructure');
}

// Auto-initialize with default configuration when module is loaded
// This can be disabled by setting window.DISABLE_AUTO_INIT = true before loading
if (typeof window !== 'undefined' && !window.DISABLE_AUTO_INIT) {
    document.addEventListener('DOMContentLoaded', () => {
        initializeCategoryModalInfrastructure({
            enableDebugMode: window.DEBUG_MODE || false
        }).catch(error => {
            console.error('Auto-initialization of category modal infrastructure failed:', error);
        });
    });
}