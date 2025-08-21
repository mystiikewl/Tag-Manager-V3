/**
 * CategoryDeletionModal.js - Category deletion modal component
 * 
 * This component extends ModalBase to provide category deletion functionality
 * with safety checks, category information display, and warning systems.
 */

import { ModalBase } from './ModalBase.js';
import { CategoryService } from '../../services/CategoryService.js';
import * as ValidationUtils from '../../utils/ValidationUtils.js';
import { ModalNotificationManager } from '../../utils/UIHelpers.js';

/**
 * CategoryDeletionModal class for handling category deletion operations
 */
export class CategoryDeletionModal extends ModalBase {
    /**
     * Creates a new CategoryDeletionModal instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        super('deleteCategoryModal', {
            closeOnEscape: true,
            closeOnOverlay: true,
            preventBodyScroll: true,
            focusOnShow: true,
            ...options
        });
        
        // Initialize services
        this.categoryService = new CategoryService();
        
        // Form elements
        this.form = null;
        this.categorySelect = null;
        this.categoryInfoContainer = null;
        this.submitButton = null;
        
        // State management
        this.selectedCategory = null;
        this.categoryInfo = null;
        this.isSubmitting = false;
        
        // Initialize component
        this.initializeElements();
        this.setupFormEventListeners();
    }
    
    /**
     * Initialize DOM elements
     * @private
     */
    initializeElements() {
        if (!this.modalElement) {
            console.error('CategoryDeletionModal: Modal element not found');
            return;
        }
        
        // Get form elements
        this.form = this.modalElement.querySelector('#deleteCategoryForm');
        this.categorySelect = this.modalElement.querySelector('#deleteCategorySelect');
        this.categoryInfoContainer = this.modalElement.querySelector('#deleteCategoryInfo');
        this.submitButton = this.form?.querySelector('button[type="submit"]');
        
        // Get info display elements
        this.infoElements = {
            name: this.modalElement.querySelector('#deleteCategoryName'),
            level: this.modalElement.querySelector('#deleteCategoryLevel'),
            parent: this.modalElement.querySelector('#deleteCategoryParent'),
            productCount: this.modalElement.querySelector('#deleteCategoryProductCount'),
            childCount: this.modalElement.querySelector('#deleteCategoryChildCount')
        };
        
        // Get cancel buttons
        this.cancelButtons = this.modalElement.querySelectorAll('#cancelDeleteCategoryBtn, #cancelDeleteCategoryBtn2');
        
        if (!this.form || !this.categorySelect) {
            console.error('CategoryDeletionModal: Required form elements not found');
        }
    }
    
    /**
     * Set up form event listeners
     * @private
     */
    setupFormEventListeners() {
        if (!this.form || !this.categorySelect) return;
        
        // Category selection change handler
        this.categorySelect.addEventListener('change', async (event) => {
            await this.handleCategorySelection(event.target.value);
        });
        
        // Form submission handler
        this.form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.handleFormSubmission();
        });
        
        // Cancel button handlers
        this.cancelButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.hide();
            });
        });
    }
    
    /**
     * Handle category selection change
     * @private
     * @param {string} categoryName - Selected category name
     */
    async handleCategorySelection(categoryName) {
        if (!categoryName || !categoryName.trim()) {
            this.clearCategoryInfo();
            this.updateSubmitButton(false);
            return;
        }
        
        try {
            // Show loading state
            this.showCategoryInfoLoading();
            
            // Get category information
            this.categoryInfo = await this.categoryService.getCategoryInfo(categoryName);
            this.selectedCategory = categoryName;
            
            // Display category information
            this.displayCategoryInfo(this.categoryInfo);
            
            // Update submit button state
            this.updateSubmitButton(true);
            
        } catch (error) {
            console.error('CategoryDeletionModal: Error loading category info:', error);
            this.showCategoryInfoError(error);
            this.updateSubmitButton(false);
        }
    }
    
    /**
     * Display category information with warnings
     * @private
     * @param {Object} categoryInfo - Category information object
     */
    displayCategoryInfo(categoryInfo) {
        if (!this.categoryInfoContainer || !this.infoElements) return;
        
        // Update info elements
        this.infoElements.name.textContent = categoryInfo.name || '-';
        this.infoElements.level.textContent = categoryInfo.level || '-';
        this.infoElements.parent.textContent = categoryInfo.parent || 'None (Top Level)';
        this.infoElements.productCount.textContent = categoryInfo.product_count || '0';
        this.infoElements.childCount.textContent = categoryInfo.child_count || '0';
        
        // Show the info container
        this.categoryInfoContainer.classList.remove('hidden');
        
        // Add warning styling based on dependencies
        this.updateWarningDisplay(categoryInfo);
    }
    
    /**
     * Update warning display based on category dependencies
     * @private
     * @param {Object} categoryInfo - Category information object
     */
    updateWarningDisplay(categoryInfo) {
        const hasProducts = categoryInfo.product_count > 0;
        const hasChildren = categoryInfo.child_count > 0;
        
        // Remove existing warning classes
        this.categoryInfoContainer.classList.remove('bg-red-50', 'border-red-200', 'bg-yellow-50', 'border-yellow-200', 'bg-gray-50', 'border-gray-200');
        
        if (hasChildren) {
            // High warning - has child categories
            this.categoryInfoContainer.classList.add('bg-red-50', 'border-red-200');
            this.addWarningMessage('This category has child categories. It cannot be deleted until all child categories are removed or reassigned.', 'error');
        } else if (hasProducts) {
            // Medium warning - has products assigned
            this.categoryInfoContainer.classList.add('bg-yellow-50', 'border-yellow-200');
            this.addWarningMessage(`This category is assigned to ${categoryInfo.product_count} product(s). It will be removed from all products.`, 'warning');
        } else {
            // Low warning - safe to delete
            this.categoryInfoContainer.classList.add('bg-gray-50', 'border-gray-200');
            this.addWarningMessage('This category can be safely deleted.', 'info');
        }
    }
    
    /**
     * Add warning message to the info container
     * @private
     * @param {string} message - Warning message
     * @param {string} type - Warning type ('error', 'warning', 'info')
     */
    addWarningMessage(message, type = 'info') {
        // Remove existing warning message
        const existingWarning = this.categoryInfoContainer.querySelector('.warning-message');
        if (existingWarning) {
            existingWarning.remove();
        }
        
        // Create warning message element
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-message mt-3 p-3 rounded-lg flex items-start';
        
        // Set styling based on type
        const typeStyles = {
            error: 'bg-red-100 border border-red-300 text-red-800',
            warning: 'bg-yellow-100 border border-yellow-300 text-yellow-800',
            info: 'bg-blue-100 border border-blue-300 text-blue-800'
        };
        
        warningDiv.className += ` ${typeStyles[type] || typeStyles.info}`;
        
        // Add icon based on type
        const icons = {
            error: '⚠️',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        warningDiv.innerHTML = `
            <span class="mr-2 text-lg">${icons[type] || icons.info}</span>
            <span class="text-sm font-medium">${message}</span>
        `;
        
        this.categoryInfoContainer.appendChild(warningDiv);
    }
    
    /**
     * Show loading state for category info
     * @private
     */
    showCategoryInfoLoading() {
        if (!this.categoryInfoContainer) return;
        
        this.categoryInfoContainer.classList.remove('hidden');
        this.categoryInfoContainer.innerHTML = `
            <div class="flex items-center justify-center p-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span class="ml-2 text-sm text-gray-600">Loading category information...</span>
            </div>
        `;
    }
    
    /**
     * Show error state for category info
     * @private
     * @param {Error} error - The error that occurred
     */
    showCategoryInfoError(error) {
        if (!this.categoryInfoContainer) return;
        
        this.categoryInfoContainer.classList.remove('hidden');
        this.categoryInfoContainer.innerHTML = `
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-start">
                    <svg class="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h4 class="text-sm font-semibold text-red-800">Error Loading Category</h4>
                        <p class="text-sm text-red-700 mt-1">${error.userMessage || 'Failed to load category information. Please try again.'}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Clear category information display
     * @private
     */
    clearCategoryInfo() {
        if (this.categoryInfoContainer) {
            this.categoryInfoContainer.classList.add('hidden');
        }
        
        this.selectedCategory = null;
        this.categoryInfo = null;
    }
    
    /**
     * Update submit button state
     * @private
     * @param {boolean} enabled - Whether the button should be enabled
     */
    updateSubmitButton(enabled) {
        if (!this.submitButton) return;
        
        if (enabled) {
            this.submitButton.disabled = false;
            this.submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            this.submitButton.disabled = true;
            this.submitButton.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    /**
     * Handle form submission
     * @private
     */
    async handleFormSubmission() {
        if (this.isSubmitting || !this.selectedCategory) {
            return;
        }
        
        try {
            // Validate form
            const validation = this.validateForm();
            if (!validation.isValid) {
                this.showValidationErrors(validation.errors);
                return;
            }
            
            // Show loading state
            this.setSubmittingState(true);
            
            // Perform deletion
            const result = await this.categoryService.deleteCategory(this.selectedCategory);
            
            // Show success message
            this.showSuccessMessage(`Category "${this.selectedCategory}" has been successfully deleted.`);
            
            // Hide modal and reset form
            await this.hide({ success: true, deletedCategory: this.selectedCategory, result });
            
        } catch (error) {
            console.error('CategoryDeletionModal: Error deleting category:', error);
            this.showErrorMessage(error);
        } finally {
            this.setSubmittingState(false);
        }
    }
    
    /**
     * Validate the form before submission
     * @private
     * @returns {Object} Validation result
     */
    validateForm() {
        const validation = {
            isValid: true,
            errors: []
        };
        
        // Check if category is selected
        if (!this.selectedCategory || !this.selectedCategory.trim()) {
            validation.isValid = false;
            validation.errors.push('Please select a category to delete.');
        }
        
        // Check if category info is loaded
        if (!this.categoryInfo) {
            validation.isValid = false;
            validation.errors.push('Category information not loaded. Please select a category again.');
        }
        
        return validation;
    }
    
    /**
     * Show validation errors
     * @private
     * @param {Array<string>} errors - Array of error messages
     */
    showValidationErrors(errors) {
        const errorMessage = errors.join('\n');
        ModalNotificationManager.showError(errorMessage);
    }
    
    /**
     * Set submitting state
     * @private
     * @param {boolean} isSubmitting - Whether form is being submitted
     */
    setSubmittingState(isSubmitting) {
        this.isSubmitting = isSubmitting;
        
        if (!this.submitButton) return;
        
        if (isSubmitting) {
            this.submitButton.disabled = true;
            this.submitButton.innerHTML = `
                <div class="flex items-center">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <span>Deleting...</span>
                </div>
            `;
        } else {
            this.submitButton.disabled = false;
            this.submitButton.innerHTML = `
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Category
            `;
        }
    }
    
    /**
     * Show success message
     * @private
     * @param {string} message - Success message
     */
    showSuccessMessage(message) {
        ModalNotificationManager.showSuccess(message);
    }
    
    /**
     * Show error message
     * @private
     * @param {Error} error - Error object
     */
    showErrorMessage(error) {
        const message = error.userMessage || error.message || 'An error occurred while deleting the category.';
        ModalNotificationManager.showError(message);
    }
    
    /**
     * Load categories for the dropdown
     * @private
     */
    async loadCategories() {
        if (!this.categorySelect) return;
        
        try {
            // Show loading state
            this.categorySelect.disabled = true;
            this.categorySelect.innerHTML = '<option value="">Loading categories...</option>';
            
            // Get all categories for deletion
            const categories = await this.categoryService.getAllCategoriesForDeletion();
            
            // Clear and populate dropdown
            this.categorySelect.innerHTML = '<option value="">Select category to delete...</option>';
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.displayName || category.name;
                option.title = category.fullPath || category.name;
                this.categorySelect.appendChild(option);
            });
            
            this.categorySelect.disabled = false;
            
        } catch (error) {
            console.error('CategoryDeletionModal: Error loading categories:', error);
            this.categorySelect.innerHTML = '<option value="">Error loading categories</option>';
            ModalNotificationManager.showError('Failed to load categories. Please refresh and try again.');
        }
    }
    
    /**
     * Reset the form to initial state
     * @private
     */
    resetForm() {
        if (this.form) {
            this.form.reset();
        }
        
        if (this.categorySelect) {
            this.categorySelect.value = '';
        }
        
        this.clearCategoryInfo();
        this.updateSubmitButton(false);
        this.setSubmittingState(false);
        
        this.selectedCategory = null;
        this.categoryInfo = null;
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
        
        // Load categories for dropdown
        await this.loadCategories();
        
        // Pre-select category if provided
        if (data && data.categoryName) {
            this.categorySelect.value = data.categoryName;
            await this.handleCategorySelection(data.categoryName);
        }
    }
    
    /**
     * Called after modal is shown
     * @protected
     * @param {Object} data - Data passed to show method
     */
    async afterShow(data) {
        // Focus the category select dropdown
        if (this.categorySelect && !this.categorySelect.disabled) {
            this.categorySelect.focus();
        }
    }
    
    /**
     * Called before modal is hidden
     * @protected
     * @param {Object} result - Result data from modal interaction
     */
    async beforeHide(result) {
        // Clear any pending operations
        this.setSubmittingState(false);
    }
    
    /**
     * Called after modal is hidden
     * @protected
     * @param {Object} result - Result data from modal interaction
     */
    async afterHide(result) {
        // Reset form state
        this.resetForm();
        
        // Dispatch event for other components to listen to
        if (result && result.success) {
            const event = new CustomEvent('categoryDeleted', {
                detail: {
                    categoryName: result.deletedCategory,
                    result: result.result
                }
            });
            document.dispatchEvent(event);
        }
    }
    
    /**
     * Handle Enter key press
     * @protected
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleEnterKey(event) {
        // If category is selected and form is valid, submit
        if (this.selectedCategory && !this.isSubmitting && !this.submitButton?.disabled) {
            this.handleFormSubmission();
        }
    }
    
    /**
     * Called during cleanup
     * @protected
     */
    onCleanup() {
        // Clear any pending operations
        this.setSubmittingState(false);
        
        // Clear references
        this.selectedCategory = null;
        this.categoryInfo = null;
    }
    
    // Public API methods
    
    /**
     * Show the modal with optional pre-selected category
     * @param {Object} options - Show options
     * @param {string} options.categoryName - Category name to pre-select
     * @returns {Promise} Promise that resolves when modal is shown
     */
    async showModal(options = {}) {
        return this.show(options);
    }
    
    /**
     * Hide the modal
     * @returns {Promise} Promise that resolves when modal is hidden
     */
    async hideModal() {
        return this.hide();
    }
    
    /**
     * Get the currently selected category
     * @returns {string|null} Selected category name
     */
    getSelectedCategory() {
        return this.selectedCategory;
    }
    
    /**
     * Get the current category information
     * @returns {Object|null} Category information object
     */
    getCategoryInfo() {
        return this.categoryInfo;
    }
    
    /**
     * Check if the modal is currently submitting
     * @returns {boolean} True if submitting
     */
    isSubmittingForm() {
        return this.isSubmitting;
    }
}
