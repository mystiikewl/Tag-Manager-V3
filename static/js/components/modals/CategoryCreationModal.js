/**
 * CategoryCreationModal.js - Category creation modal component
 * 
 * This component extends ModalBase to provide a complete category creation interface
 * with form validation, real-time feedback, dynamic parent category loading,
 * and comprehensive error handling.
 */

import { ModalBase } from './ModalBase.js';
import { CategoryService } from '../../services/CategoryService.js';
import { 
    validateCategoryForm, 
    validateFieldRealTime, 
    validateCategoryName,
    validateCategoryLevel,
    validateParentCategory,
    updateFieldValidationUI,
    clearFormValidation,
    setupRealTimeValidation,
    formatValidationErrors
} from '../../utils/ValidationUtils.js';

export class CategoryCreationModal extends ModalBase {
    /**
     * Creates a new CategoryCreationModal instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        super('categoryModal', {
            closeOnEscape: true,
            closeOnOverlay: true,
            preventBodyScroll: true,
            focusOnShow: true,
            ...options
        });
        
        // Initialize services
        this.categoryService = new CategoryService();
        
        // Form elements
        this.form = document.getElementById('categoryForm');
        this.nameField = document.getElementById('categoryName');
        this.levelField = document.getElementById('categoryLevel');
        this.parentField = document.getElementById('parentCategory');
        this.parentDiv = document.getElementById('parentCategoryDiv');
        
        // Button elements
        this.cancelBtn1 = document.getElementById('cancelCategoryBtn');
        this.cancelBtn2 = document.getElementById('cancelCategoryBtn2');
        this.submitBtn = this.form.querySelector('button[type="submit"]');
        
        // State management
        this.isSubmitting = false;
        this.availableParents = [];
        this.existingNames = [];
        this.validationState = {
            name: false,
            level: false,
            parent: true // Initially true since level 1 doesn't need parent
        };
        
        // Bound event handlers
        this.boundHandlers = {
            ...this.boundHandlers,
            formSubmit: this.handleFormSubmit.bind(this),
            levelChange: this.handleLevelChange.bind(this),
            nameInput: this.handleNameInput.bind(this),
            parentChange: this.handleParentChange.bind(this),
            cancelClick: this.handleCancelClick.bind(this)
        };
        
        // Initialize the modal
        this.initializeModal();
    }
    
    /**
     * Initialize modal-specific functionality
     * @private
     */
    initializeModal() {
        if (!this.form || !this.nameField || !this.levelField || !this.parentField) {
            throw new Error('CategoryCreationModal: Required form elements not found');
        }
        
        // Set up form event listeners
        this.setupFormEventListeners();
        
        // Set up real-time validation
        this.setupValidation();
        
        // Initialize form state
        this.resetForm();
    }
    
    /**
     * Set up form event listeners
     * @private
     */
    setupFormEventListeners() {
        // Form submission
        this.form.addEventListener('submit', this.boundHandlers.formSubmit);
        
        // Level change handler
        this.levelField.addEventListener('change', this.boundHandlers.levelChange);
        
        // Name input handler for real-time validation
        this.nameField.addEventListener('input', this.boundHandlers.nameInput);
        this.nameField.addEventListener('blur', this.boundHandlers.nameInput);
        
        // Parent category change handler
        this.parentField.addEventListener('change', this.boundHandlers.parentChange);
        
        // Cancel button handlers
        if (this.cancelBtn1) {
            this.cancelBtn1.addEventListener('click', this.boundHandlers.cancelClick);
        }
        if (this.cancelBtn2) {
            this.cancelBtn2.addEventListener('click', this.boundHandlers.cancelClick);
        }
    }
    
    /**
     * Set up real-time validation for form fields
     * @private
     */
    setupValidation() {
        const validationConfig = {
            categoryName: {
                validator: validateCategoryName,
                events: ['input', 'blur'],
                args: () => [this.existingNames]
            },
            categoryLevel: {
                validator: validateCategoryLevel,
                events: ['change'],
                args: []
            }
        };
        
        setupRealTimeValidation(this.form, validationConfig);
    }
    
    /**
     * Handle form submission
     * @private
     * @param {Event} event - Form submit event
     */
    async handleFormSubmit(event) {
        event.preventDefault();
        
        if (this.isSubmitting) {
            return;
        }
        
        try {
            this.isSubmitting = true;
            this.setLoadingState(true);
            
            // Get form data
            const formData = this.getFormData();
            
            // Validate form
            const validation = await this.validateForm(formData);
            if (!validation.isValid) {
                this.displayValidationErrors(validation.errors);
                return;
            }
            
            // Create category
            const result = await this.categoryService.createCategory(formData);
            
            // Show success message
            this.showSuccessMessage(`Category "${formData.name}" created successfully!`);
            
            // Hide modal and reset form
            await this.hide({ success: true, category: result });
            
        } catch (error) {
            console.error('CategoryCreationModal: Error creating category:', error);
            this.showErrorMessage(error.userMessage || 'Failed to create category. Please try again.');
        } finally {
            this.isSubmitting = false;
            this.setLoadingState(false);
        }
    }
    
    /**
     * Handle category level change
     * @private
     * @param {Event} event - Level change event
     */
    async handleLevelChange(event) {
        const level = parseInt(event.target.value);
        
        try {
            // Validate the level field and update internal state
            const levelValidation = validateCategoryLevel(level);
            updateFieldValidationUI(this.levelField, levelValidation);
            this.validationState.level = levelValidation.isValid;

            // Show/hide parent category field based on level
            if (level === 1) {
                this.hideParentField();
                this.validationState.parent = true;
            } else if (level === 2 || level === 3) {
                await this.showParentField(level);
                // Parent validation state will be set by handleParentChange or initial check
                this.validationState.parent = false; 
            } else {
                this.hideParentField();
                this.validationState.parent = false;
            }
            
            // Update form validation state
            this.updateSubmitButtonState();
            
        } catch (error) {
            console.error('CategoryCreationModal: Error handling level change:', error);
            this.showErrorMessage('Failed to load parent categories. Please try again.');
        }
    }
    
    /**
     * Handle name input for real-time validation
     * @private
     * @param {Event} event - Input event
     */
    handleNameInput(event) {
        const validation = validateCategoryName(event.target.value, this.existingNames);
        updateFieldValidationUI(event.target, validation);
        this.validationState.name = validation.isValid;
        this.updateSubmitButtonState();
    }
    
    /**
     * Handle parent category change
     * @private
     * @param {Event} event - Parent change event
     */
    handleParentChange(event) {
        const level = parseInt(this.levelField.value);
        const validation = validateParentCategory(level, event.target.value, this.availableParents);
        updateFieldValidationUI(event.target, validation);
        this.validationState.parent = validation.isValid;
        this.updateSubmitButtonState();
    }
    
    /**
     * Handle cancel button clicks
     * @private
     */
    handleCancelClick() {
        this.hide({ cancelled: true });
    }
    
    /**
     * Show parent category field and load options
     * @private
     * @param {number} level - Category level
     */
    async showParentField(level) {
        // Show the parent field container
        this.parentDiv.classList.remove('hidden');
        
        // Clear existing options
        this.parentField.innerHTML = '<option value="">Loading parent categories...</option>';
        this.parentField.disabled = true;
        
        try {
            // Load parent categories
            this.availableParents = await this.categoryService.getParentCategories(level);
            
            // Populate dropdown
            this.populateParentDropdown(this.availableParents);
            
        } catch (error) {
            console.error('CategoryCreationModal: Error loading parent categories:', error);
            this.parentField.innerHTML = '<option value="">Error loading categories</option>';
            throw error;
        } finally {
            this.parentField.disabled = false;
        }
    }
    
    /**
     * Hide parent category field
     * @private
     */
    hideParentField() {
        this.parentDiv.classList.add('hidden');
        this.parentField.value = '';
        this.availableParents = [];
    }
    
    /**
     * Populate parent category dropdown
     * @private
     * @param {Array} categories - Array of parent categories
     */
    populateParentDropdown(categories) {
        // Clear existing options
        this.parentField.innerHTML = '<option value="">Select parent category...</option>';
        
        // Add category options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id || category.name;
            option.textContent = category.displayName || category.name;
            this.parentField.appendChild(option);
        });
    }
    
    /**
     * Get form data
     * @private
     * @returns {Object} Form data object
     */
    getFormData() {
        return {
            name: this.nameField.value.trim(),
            level: parseInt(this.levelField.value),
            parentId: this.parentField.value.trim() || null
        };
    }
    
    /**
     * Validate the complete form
     * @private
     * @param {Object} formData - Form data to validate
     * @returns {Promise<Object>} Validation result
     */
    async validateForm(formData) {
        // Get fresh list of existing names
        this.existingNames = await this.categoryService.getExistingCategoryNames(formData.level);
        
        // Validate form
        const validation = validateCategoryForm(formData, this.existingNames, this.availableParents);
        
        // Additional server-side validation
        if (validation.isValid) {
            try {
                const hierarchyValidation = await this.categoryService.validateCategoryHierarchy(formData);
                if (!hierarchyValidation.isValid) {
                    validation.isValid = false;
                    validation.errors = { ...validation.errors, ...hierarchyValidation.errors };
                    validation.messages.push(...hierarchyValidation.errors);
                }
            } catch (error) {
                console.warn('CategoryCreationModal: Server validation failed:', error);
                // Continue with client-side validation only
            }
        }
        
        return validation;
    }
    
    /**
     * Display validation errors in the form
     * @private
     * @param {Object} errors - Validation errors object
     */
    displayValidationErrors(errors) {
        // Update field-specific errors
        if (errors.name) {
            updateFieldValidationUI(this.nameField, { isValid: false, message: errors.name });
        }
        if (errors.level) {
            updateFieldValidationUI(this.levelField, { isValid: false, message: errors.level });
        }
        if (errors.parent) {
            updateFieldValidationUI(this.parentField, { isValid: false, message: errors.parent });
        }
        
        // Show general error message
        const errorMessages = Object.values(errors);
        if (errorMessages.length > 0) {
            this.showErrorMessage(formatValidationErrors(errorMessages));
        }
    }
    
    /**
     * Update submit button state based on validation
     * @private
     */
    updateSubmitButtonState() {
        const isValid = this.validationState.name && 
                       this.validationState.level && 
                       this.validationState.parent;
        
        this.submitBtn.disabled = !isValid || this.isSubmitting;
        
        if (isValid && !this.isSubmitting) {
            this.submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            this.submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    /**
     * Set loading state for the form
     * @private
     * @param {boolean} loading - Whether form is in loading state
     */
    setLoadingState(loading) {
        const elements = [this.nameField, this.levelField, this.parentField, this.submitBtn];
        
        elements.forEach(element => {
            if (element) {
                element.disabled = loading;
            }
        });
        
        if (loading) {
            this.submitBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
            `;
        } else {
            this.submitBtn.innerHTML = 'Create Category';
        }
        
        this.updateSubmitButtonState();
    }
    
    /**
     * Show success message
     * @private
     * @param {string} message - Success message
     */
    showSuccessMessage(message) {
        // Dispatch success event for other components to listen to
        const event = new CustomEvent('categoryCreated', {
            detail: { message, timestamp: Date.now() }
        });
        document.dispatchEvent(event);
        
        // Show success notification (if notification system exists)
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            console.log('Success:', message);
        }
    }
    
    /**
     * Show error message
     * @private
     * @param {string} message - Error message
     */
    showErrorMessage(message) {
        // Find or create error message container
        let errorContainer = this.form.querySelector('.form-error-message');
        
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'form-error-message bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4';
            this.form.appendChild(errorContainer);
        }
        
        errorContainer.innerHTML = message;
        errorContainer.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorContainer) {
                errorContainer.classList.add('hidden');
            }
        }, 5000);
        
        // Show error notification (if notification system exists)
        if (window.showNotification) {
            window.showNotification(message, 'error');
        }
    }
    
    /**
     * Reset form to initial state
     * @private
     */
    resetForm() {
        // Clear form fields
        this.form.reset();
        
        // Clear validation state
        clearFormValidation(this.form);
        
        // Hide parent field
        this.hideParentField();
        
        // Reset validation state
        this.validationState = {
            name: false,
            level: false,
            parent: true
        };
        
        // Update submit button
        this.updateSubmitButtonState();
        
        // Clear error messages
        const errorContainer = this.form.querySelector('.form-error-message');
        if (errorContainer) {
            errorContainer.classList.add('hidden');
        }
        
        // Reset loading state
        this.setLoadingState(false);
    }
    
    /**
     * Load existing category names for validation
     * @private
     */
    async loadExistingNames() {
        try {
            this.existingNames = await this.categoryService.getExistingCategoryNames();
        } catch (error) {
            console.warn('CategoryCreationModal: Failed to load existing category names:', error);
            this.existingNames = [];
        }
    }
    
    // Lifecycle hooks override
    
    /**
     * Called before modal is shown
     * @protected
     * @param {Object} data - Data passed to show method
     */
    async beforeShow(data) {
        // Reset form state
        this.resetForm();
        
        // Load existing category names for validation
        await this.loadExistingNames();
        
        // Focus on name field
        setTimeout(() => {
            if (this.nameField) {
                this.nameField.focus();
            }
        }, 100);
    }
    
    /**
     * Called after modal is shown
     * @protected
     * @param {Object} data - Data passed to show method
     */
    async afterShow(data) {
        // Pre-populate form if data is provided
        if (data) {
            if (data.name) {
                this.nameField.value = data.name;
                this.handleNameInput({ target: this.nameField });
            }
            if (data.level) {
                this.levelField.value = data.level;
                await this.handleLevelChange({ target: this.levelField });
            }
            if (data.parentId) {
                this.parentField.value = data.parentId;
                this.handleParentChange({ target: this.parentField });
            }
        }
        // Ensure submit button state is updated after all fields are potentially pre-populated
        this.updateSubmitButtonState();
    }
    
    /**
     * Called before modal is hidden
     * @protected
     * @param {Object} result - Result data from modal interaction
     */
    async beforeHide(result) {
        // Cancel any ongoing operations
        if (this.isSubmitting) {
            // Note: In a real implementation, you might want to cancel the API request
            console.warn('CategoryCreationModal: Hiding modal while submission in progress');
        }
    }
    
    /**
     * Called after modal is hidden
     * @protected
     * @param {Object} result - Result data from modal interaction
     */
    async afterHide(result) {
        // Reset form state
        this.resetForm();
        
        // Dispatch modal closed event
        const event = new CustomEvent('categoryModalClosed', {
            detail: { result, timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Handle Enter key press for form submission
     * @protected
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleEnterKey(event) {
        // Only submit if form is valid and not already submitting
        if (!this.submitBtn.disabled && !this.isSubmitting) {
            this.form.dispatchEvent(new Event('submit'));
        }
    }
    
    /**
     * Clean up event listeners and resources
     */
    cleanup() {
        // Remove form event listeners
        if (this.form) {
            this.form.removeEventListener('submit', this.boundHandlers.formSubmit);
        }
        if (this.levelField) {
            this.levelField.removeEventListener('change', this.boundHandlers.levelChange);
        }
        if (this.nameField) {
            this.nameField.removeEventListener('input', this.boundHandlers.nameInput);
            this.nameField.removeEventListener('blur', this.boundHandlers.nameInput);
        }
        if (this.parentField) {
            this.parentField.removeEventListener('change', this.boundHandlers.parentChange);
        }
        if (this.cancelBtn1) {
            this.cancelBtn1.removeEventListener('click', this.boundHandlers.cancelClick);
        }
        if (this.cancelBtn2) {
            this.cancelBtn2.removeEventListener('click', this.boundHandlers.cancelClick);
        }
        
        // Call parent cleanup
        super.cleanup();
    }
    
    // Public API methods
    
    /**
     * Show the modal with optional pre-populated data
     * @param {Object} data - Optional data to pre-populate form
     * @param {string} data.name - Pre-populate category name
     * @param {number} data.level - Pre-populate category level
     * @param {string} data.parentId - Pre-populate parent category
     * @returns {Promise} Promise that resolves when modal is shown
     */
    async showModal(data = null) {
        return this.show(data);
    }
    
    /**
     * Hide the modal
     * @param {Object} result - Optional result data
     * @returns {Promise} Promise that resolves when modal is hidden
     */
    async hideModal(result = null) {
        return this.hide(result);
    }
    
    /**
     * Check if modal is currently visible
     * @returns {boolean} True if modal is visible
     */
    isVisible() {
        return this.visible;
    }
    
    /**
     * Check if form is currently submitting
     * @returns {boolean} True if form is submitting
     */
    isFormSubmitting() {
        return this.isSubmitting;
    }
}
