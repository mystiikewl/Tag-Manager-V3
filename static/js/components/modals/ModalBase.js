/**
 * ModalBase.js - Base modal class with common functionality for show/hide, event handling, and cleanup
 * 
 * This class provides the foundation for all modal components in the application,
 * handling common behaviors like keyboard events, overlay clicks, and body scroll prevention.
 */

export class ModalBase {
    /**
     * Creates a new ModalBase instance
     * @param {string} modalId - The ID of the modal element in the DOM
     * @param {Object} options - Configuration options
     * @param {boolean} options.closeOnEscape - Whether to close modal on Escape key (default: true)
     * @param {boolean} options.closeOnOverlay - Whether to close modal on overlay click (default: true)
     * @param {boolean} options.preventBodyScroll - Whether to prevent body scrolling when modal is open (default: true)
     * @param {boolean} options.focusOnShow - Whether to focus the modal when shown (default: true)
     * @param {string} options.animationClass - CSS class for show/hide animations (default: 'modal-fade')
     */
    constructor(modalId, options = {}) {
        this.modalId = modalId;
        this.modalElement = document.getElementById(modalId);
        
        if (!this.modalElement) {
            throw new Error(`Modal element with ID '${modalId}' not found`);
        }
        
        // Configuration options with defaults
        this.options = {
            closeOnEscape: true,
            closeOnOverlay: true,
            preventBodyScroll: true,
            focusOnShow: true,
            animationClass: 'modal-fade',
            ...options
        };
        
        // State tracking
        this.isVisible = false;
        this.isAnimating = false;
        
        // Event handlers (bound to maintain context)
        this.boundHandlers = {
            keydown: this.handleKeydown.bind(this),
            overlayClick: this.handleOverlayClick.bind(this),
            resize: this.handleResize.bind(this)
        };
        
        // Initialize modal
        this.initialize();
    }
    
    /**
     * Initialize the modal with basic setup
     * @private
     */
    initialize() {
        // Ensure modal is hidden initially
        this.modalElement.style.display = 'none';
        
        // Add ARIA attributes for accessibility
        this.modalElement.setAttribute('role', 'dialog');
        this.modalElement.setAttribute('aria-modal', 'true');
        this.modalElement.setAttribute('aria-hidden', 'true');
        
        // Find or create overlay
        this.overlay = this.modalElement.querySelector('.modal-overlay') || this.modalElement;
        
        // Find modal content container
        this.contentContainer = this.modalElement.querySelector('.modal-content') || 
                               this.modalElement.querySelector('[role="document"]') ||
                               this.modalElement.firstElementChild;
        
        // Set up initial event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners for modal functionality
     * @protected
     */
    setupEventListeners() {
        // Overlay click handling
        if (this.options.closeOnOverlay && this.overlay) {
            this.overlay.addEventListener('click', this.boundHandlers.overlayClick);
        }
        
        // Window resize handling for responsive behavior
        window.addEventListener('resize', this.boundHandlers.resize);
    }
    
    /**
     * Show the modal
     * @param {Object} data - Optional data to pass to the modal
     * @returns {Promise} Promise that resolves when modal is fully shown
     */
    async show(data = null) {
        if (this.isVisible || this.isAnimating) {
            return;
        }
        
        this.isAnimating = true;
        
        try {
            // Call beforeShow hook
            await this.beforeShow(data);
            
            // Prevent body scroll if enabled
            if (this.options.preventBodyScroll) {
                this.preventBodyScroll();
            }
            
            // Show modal element
            this.modalElement.style.display = 'flex';
            this.modalElement.setAttribute('aria-hidden', 'false');
            
            // Add keyboard event listener
            if (this.options.closeOnEscape) {
                document.addEventListener('keydown', this.boundHandlers.keydown);
            }
            
            // Apply animation class
            if (this.options.animationClass) {
                this.modalElement.classList.add(this.options.animationClass);
            }
            
            // Focus management
            if (this.options.focusOnShow) {
                this.focusModal();
            }
            
            // Update state
            this.isVisible = true;
            
            // Call afterShow hook
            await this.afterShow(data);
            
        } catch (error) {
            console.error('Error showing modal:', error);
            throw error;
        } finally {
            this.isAnimating = false;
        }
    }
    
    /**
     * Hide the modal
     * @param {Object} result - Optional result data from modal interaction
     * @returns {Promise} Promise that resolves when modal is fully hidden
     */
    async hide(result = null) {
        if (!this.isVisible || this.isAnimating) {
            return;
        }
        
        this.isAnimating = true;
        
        try {
            // Call beforeHide hook
            await this.beforeHide(result);
            
            // Remove keyboard event listener
            document.removeEventListener('keydown', this.boundHandlers.keydown);
            
            // Remove animation class
            if (this.options.animationClass) {
                this.modalElement.classList.remove(this.options.animationClass);
            }
            
            // Hide modal element
            this.modalElement.style.display = 'none';
            this.modalElement.setAttribute('aria-hidden', 'true');
            
            // Restore body scroll
            if (this.options.preventBodyScroll) {
                this.restoreBodyScroll();
            }
            
            // Update state
            this.isVisible = false;
            
            // Call afterHide hook
            await this.afterHide(result);
            
        } catch (error) {
            console.error('Error hiding modal:', error);
            throw error;
        } finally {
            this.isAnimating = false;
        }
    }
    
    /**
     * Toggle modal visibility
     * @param {Object} data - Optional data for show operation
     * @returns {Promise} Promise that resolves when operation is complete
     */
    async toggle(data = null) {
        if (this.isVisible) {
            return this.hide();
        } else {
            return this.show(data);
        }
    }
    
    /**
     * Handle keydown events (primarily Escape key)
     * @private
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeydown(event) {
        if (event.key === 'Escape' && this.options.closeOnEscape) {
            event.preventDefault();
            this.hide();
        }
        
        // Handle Enter key if modal has a primary action
        if (event.key === 'Enter' && this.handleEnterKey) {
            event.preventDefault();
            this.handleEnterKey(event);
        }
    }
    
    /**
     * Handle overlay click events
     * @private
     * @param {MouseEvent} event - The click event
     */
    handleOverlayClick(event) {
        // Only close if clicking the overlay itself, not content within it
        if (event.target === this.overlay && this.options.closeOnOverlay) {
            this.hide();
        }
    }
    
    /**
     * Handle window resize events
     * @private
     */
    handleResize() {
        if (this.isVisible) {
            this.updatePosition();
        }
    }
    
    /**
     * Prevent body scrolling when modal is open
     * @private
     */
    preventBodyScroll() {
        // Store current scroll position
        this.scrollPosition = window.pageYOffset;
        
        // Apply styles to prevent scrolling
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.scrollPosition}px`;
        document.body.style.width = '100%';
    }
    
    /**
     * Restore body scrolling when modal is closed
     * @private
     */
    restoreBodyScroll() {
        // Remove scroll prevention styles
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // Restore scroll position
        if (this.scrollPosition !== undefined) {
            window.scrollTo(0, this.scrollPosition);
        }
    }
    
    /**
     * Focus the modal for accessibility
     * @private
     */
    focusModal() {
        // Try to focus the first focusable element, or the modal itself
        const focusableElements = this.modalElement.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        } else {
            this.modalElement.focus();
        }
    }
    
    /**
     * Update modal position (for responsive behavior)
     * @protected
     */
    updatePosition() {
        // Override in subclasses if needed
        // Default implementation does nothing
    }
    
    /**
     * Clean up event listeners and resources
     */
    cleanup() {
        // Remove all event listeners
        document.removeEventListener('keydown', this.boundHandlers.keydown);
        window.removeEventListener('resize', this.boundHandlers.resize);
        
        if (this.overlay) {
            this.overlay.removeEventListener('click', this.boundHandlers.overlayClick);
        }
        
        // Restore body scroll if modal was open
        if (this.isVisible && this.options.preventBodyScroll) {
            this.restoreBodyScroll();
        }
        
        // Call cleanup hook
        this.onCleanup();
    }
    
    // Lifecycle hooks - override in subclasses
    
    /**
     * Called before modal is shown
     * @protected
     * @param {Object} data - Data passed to show method
     * @returns {Promise} Promise that resolves when preparation is complete
     */
    async beforeShow(data) {
        // Override in subclasses
    }
    
    /**
     * Called after modal is shown
     * @protected
     * @param {Object} data - Data passed to show method
     * @returns {Promise} Promise that resolves when post-show actions are complete
     */
    async afterShow(data) {
        // Override in subclasses
    }
    
    /**
     * Called before modal is hidden
     * @protected
     * @param {Object} result - Result data from modal interaction
     * @returns {Promise} Promise that resolves when preparation is complete
     */
    async beforeHide(result) {
        // Override in subclasses
    }
    
    /**
     * Called after modal is hidden
     * @protected
     * @param {Object} result - Result data from modal interaction
     * @returns {Promise} Promise that resolves when cleanup is complete
     */
    async afterHide(result) {
        // Override in subclasses
    }
    
    /**
     * Called during cleanup
     * @protected
     */
    onCleanup() {
        // Override in subclasses
    }
    
    /**
     * Handle Enter key press (optional override)
     * @protected
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleEnterKey(event) {
        // Override in subclasses if needed
    }
    
    // Utility methods
    
    /**
     * Check if modal is currently visible
     * @returns {boolean} True if modal is visible
     */
    get visible() {
        return this.isVisible;
    }
    
    /**
     * Check if modal is currently animating
     * @returns {boolean} True if modal is animating
     */
    get animating() {
        return this.isAnimating;
    }
    
    /**
     * Get the modal element
     * @returns {HTMLElement} The modal DOM element
     */
    get element() {
        return this.modalElement;
    }
}