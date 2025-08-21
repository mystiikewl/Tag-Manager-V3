import { appState } from '../appState.js';
import { CategoryManager } from '../managers/CategoryManager.js';
import { restorePageState } from '../core/stateManager.js';
import { loadAllCategories } from '../modules/categoryTree.js';
import { loadProducts, populateProductDropdown } from '../modules/dataLoader.js';
import { setupMainPageEventListeners } from '../events/eventManager.js';
import { showSuccess } from '../utils/ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Set current page to 'main' for the default index.html
    appState.setCurrentPage('main');

    // Test notification to verify system works
    setTimeout(() => {
        console.log('Testing notification system...');
        showSuccess('Notification system test - if you see this, notifications are working!');
    }, 1000);

    await loadAllCategories(); // Load categories for the main page
    await loadProducts(); // Load products for the dropdown
    setupMainPageEventListeners(); // Call main page specific event listeners
    restorePageState();
    new CategoryManager(); // Initialize the new CategoryManager
});
