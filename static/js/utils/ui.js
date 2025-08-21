// UI Utility Functions for notifications and loading overlays

/**
 * Shows or hides a loading overlay with an optional message.
 * @param {boolean} show - True to show, false to hide.
 * @param {string} [message='Processing...'] - The message to display on the overlay.
 */
export function showLoadingOverlay(show, message = 'Processing...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) {
        console.error('Loading overlay element not found!');
        return;
    }
    const overlayText = loadingOverlay.querySelector('p');
    if (overlayText) {
        overlayText.textContent = message;
    }
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

/**
 * Displays a toast notification.
 * @param {string} message - The message to display.
 * @param {'success' | 'error'} [type='success'] - The type of notification (success or error).
 */
export function showNotification(message, type = 'success') {
    console.log('showNotification called:', message, type); // Debug log
    
    const notificationContainer = document.getElementById('notification-container');
    const notification = document.createElement('div');
    let iconSvg;

    // Determine styling based on notification type
    if (type === 'success') {
        // SVG for success icon (check mark)
        iconSvg = `<svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 1 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z" clip-rule="evenodd"></path></svg>`;
    } else { // error
        // SVG for error icon (cross mark)
        iconSvg = `<svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 1 0 16zM8.707 7.293a1 1 0 0 0-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 1 0 1.414 1.414L10 11.414l1.293 1.293a1 1 0 0 1 1.414-1.414L11.414 10l1.293-1.293a1 1 0 0 0-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
    }

    // Style notifications for bottom-right with pop-up animation
    notification.style.cssText = `
        background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid ${type === 'success' ? '#059669' : '#dc2626'};
        display: flex;
        align-items: center;
        max-width: 384px;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 12px;
        transform: scale(0.8);
        opacity: 0;
        transition: all 200ms ease-out;
        pointer-events: auto;
        z-index: 60;
    `;
    notification.innerHTML = `${iconSvg}<span>${message}</span>`;
    
    console.log('Creating notification with pop-up animation');
    
    // Find and use the notification container
    const container = notificationContainer || document.getElementById('notification-container');
    if (container) {
        console.log('Adding notification to container');
        container.appendChild(notification);
        
        // Trigger pop-up animation after a brief delay
        setTimeout(() => {
            notification.style.transform = 'scale(1.05)';
            notification.style.opacity = '1';
            
            // Settle to normal size
            setTimeout(() => {
                notification.style.transform = 'scale(1)';
            }, 150);
        }, 10);
    } else {
        console.error('Notification container not found, adding to body');
        // Fallback: add to body with absolute positioning
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        document.body.appendChild(notification);
        
        // Apply same animation for fallback
        setTimeout(() => {
            notification.style.transform = 'scale(1.05)';
            notification.style.opacity = '1';
            setTimeout(() => {
                notification.style.transform = 'scale(1)';
            }, 150);
        }, 10);
    }

    console.log('Notification added to DOM');

    // Auto-dismiss the notification with fade-out
    setTimeout(() => {
        console.log('Starting notification dismissal');
        notification.style.opacity = '0';
        notification.style.transform = 'scale(0.9)';
        setTimeout(() => {
            console.log('Removing notification');
            notification.remove();
        }, 200);
    }, 3000);
}

/**
 * Displays an error toast notification.
 * @param {string} message - The error message to display.
 */
export function showError(message) {
    showNotification(message, 'error');
}

/**
 * Displays a success toast notification.
 * @param {string} message - The success message to display.
 */
export function showSuccess(message) {
    showNotification(message, 'success');
}
