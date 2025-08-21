/**
 * CategoryManager.js - Category operations coordinator
 * 
 * This class coordinates category modal operations, manages UI refresh,
 * handles event delegation for button clicks, and integrates with existing
 * statistics and UI components.
 */

import { CategoryCreationModal } from '../components/modals/CategoryCreationModal.js';
import { CategoryDeletionModal } from '../components/modals/CategoryDeletionModal.js';
import { CategoryService } from '../services/CategoryService.js';
import { ModalNotificationManager, loadingManager } from '../utils/UIHelpers.js';

/**
 * CategoryManager class for coordinating modal operations
 */
export class CategoryManager {
    /**
     * Creates a new CategoryManager instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.config = {
            enableDebugMode: false,
            autoRefreshUI: true,
            refreshDelay: 100, // Delay before refreshing UI after operations
            ...options
        };
        
        // Initialize services
        this.categoryService = new CategoryService();
        
        // Modal instances
        this.creationModal = null;
        this.deletionModal = null;
        
        // UI element references
        this.uiElements = {
            // Button elements
            newCategoryBtn: null,
            deleteCategoryBtn: null,
            exportButtons: [],
            
            // Statistics elements
            totalProducts: null,
            categorizedProducts: null,
            uncategorizedProducts: null,
            totalCategories: null,
            
            // Mobile statistics elements
            mobileTotalProducts: null,
            mobileCategorizedProducts: null,
            mobileUncategorizedProducts: null,
            mobileTotalCategories: null,
            
            // Category dropdowns and displays
            categoryDropdowns: [],
            categoryDisplays: []
        };
        
        // State management
        this.isInitialized = false;
        this.operationInProgress = false;
        this.lastOperationResult = null;
        
        // Event handlers
        this.boundHandlers = {
            newCategoryClick: this.handleNewCategoryClick.bind(this),
            deleteCategoryClick: this.handleDeleteCategoryClick.bind(this),
            exportClick: this.handleExportClick.bind(this),
            categoryOperationComplete: this.handleCategoryOperationComplete.bind(this),
            documentClick: this.handleDocumentClick.bind(this)
        };
        
        // Initialize the manager
        this.initialize();
    }
    
    /**
     * Initialize the CategoryManager
     * @private
     */
    async initialize() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Initialize UI elements
            this.initializeUIElements();
            
            // Initialize modals
            await this.initializeModals();
            
            // Set up event delegation
            this.setupEventDelegation();
            
            // Set up global event listeners
            this.setupGlobalEventListeners();
            
            // Initial UI refresh
            if (this.config.autoRefreshUI) {
                await this.refreshAllUI();
            }
            
            this.isInitialized = true;
            
            if (this.config.enableDebugMode) {
                console.log('CategoryManager initialized successfully');
            }
            
        } catch (error) {
            console.error('CategoryManager: Failed to initialize:', error);
            throw error;
        }
    }
    
    /**
     * Initialize UI element references
     * @private
     */
    initializeUIElements() {
        // Button elements
        this.uiElements.newCategoryBtn = document.getElementById('newCategoryBtn');
        this.uiElements.deleteCategoryBtn = document.getElementById('deleteCategoryBtn');
        
        // Export buttons (multiple possible locations)
        const exportSelectors = [
            '#quick-export',
            '#data-export-btn',
            '#export-csv-btn',
            '.quick-export-mobile'
        ];
        
        exportSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element && !this.uiElements.exportButtons.includes(element)) {
                    this.uiElements.exportButtons.push(element);
                }
            });
        });
        
        // Statistics elements (desktop)
        this.uiElements.totalProducts = document.getElementById('total-products');
        this.uiElements.categorizedProducts = document.getElementById('categorized-products');
        this.uiElements.uncategorizedProducts = document.getElementById('uncategorized-products');
        this.uiElements.totalCategories = document.getElementById('total-categories');
        
        // Statistics elements (mobile)
        this.uiElements.mobileTotalProducts = document.getElementById('mobile-total-products');
        this.uiElements.mobileCategorizedProducts = document.getElementById('mobile-categorized-products');
        this.uiElements.mobileUncategorizedProducts = document.getElementById('mobile-uncategorized-products');
        this.uiElements.mobileTotalCategories = document.getElementById('mobile-total-categories');
        
        // Category dropdowns and displays
        this.uiElements.categoryDropdowns = Array.from(document.querySelectorAll('[data-category-dropdown]'));
        this.uiElements.categoryDisplays = Array.from(document.querySelectorAll('[data-category-display]'));
        
        if (this.config.enableDebugMode) {
            console.log('CategoryManager: UI elements initialized:', this.uiElements);
        }
    }
    
    /**
     * Initialize modal instances
     * @private
     */
    async initializeModals() {
        try {
            // Initialize creation modal
            this.creationModal = new CategoryCreationModal({
                enableDebugMode: this.config.enableDebugMode
            });
            
            if (this.config.enableDebugMode) {
                console.log('CategoryManager: Creation modal initialized successfully');
            }
            
        } catch (error) {
            console.warn('CategoryManager: Failed to initialize creation modal:', error);
            this.creationModal = null;
        }
        
        try {
            // Initialize deletion modal
            this.deletionModal = new CategoryDeletionModal({
                enableDebugMode: this.config.enableDebugMode
            });
            
            if (this.config.enableDebugMode) {
                console.log('CategoryManager: Deletion modal initialized successfully');
            }
            
        } catch (error) {
            console.warn('CategoryManager: Failed to initialize deletion modal:', error);
            this.deletionModal = null;
        }
        
        if (this.config.enableDebugMode) {
            console.log('CategoryManager: Modal initialization completed');
        }
    }
    
    /**
     * Set up event delegation for button clicks
     * @private
     */
    setupEventDelegation() {
        // New category button
        if (this.uiElements.newCategoryBtn) {
            this.uiElements.newCategoryBtn.addEventListener('click', this.boundHandlers.newCategoryClick);
        }
        
        // Delete category button
        if (this.uiElements.deleteCategoryBtn) {
            this.uiElements.deleteCategoryBtn.addEventListener('click', this.boundHandlers.deleteCategoryClick);
        }
        
        // Export buttons
        this.uiElements.exportButtons.forEach(button => {
            button.addEventListener('click', this.boundHandlers.exportClick);
        });
        
        // Document-level click handling for dynamic elements
        document.addEventListener('click', this.boundHandlers.documentClick);
        
        if (this.config.enableDebugMode) {
            console.log('CategoryManager: Event delegation set up');
        }
    }
    
    /**
     * Set up global event listeners
     * @private
     */
    setupGlobalEventListeners() {
        // Listen for category operation completion events
        document.addEventListener('categoryOperationComplete', this.boundHandlers.categoryOperationComplete);
        
        // Listen for modal-specific events
        document.addEventListener('categoryCreated', (event) => {
            this.handleCategoryCreated(event.detail);
        });
        
        document.addEventListener('categoryDeleted', (event) => {
            this.handleCategoryDeleted(event.detail);
        });
        
        // Listen for modal closed events
        document.addEventListener('categoryModalClosed', (event) => {
            this.handleModalClosed(event.detail);
        });
    }
    
    /**
     * Handle new category button click
     * @private
     * @param {Event} event - Click event
     */
    async handleNewCategoryClick(event) {
        event.preventDefault();
        
        if (this.operationInProgress) {
            return;
        }
        
        try {
            this.operationInProgress = true;
            
            // Show loading state on button
            loadingManager.show(this.uiElements.newCategoryBtn, 'Opening...');
            
            // Show creation modal
            const result = await this.showCategoryCreationModal();
            
            if (result && result.success) {
                // Handle successful creation
                await this.handleSuccessfulOperation('create', result);
            }
            
        } catch (error) {
            console.error('CategoryManager: Error handling new category click:', error);
            ModalNotificationManager.showError('Failed to open category creation modal');
        } finally {
            this.operationInProgress = false;
            loadingManager.hide(this.uiElements.newCategoryBtn);
        }
    }
    
    /**
     * Handle delete category button click
     * @private
     * @param {Event} event - Click event
     */
    async handleDeleteCategoryClick(event) {
        event.preventDefault();
        
        if (this.operationInProgress) {
            return;
        }
        
        try {
            this.operationInProgress = true;
            
            // Show loading state on button
            loadingManager.show(this.uiElements.deleteCategoryBtn, 'Opening...');
            
            // Show deletion modal
            const result = await this.showCategoryDeletionModal();
            
            if (result && result.success) {
                // Handle successful deletion
                await this.handleSuccessfulOperation('delete', result);
            }
            
        } catch (error) {
            console.error('CategoryManager: Error handling delete category click:', error);
            ModalNotificationManager.showError('Failed to open category deletion modal');
        } finally {
            this.operationInProgress = false;
            loadingManager.hide(this.uiElements.deleteCategoryBtn);
        }
    }
    
    /**
     * Handle export button click
     * @private
     * @param {Event} event - Click event
     */
    async handleExportClick(event) {
        event.preventDefault();
        
        const button = event.currentTarget;
        
        try {
            // Show loading state
            loadingManager.show(button, 'Exporting...');
            
            // Trigger export functionality
            await this.triggerExport();
            
        } catch (error) {
            console.error('CategoryManager: Error handling export click:', error);
            ModalNotificationManager.showError('Export failed. Please try again.');
        } finally {
            loadingManager.hide(button);
        }
    }
    
    /**
     * Handle document click for dynamic elements
     * @private
     * @param {Event} event - Click event
     */
    handleDocumentClick(event) {
        const target = event.target;
        
        // Handle dynamically created category buttons
        if (target.matches('[data-category-action="create"]')) {
            event.preventDefault();
            this.handleNewCategoryClick(event);
        } else if (target.matches('[data-category-action="delete"]')) {
            event.preventDefault();
            this.handleDeleteCategoryClick(event);
        } else if (target.matches('[data-export-action]')) {
            event.preventDefault();
            this.handleExportClick(event);
        }
    }
    
    /**
     * Handle category operation completion
     * @private
     * @param {CustomEvent} event - Category operation event
     */
    async handleCategoryOperationComplete(event) {
        const { operation, categoryData } = event.detail;
        
        if (this.config.enableDebugMode) {
            console.log('CategoryManager: Category operation completed:', operation, categoryData);
        }
        
        // Refresh UI after operation
        if (this.config.autoRefreshUI) {
            setTimeout(() => {
                this.refreshAllUI();
            }, this.config.refreshDelay);
        }
    }
    
    /**
     * Handle successful category creation
     * @private
     * @param {Object} details - Event details
     */
    async handleCategoryCreated(details) {
        this.lastOperationResult = {
            type: 'create',
            success: true,
            details,
            timestamp: Date.now()
        };
        
        // Show success notification
        ModalNotificationManager.showSuccess(details.message || 'Category created successfully!');
        
        // Refresh UI
        await this.refreshAllUI();
    }
    
    /**
     * Handle successful category deletion
     * @private
     * @param {Object} details - Event details
     */
    async handleCategoryDeleted(details) {
        this.lastOperationResult = {
            type: 'delete',
            success: true,
            details,
            timestamp: Date.now()
        };
        
        // Show success notification
        ModalNotificationManager.showSuccess(`Category "${details.categoryName}" deleted successfully!`);
        
        // Refresh UI
        await this.refreshAllUI();
    }
    
    /**
     * Handle modal closed event
     * @private
     * @param {Object} details - Event details
     */
    handleModalClosed(details) {
        if (this.config.enableDebugMode) {
            console.log('CategoryManager: Modal closed:', details);
        }
        
        // Reset operation state
        this.operationInProgress = false;
    }
    
    /**
     * Handle successful operation completion
     * @private
     * @param {string} operation - Operation type ('create' or 'delete')
     * @param {Object} result - Operation result
     */
    async handleSuccessfulOperation(operation, result) {
        this.lastOperationResult = {
            type: operation,
            success: true,
            result,
            timestamp: Date.now()
        };
        
        // Refresh UI components
        if (this.config.autoRefreshUI) {
            await this.refreshAllUI();
        }
        
        if (this.config.enableDebugMode) {
            console.log(`CategoryManager: ${operation} operation completed successfully:`, result);
        }
    }
    
    /**
     * Show category creation modal
     * @param {Object} data - Optional pre-population data
     * @returns {Promise<Object>} Modal result
     */
    async showCategoryCreationModal(data = null) {
        if (!this.creationModal) {
            ModalNotificationManager.showError('Category creation modal is not available');
            return { success: false, error: 'Modal not initialized' };
        }
        
        return this.creationModal.showModal(data);
    }
    
    /**
     * Show category deletion modal
     * @param {Object} options - Optional modal options
     * @returns {Promise<Object>} Modal result
     */
    async showCategoryDeletionModal(options = {}) {
        if (!this.deletionModal) {
            ModalNotificationManager.showError('Category deletion modal is not available');
            return { success: false, error: 'Modal not initialized' };
        }
        
        return this.deletionModal.showModal(options);
    }
    
    /**
     * Trigger export functionality
     * @private
     */
    async triggerExport() {
        // Find the actual export button in the existing system
        const exportBtn = document.getElementById('export-csv-btn');
        
        if (exportBtn) {
            // Trigger the existing export functionality
            exportBtn.click();
        } else {
            // Fallback: trigger export via API
            try {
                const response = await fetch('/export-csv', {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/csv'
                    }
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `categories_export_${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    ModalNotificationManager.showSuccess('Export completed successfully!');
                } else {
                    throw new Error('Export request failed');
                }
            } catch (error) {
                console.error('CategoryManager: Export failed:', error);
                throw error;
            }
        }
    }
    
    /**
     * Refresh all UI components
     */
    async refreshAllUI() {
        try {
            // Refresh statistics
            await this.refreshStatistics();
            
            // Refresh category dropdowns
            await this.refreshCategoryDropdowns();
            
            // Refresh category displays
            await this.refreshCategoryDisplays();
            
            // Refresh product displays if they exist
            await this.refreshProductDisplays();
            
            if (this.config.enableDebugMode) {
                console.log('CategoryManager: UI refresh completed');
            }
            
        } catch (error) {
            console.error('CategoryManager: Error refreshing UI:', error);
        }
    }
    
    /**
     * Refresh statistics displays
     * @private
     */
    async refreshStatistics() {
        try {
            // Try to use existing statistics manager if available
            if (window.loadStatistics && typeof window.loadStatistics === 'function') {
                await window.loadStatistics();
                return;
            }
            
            // Fallback: Load statistics directly
            const response = await fetch('/api/statistics');
            if (response.ok) {
                const stats = await response.json();
                this.updateStatisticsDisplay(stats);
            }
            
        } catch (error) {
            console.warn('CategoryManager: Failed to refresh statistics:', error);
        }
    }
    
    /**
     * Update statistics display elements
     * @private
     * @param {Object} stats - Statistics data
     */
    updateStatisticsDisplay(stats) {
        // Desktop statistics
        if (this.uiElements.totalProducts) {
            this.uiElements.totalProducts.textContent = stats.total_products || '--';
        }
        if (this.uiElements.categorizedProducts) {
            this.uiElements.categorizedProducts.textContent = stats.categorized_products || '--';
        }
        if (this.uiElements.uncategorizedProducts) {
            this.uiElements.uncategorizedProducts.textContent = stats.uncategorized_products || '--';
        }
        if (this.uiElements.totalCategories) {
            this.uiElements.totalCategories.textContent = stats.total_categories || '--';
        }
        
        // Mobile statistics
        if (this.uiElements.mobileTotalProducts) {
            this.uiElements.mobileTotalProducts.textContent = stats.total_products || '--';
        }
        if (this.uiElements.mobileCategorizedProducts) {
            this.uiElements.mobileCategorizedProducts.textContent = stats.categorized_products || '--';
        }
        if (this.uiElements.mobileUncategorizedProducts) {
            this.uiElements.mobileUncategorizedProducts.textContent = stats.uncategorized_products || '--';
        }
        if (this.uiElements.mobileTotalCategories) {
            this.uiElements.mobileTotalCategories.textContent = stats.total_categories || '--';
        }
        
        // Show statistics content and hide loading
        const statsContent = document.getElementById('stats-content');
        const statsLoading = document.getElementById('stats-loading');
        const mobileStatsContent = document.getElementById('mobile-stats-content');
        const mobileStatsLoading = document.getElementById('mobile-stats-loading');
        
        if (statsContent && statsLoading) {
            statsLoading.classList.add('hidden');
            statsContent.classList.remove('hidden');
        }
        
        if (mobileStatsContent && mobileStatsLoading) {
            mobileStatsLoading.classList.add('hidden');
            mobileStatsContent.classList.remove('hidden');
        }
    }
    
    /**
     * Refresh category dropdowns
     * @private
     */
    async refreshCategoryDropdowns() {
        for (const dropdown of this.uiElements.categoryDropdowns) {
            try {
                const level = dropdown.dataset.categoryLevel;
                const parentId = dropdown.dataset.parentId;
                
                if (level && level !== '1') {
                    // Refresh parent category options
                    const parents = await this.categoryService.getParentCategories(parseInt(level));
                    this.populateDropdown(dropdown, parents);
                } else if (level === '1') {
                    // Refresh level 1 categories
                    const level1Categories = await this.categoryService.getParentCategories(2); // Level 1 categories are parents for level 2
                    this.populateDropdown(dropdown, level1Categories);
                }
            } catch (error) {
                console.warn('CategoryManager: Failed to refresh dropdown:', dropdown, error);
            }
        }
    }
    
    /**
     * Refresh category displays
     * @private
     */
    async refreshCategoryDisplays() {
        for (const display of this.uiElements.categoryDisplays) {
            try {
                // Trigger refresh event on category display elements
                const event = new CustomEvent('refreshCategoryDisplay');
                display.dispatchEvent(event);
            } catch (error) {
                console.warn('CategoryManager: Failed to refresh category display:', display, error);
            }
        }
    }
    
    /**
     * Refresh product displays
     * @private
     */
    async refreshProductDisplays() {
        const productElements = document.querySelectorAll('[data-product-display]');
        
        for (const element of productElements) {
            try {
                // Trigger refresh event on product display elements
                const event = new CustomEvent('refreshProductDisplay');
                element.dispatchEvent(event);
            } catch (error) {
                console.warn('CategoryManager: Failed to refresh product display:', element, error);
            }
        }
    }
    
    /**
     * Populate a dropdown with options
     * @private
     * @param {HTMLSelectElement} dropdown - Dropdown element
     * @param {Array} options - Array of option objects
     */
    populateDropdown(dropdown, options) {
        // Store current value
        const currentValue = dropdown.value;
        
        // Clear existing options except the first one (usually a placeholder)
        const firstOption = dropdown.querySelector('option');
        dropdown.innerHTML = '';
        if (firstOption && firstOption.value === '') {
            dropdown.appendChild(firstOption);
        }
        
        // Add new options
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.id || option.name;
            optionElement.textContent = option.displayName || option.name;
            dropdown.appendChild(optionElement);
        });
        
        // Restore previous value if it still exists
        if (currentValue && dropdown.querySelector(`option[value="${currentValue}"]`)) {
            dropdown.value = currentValue;
        }
        
        // Trigger change event
        dropdown.dispatchEvent(new Event('change'));
    }
    
    /**
     * Get the last operation result
     * @returns {Object|null} Last operation result
     */
    getLastOperationResult() {
        return this.lastOperationResult;
    }
    
    /**
     * Check if an operation is currently in progress
     * @returns {boolean} True if operation is in progress
     */
    isOperationInProgress() {
        return this.operationInProgress;
    }
    
    /**
     * Get debug information about the manager
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            operationInProgress: this.operationInProgress,
            lastOperationResult: this.lastOperationResult,
            config: this.config,
            uiElements: {
                newCategoryBtn: !!this.uiElements.newCategoryBtn,
                deleteCategoryBtn: !!this.uiElements.deleteCategoryBtn,
                exportButtonsCount: this.uiElements.exportButtons.length,
                statisticsElementsCount: Object.keys(this.uiElements).filter(key => 
                    key.includes('Products') || key.includes('Categories')
                ).length,
                categoryDropdownsCount: this.uiElements.categoryDropdowns.length,
                categoryDisplaysCount: this.uiElements.categoryDisplays.length
            },
            modals: {
                creationModal: !!this.creationModal,
                deletionModal: !!this.deletionModal
            }
        };
    }
    
    /**
     * Clean up resources and event listeners
     */
    cleanup() {
        // Remove event listeners
        if (this.uiElements.newCategoryBtn) {
            this.uiElements.newCategoryBtn.removeEventListener('click', this.boundHandlers.newCategoryClick);
        }
        
        if (this.uiElements.deleteCategoryBtn) {
            this.uiElements.deleteCategoryBtn.removeEventListener('click', this.boundHandlers.deleteCategoryClick);
        }
        
        this.uiElements.exportButtons.forEach(button => {
            button.removeEventListener('click', this.boundHandlers.exportClick);
        });
        
        document.removeEventListener('click', this.boundHandlers.documentClick);
        document.removeEventListener('categoryOperationComplete', this.boundHandlers.categoryOperationComplete);
        
        // Clean up modals
        if (this.creationModal) {
            this.creationModal.cleanup();
        }
        
        if (this.deletionModal) {
            this.deletionModal.cleanup();
        }
        
        // Clear loading states
        loadingManager.clearAll();
        
        // Reset state
        this.isInitialized = false;
        this.operationInProgress = false;
        this.lastOperationResult = null;
        
        if (this.config.enableDebugMode) {
            console.log('CategoryManager: Cleanup completed');
        }
    }
}

// Export for use in other modules
export default CategoryManager;