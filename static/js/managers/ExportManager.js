/**
 * ExportManager.js - Export functionality handler
 * 
 * This module handles all export operations, connecting all export buttons
 * to a single handler with loading states, error handling, and retry functionality.
 */

import { ModalNotificationManager, loadingManager } from '../utils/UIHelpers.js';

/**
 * ExportManager class for handling all export operations
 */
export class ExportManager {
    /**
     * Creates a new ExportManager instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.config = {
            enableDebugMode: false,
            retryAttempts: 3,
            retryDelay: 1000,
            exportEndpoint: '/export-csv',
            defaultFilename: 'categories_export',
            ...options
        };
        
        // Export button selectors
        this.exportButtonSelectors = [
            '#quick-export',
            '#data-export-btn', 
            '#export-csv-btn',
            '.quick-export-mobile',
            '[data-export-action]'
        ];
        
        // State management
        this.isExporting = false;
        this.exportButtons = [];
        this.lastExportResult = null;
        
        // Bound event handlers
        this.boundHandlers = {
            exportClick: this.handleExportClick.bind(this),
            documentClick: this.handleDocumentClick.bind(this)
        };
        
        // Initialize the manager
        this.initialize();
    }
    
    /**
     * Initialize the ExportManager
     * @private
     */
    initialize() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupExportButtons();
            });
        } else {
            this.setupExportButtons();
        }
        
        // Set up document-level event delegation for dynamic buttons
        document.addEventListener('click', this.boundHandlers.documentClick);
        
        if (this.config.enableDebugMode) {
            console.log('ExportManager initialized');
        }
    }
    
    /**
     * Set up export button event listeners
     * @private
     */
    setupExportButtons() {
        this.exportButtons = [];
        
        // Find all export buttons
        this.exportButtonSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element && !this.exportButtons.includes(element)) {
                    this.exportButtons.push(element);
                    element.addEventListener('click', this.boundHandlers.exportClick);
                }
            });
        });
        
        if (this.config.enableDebugMode) {
            console.log(`ExportManager: Found ${this.exportButtons.length} export buttons`);
        }
    }
    
    /**
     * Handle export button click
     * @private
     * @param {Event} event - Click event
     */
    async handleExportClick(event) {
        event.preventDefault();
        
        if (this.isExporting) {
            if (this.config.enableDebugMode) {
                console.log('ExportManager: Export already in progress, ignoring click');
            }
            return;
        }
        
        const button = event.currentTarget;
        await this.performExport(button);
    }
    
    /**
     * Handle document click for dynamic export buttons
     * @private
     * @param {Event} event - Click event
     */
    handleDocumentClick(event) {
        const target = event.target;
        
        // Check if clicked element matches export button selectors
        const isExportButton = this.exportButtonSelectors.some(selector => {
            return target.matches(selector) || target.closest(selector);
        });
        
        if (isExportButton && !this.exportButtons.includes(target)) {
            event.preventDefault();
            this.performExport(target);
        }
    }
    
    /**
     * Perform export operation
     * @param {HTMLElement} triggerButton - Button that triggered the export
     * @returns {Promise<boolean>} True if export was successful
     */
    async performExport(triggerButton = null) {
        if (this.isExporting) {
            return false;
        }
        
        this.isExporting = true;
        
        try {
            // Show loading state on all export buttons
            this.setLoadingState(true, triggerButton);
            
            // Attempt export with retry logic
            const result = await this.exportWithRetry();
            
            // Handle successful export
            this.lastExportResult = {
                success: true,
                timestamp: Date.now(),
                triggerButton: triggerButton?.id || 'unknown'
            };
            
            ModalNotificationManager.showSuccess('Export completed successfully!');
            
            if (this.config.enableDebugMode) {
                console.log('ExportManager: Export completed successfully');
            }
            
            return true;
            
        } catch (error) {
            // Handle export failure
            this.lastExportResult = {
                success: false,
                error: error.message,
                timestamp: Date.now(),
                triggerButton: triggerButton?.id || 'unknown'
            };
            
            console.error('ExportManager: Export failed:', error);
            
            // Show error with retry option
            this.showExportError(error, triggerButton);
            
            return false;
            
        } finally {
            this.isExporting = false;
            this.setLoadingState(false);
        }
    }
    
    /**
     * Export with retry logic
     * @private
     * @returns {Promise<void>}
     */
    async exportWithRetry() {
        let lastError;
        
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                await this.executeExport();
                return; // Success, exit retry loop
                
            } catch (error) {
                lastError = error;
                
                if (this.config.enableDebugMode) {
                    console.log(`ExportManager: Export attempt ${attempt} failed:`, error.message);
                }
                
                // Don't retry on client errors (4xx)
                if (error.status && error.status >= 400 && error.status < 500) {
                    throw error;
                }
                
                // Don't retry on the last attempt
                if (attempt === this.config.retryAttempts) {
                    throw error;
                }
                
                // Wait before retrying
                await this.delay(this.config.retryDelay * attempt);
            }
        }
        
        throw lastError;
    }
    
    /**
     * Execute the actual export operation
     * @private
     * @returns {Promise<void>}
     */
    async executeExport() {
        try {
            const response = await fetch(this.config.exportEndpoint, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!response.ok) {
                const error = new Error(`Export request failed: ${response.status} ${response.statusText}`);
                error.status = response.status;
                throw error;
            }
            
            // Get the response as blob
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            link.download = `${this.config.defaultFilename}_${timestamp}.csv`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up object URL
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            // Enhance error with more context
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                error.message = 'Network error: Unable to connect to server';
            }
            
            throw error;
        }
    }
    
    /**
     * Set loading state on export buttons
     * @private
     * @param {boolean} loading - Whether to show loading state
     * @param {HTMLElement} triggerButton - Button that triggered the export
     */
    setLoadingState(loading, triggerButton = null) {
        this.exportButtons.forEach(button => {
            if (loading) {
                const message = button === triggerButton ? 'Exporting...' : 'Export in progress...';
                loadingManager.show(button, message, {
                    disableElement: true,
                    showSpinner: button === triggerButton
                });
            } else {
                loadingManager.hide(button);
            }
        });
    }
    
    /**
     * Show export error with retry option
     * @private
     * @param {Error} error - The error that occurred
     * @param {HTMLElement} triggerButton - Button that triggered the export
     */
    showExportError(error, triggerButton) {
        let errorMessage = 'Export failed. Please try again.';
        
        // Customize error message based on error type
        if (error.message.includes('Network error')) {
            errorMessage = 'Network error: Please check your connection and try again.';
        } else if (error.status === 404) {
            errorMessage = 'Export endpoint not found. Please contact support.';
        } else if (error.status === 500) {
            errorMessage = 'Server error occurred during export. Please try again later.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Export timed out. Please try again.';
        }
        
        // Show error notification with retry button
        const errorContainer = document.createElement('div');
        errorContainer.className = 'flex items-center space-x-2';
        errorContainer.innerHTML = `
            <span>${errorMessage}</span>
            <button id="retry-export" class="text-sm font-medium text-blue-600 hover:text-blue-800 underline">
                Retry
            </button>
        `;
        
        // Add retry functionality
        const retryButton = errorContainer.querySelector('#retry-export');
        retryButton.addEventListener('click', () => {
            this.performExport(triggerButton);
        });
        
        ModalNotificationManager.showError(errorContainer.outerHTML, {
            duration: 8000,
            persistent: true
        });
    }
    
    /**
     * Delay utility for retry logic
     * @private
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Refresh export buttons (useful after dynamic content changes)
     */
    refreshExportButtons() {
        // Remove existing event listeners
        this.exportButtons.forEach(button => {
            button.removeEventListener('click', this.boundHandlers.exportClick);
        });
        
        // Re-setup export buttons
        this.setupExportButtons();
        
        if (this.config.enableDebugMode) {
            console.log('ExportManager: Export buttons refreshed');
        }
    }
    
    /**
     * Check if export is currently in progress
     * @returns {boolean} True if export is in progress
     */
    isExportInProgress() {
        return this.isExporting;
    }
    
    /**
     * Get the last export result
     * @returns {Object|null} Last export result
     */
    getLastExportResult() {
        return this.lastExportResult;
    }
    
    /**
     * Get debug information about the manager
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            config: this.config,
            isExporting: this.isExporting,
            exportButtonsCount: this.exportButtons.length,
            exportButtonIds: this.exportButtons.map(btn => btn.id || 'no-id'),
            lastExportResult: this.lastExportResult
        };
    }
    
    /**
     * Clean up resources and event listeners
     */
    cleanup() {
        // Remove event listeners from export buttons
        this.exportButtons.forEach(button => {
            button.removeEventListener('click', this.boundHandlers.exportClick);
        });
        
        // Remove document event listener
        document.removeEventListener('click', this.boundHandlers.documentClick);
        
        // Clear loading states
        loadingManager.clearAll();
        
        // Reset state
        this.isExporting = false;
        this.exportButtons = [];
        this.lastExportResult = null;
        
        if (this.config.enableDebugMode) {
            console.log('ExportManager: Cleanup completed');
        }
    }
}

// Export for use in other modules
export default ExportManager;