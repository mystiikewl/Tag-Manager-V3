/**
 * Statistics Manager - Handles product statistics loading and updates
 * Provides centralized statistics management for the Tag Manager V2 application
 */

import { showError } from './ui.js';

/**
 * Fetches current product statistics from the API
 * @returns {Promise<Object>} Statistics object with product counts
 */
export async function fetchProductStatistics() {
    try {
        const response = await fetch('/api/products/statistics');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching product statistics:', error);
        throw new Error('Failed to fetch product statistics');
    }
}

/**
 * Updates the statistics display in both desktop and mobile UI
 * @param {Object} stats - Statistics object from the API
 */
export function updateStatisticsDisplay(stats) {
    // Update Desktop UI
    const totalProductsElement = document.getElementById('total-products');
    const categorizedProductsElement = document.getElementById('categorized-products');
    const uncategorizedProductsElement = document.getElementById('uncategorized-products');
    const totalCategoriesElement = document.getElementById('total-categories');
    
    if (totalProductsElement) totalProductsElement.textContent = stats.total_products;
    if (categorizedProductsElement) categorizedProductsElement.textContent = stats.categorized_products;
    if (uncategorizedProductsElement) uncategorizedProductsElement.textContent = stats.uncategorized_products;
    if (totalCategoriesElement) totalCategoriesElement.textContent = stats.total_categories;
    
    // Update Mobile UI
    const mobileTotalProductsElement = document.getElementById('mobile-total-products');
    const mobileCategorizedProductsElement = document.getElementById('mobile-categorized-products');
    const mobileUncategorizedProductsElement = document.getElementById('mobile-uncategorized-products');
    const mobileTotalCategoriesElement = document.getElementById('mobile-total-categories');
    
    if (mobileTotalProductsElement) mobileTotalProductsElement.textContent = stats.total_products;
    if (mobileCategorizedProductsElement) mobileCategorizedProductsElement.textContent = stats.categorized_products;
    if (mobileUncategorizedProductsElement) mobileUncategorizedProductsElement.textContent = stats.uncategorized_products;
    if (mobileTotalCategoriesElement) mobileTotalCategoriesElement.textContent = stats.total_categories;
}

/**
 * Shows/hides loading states for statistics
 * @param {boolean} isLoading - Whether to show loading state
 */
export function toggleStatisticsLoading(isLoading) {
    const statsLoading = document.getElementById('stats-loading');
    const statsContent = document.getElementById('stats-content');
    const mobileStatsLoading = document.getElementById('mobile-stats-loading');
    const mobileStatsContent = document.getElementById('mobile-stats-content');
    
    if (isLoading) {
        if (statsLoading) statsLoading.classList.remove('hidden');
        if (statsContent) statsContent.classList.add('hidden');
        if (mobileStatsLoading) mobileStatsLoading.classList.remove('hidden');
        if (mobileStatsContent) mobileStatsContent.classList.add('hidden');
    } else {
        if (statsLoading) statsLoading.classList.add('hidden');
        if (statsContent) statsContent.classList.remove('hidden');
        if (mobileStatsLoading) mobileStatsLoading.classList.add('hidden');
        if (mobileStatsContent) mobileStatsContent.classList.remove('hidden');
    }
}

/**
 * Refreshes the statistics display by fetching fresh data
 * @returns {Promise<void>}
 */
export async function refreshStatistics() {
    try {
        toggleStatisticsLoading(true);
        const stats = await fetchProductStatistics();
        updateStatisticsDisplay(stats);
        console.log('Statistics refreshed:', stats);
    } catch (error) {
        console.error('Failed to refresh statistics:', error);
        showError('Failed to update statistics');
        
        // Show error message in statistics area
        const statsLoading = document.getElementById('stats-loading');
        const mobileStatsLoading = document.getElementById('mobile-stats-loading');
        
        if (statsLoading) {
            statsLoading.innerHTML = '<p class="text-sm text-red-600">Failed to load statistics</p>';
        }
        if (mobileStatsLoading) {
            mobileStatsLoading.innerHTML = '<p class="text-sm text-red-600">Failed to load statistics</p>';
        }
    } finally {
        toggleStatisticsLoading(false);
    }
}

/**
 * Loads initial statistics with a simulated delay for smooth UX
 * @returns {Promise<void>}
 */
export async function loadInitialStatistics() {
    try {
        toggleStatisticsLoading(true);
        
        // Simulate loading delay for smooth UX
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const stats = await fetchProductStatistics();
        updateStatisticsDisplay(stats);
        console.log('Initial statistics loaded:', stats);
    } catch (error) {
        console.error('Failed to load initial statistics:', error);
        showError('Failed to load statistics');
        
        // Show error message in statistics area
        const statsLoading = document.getElementById('stats-loading');
        const mobileStatsLoading = document.getElementById('mobile-stats-loading');
        
        if (statsLoading) {
            statsLoading.innerHTML = '<p class="text-sm text-red-600">Failed to load statistics</p>';
        }
        if (mobileStatsLoading) {
            mobileStatsLoading.innerHTML = '<p class="text-sm text-red-600">Failed to load statistics</p>';
        }
    } finally {
        toggleStatisticsLoading(false);
    }
}

/**
 * Updates the product count badge in the sidebar
 * @returns {Promise<void>}
 */
export async function updateProductCountBadge() {
    try {
        // Fetch products with categorization status efficiently
        const response = await fetch('/api/products/categorization-status');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();
        
        // Apply the same filtering logic as in dataLoader.js
        const hideAllocatedToggle = document.getElementById('hide-allocated-toggle');
        const hideAllocated = hideAllocatedToggle ? hideAllocatedToggle.checked : false;
        
        let filteredProducts = products;
        
        if (hideAllocated) {
            // Filter out products that have categories (categorised products)
            filteredProducts = products.filter(product => !product.has_categories);
        }
        
        // Update the count badge
        const productCountBadge = document.getElementById('product-count-badge');
        const productCount = document.getElementById('product-count');
        
        if (productCount && productCountBadge) {
            productCount.textContent = filteredProducts.length;
            if (filteredProducts.length > 0) {
                productCountBadge.classList.remove('hidden');
            } else {
                productCountBadge.classList.add('hidden');
            }
        }
        
        console.log('Product count badge updated:', filteredProducts.length);
        
    } catch (error) {
        console.error('Failed to update product count badge:', error);
    }
}

/**
 * Refreshes both statistics and product count badge
 * @returns {Promise<void>}
 */
export async function refreshAllStatistics() {
    await Promise.all([
        refreshStatistics(),
        updateProductCountBadge()
    ]);
}

/**
 * Debounced version of refreshStatistics to prevent too frequent updates
 */
let refreshTimeout = null;
export function debouncedRefreshStatistics(delay = 1000) {
    if (refreshTimeout) {
        clearTimeout(refreshTimeout);
    }
    
    refreshTimeout = setTimeout(() => {
        refreshStatistics();
        refreshTimeout = null;
    }, delay);
}

/**
 * Debounced version of refreshAllStatistics to prevent too frequent updates
 */
let refreshAllTimeout = null;
export function debouncedRefreshAllStatistics(delay = 1000) {
    if (refreshAllTimeout) {
        clearTimeout(refreshAllTimeout);
    }
    
    refreshAllTimeout = setTimeout(() => {
        refreshAllStatistics();
        refreshAllTimeout = null;
    }, delay);
} 