/**
 * CategoryService.js - Enhanced category service with modal-specific functionality
 * 
 * This service extends the existing ApiService with additional methods needed
 * for category creation and deletion modals, while maintaining compatibility
 * with existing functionality.
 */

import { 
    fetchLevel1Categories,
    fetchCategoriesByLevelAndParent,
    createCategory as apiCreateCategory,
    deleteCategory as apiDeleteCategory,
    fetchWithErrorHandling,
    getCategoryInfo as apiGetCategoryInfo
} from './ApiService.js';

/**
 * Enhanced CategoryService class for modal operations
 */
export class CategoryService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }
    
    /**
     * Create a new category
     * @param {Object} categoryData - Category data
     * @param {string} categoryData.name - Category name
     * @param {number} categoryData.level - Category level (1, 2, or 3)
     * @param {string} categoryData.parentId - Parent category ID (for levels 2 and 3)
     * @returns {Promise<Object>} Created category object
     */
    async createCategory(categoryData) {
        try {
            const result = await apiCreateCategory(
                categoryData.name,
                categoryData.level,
                categoryData.parentId
            );
            
            // Clear relevant caches after successful creation
            this.clearCache();
            
            // Refresh UI components to reflect the new category
            await this.refreshUIComponents('create', {
                name: categoryData.name,
                level: categoryData.level,
                parentId: categoryData.parentId
            });
            
            return result;
        } catch (error) {
            console.error('CategoryService: Error creating category:', error);
            throw this.enhanceError(error, 'create');
        }
    }
    
    /**
     * Delete a category
     * @param {string} categoryName - Name of the category to delete
     * @returns {Promise<Object>} Deletion result
     */
    async deleteCategory(categoryName) {
        try {
            // Get category info before deletion for UI refresh
            let categoryInfo = null;
            try {
                categoryInfo = await this.getCategoryInfo(categoryName);
            } catch (error) {
                // Continue with deletion even if we can't get info
                console.warn('Could not get category info before deletion:', error);
            }
            
            const result = await apiDeleteCategory(categoryName);
            
            // Clear relevant caches after successful deletion
            this.clearCache();
            
            // Refresh UI components to reflect the deleted category
            await this.refreshUIComponents('delete', {
                name: categoryName,
                level: categoryInfo?.level,
                productCount: categoryInfo?.product_count,
                childCount: categoryInfo?.child_count
            });
            
            return result;
        } catch (error) {
            console.error('CategoryService: Error deleting category:', error);
            throw this.enhanceError(error, 'delete');
        }
    }
    
    /**
     * Get detailed information about a category
     * @param {string} categoryName - Name of the category
     * @returns {Promise<Object>} Category information including product and child counts
     */
    async getCategoryInfo(categoryName) {
        const cacheKey = `info_${categoryName}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            const result = await apiGetCategoryInfo(categoryName);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
        } catch (error) {
            console.error('CategoryService: Error getting category info:', error);
            throw this.enhanceError(error, 'info');
        }
    }
    
    /**
     * Get parent categories for a specific level
     * @param {number} level - The level for which to get parent categories
     * @returns {Promise<Array>} Array of parent category objects
     */
    async getParentCategories(level) {
        const cacheKey = `parents_level_${level}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            let result = [];
            
            if (level === 2) {
                // For level 2 categories, get all level 1 categories as potential parents
                result = await fetchLevel1Categories();
            } else if (level === 3) {
                // For level 3 categories, get all level 2 categories as potential parents
                // This requires getting all level 1 categories first, then their children
                const level1Categories = await fetchLevel1Categories();
                const level2Categories = [];
                
                for (const level1Cat of level1Categories) {
                    try {
                        const children = await fetchCategoriesByLevelAndParent(2, level1Cat.id || level1Cat.name);
                        level2Categories.push(...children);
                    } catch (error) {
                        // Continue if some level 1 categories don't have children
                        console.warn(`No level 2 categories found for ${level1Cat.name}`);
                    }
                }
                
                result = level2Categories;
            }
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
        } catch (error) {
            console.error('CategoryService: Error getting parent categories:', error);
            throw this.enhanceError(error, 'parent_categories');
        }
    }
    
    /**
     * Get all categories for deletion dropdown
     * @returns {Promise<Array>} Array of all categories with hierarchical information
     */
    async getAllCategoriesForDeletion() {
        const cacheKey = 'all_categories_deletion';
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        try {
            const allCategories = [];
            
            // Get level 1 categories
            const level1Categories = await fetchLevel1Categories();
            
            for (const level1Cat of level1Categories) {
                // Add level 1 category
                allCategories.push({
                    ...level1Cat,
                    level: 1,
                    displayName: level1Cat.name,
                    fullPath: level1Cat.name
                });
                
                try {
                    // Get level 2 categories for this level 1 category
                    const level2Categories = await fetchCategoriesByLevelAndParent(2, level1Cat.id || level1Cat.name);
                    
                    for (const level2Cat of level2Categories) {
                        // Add level 2 category
                        allCategories.push({
                            ...level2Cat,
                            level: 2,
                            displayName: `  └─ ${level2Cat.name}`,
                            fullPath: `${level1Cat.name} > ${level2Cat.name}`,
                            parentName: level1Cat.name
                        });
                        
                        try {
                            // Get level 3 categories for this level 2 category
                            const level3Categories = await fetchCategoriesByLevelAndParent(3, level2Cat.id || level2Cat.name);
                            
                            for (const level3Cat of level3Categories) {
                                // Add level 3 category
                                allCategories.push({
                                    ...level3Cat,
                                    level: 3,
                                    displayName: `    └─ ${level3Cat.name}`,
                                    fullPath: `${level1Cat.name} > ${level2Cat.name} > ${level3Cat.name}`,
                                    parentName: level2Cat.name
                                });
                            }
                        } catch (error) {
                            // Continue if level 2 category has no children
                            console.warn(`No level 3 categories found for ${level2Cat.name}`);
                        }
                    }
                } catch (error) {
                    // Continue if level 1 category has no children
                    console.warn(`No level 2 categories found for ${level1Cat.name}`);
                }
            }
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: allCategories,
                timestamp: Date.now()
            });
            
            return allCategories;
        } catch (error) {
            console.error('CategoryService: Error getting all categories for deletion:', error);
            throw this.enhanceError(error, 'all_categories');
        }
    }
    
    /**
     * Check if a category name already exists
     * @param {string} name - Category name to check
     * @param {number} level - Category level (optional, for more specific checking)
     * @returns {Promise<boolean>} True if category name exists
     */
    async categoryNameExists(name, level = null) {
        try {
            const allCategories = await this.getAllCategoriesForDeletion();
            
            const exists = allCategories.some(category => {
                const nameMatches = category.name.toLowerCase() === name.toLowerCase();
                const levelMatches = level === null || category.level === level;
                return nameMatches && levelMatches;
            });
            
            return exists;
        } catch (error) {
            console.error('CategoryService: Error checking category name existence:', error);
            // Return false on error to avoid blocking form submission
            return false;
        }
    }
    
    /**
     * Get existing category names for validation
     * @param {number} level - Category level (optional)
     * @returns {Promise<Array<string>>} Array of existing category names
     */
    async getExistingCategoryNames(level = null) {
        try {
            const allCategories = await this.getAllCategoriesForDeletion();
            
            return allCategories
                .filter(category => level === null || category.level === level)
                .map(category => category.name);
        } catch (error) {
            console.error('CategoryService: Error getting existing category names:', error);
            return [];
        }
    }
    
    /**
     * Validate category hierarchy rules
     * @param {Object} categoryData - Category data to validate
     * @returns {Promise<Object>} Validation result
     */
    async validateCategoryHierarchy(categoryData) {
        try {
            const { name, level, parentId } = categoryData;
            const validation = {
                isValid: true,
                errors: []
            };
            
            // Check if name already exists
            const nameExists = await this.categoryNameExists(name, level);
            if (nameExists) {
                validation.isValid = false;
                validation.errors.push('A category with this name already exists at this level');
            }
            
            // Validate parent requirements
            if (level > 1 && (!parentId || !parentId.trim())) {
                validation.isValid = false;
                validation.errors.push(`Level ${level} categories must have a parent category`);
            }
            
            if (level === 1 && parentId && parentId.trim()) {
                validation.isValid = false;
                validation.errors.push('Level 1 categories cannot have a parent category');
            }
            
            // Validate parent exists if specified
            if (level > 1 && parentId && parentId.trim()) {
                const parentCategories = await this.getParentCategories(level);
                const parentExists = parentCategories.some(parent => 
                    parent.id === parentId || parent.name === parentId
                );
                
                if (!parentExists) {
                    validation.isValid = false;
                    validation.errors.push('Selected parent category does not exist');
                }
            }
            
            return validation;
        } catch (error) {
            console.error('CategoryService: Error validating category hierarchy:', error);
            return {
                isValid: false,
                errors: ['Unable to validate category hierarchy. Please try again.']
            };
        }
    }
    
    /**
     * Clear service cache
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * Clear specific cache entries
     * @param {string} pattern - Pattern to match cache keys (optional)
     */
    clearCachePattern(pattern) {
        if (!pattern) {
            this.clearCache();
            return;
        }
        
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
    }
    
    /**
     * Retry a failed operation with exponential backoff
     * @private
     * @param {Function} operation - The operation to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {Promise<any>} Operation result
     */
    async retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx) or validation errors
                if (error.message.includes('already exists') || 
                    error.message.includes('not found') ||
                    error.message.includes('validation') ||
                    (error.status && error.status >= 400 && error.status < 500)) {
                    throw error;
                }
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Exponential backoff with jitter
                const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
                console.warn(`CategoryService: Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, error.message);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    }
    
    /**
     * Create a new category with retry logic
     * @param {Object} categoryData - Category data
     * @param {Object} options - Operation options
     * @returns {Promise<Object>} Created category object
     */
    async createCategoryWithRetry(categoryData, options = {}) {
        const config = {
            maxRetries: 3,
            baseDelay: 1000,
            ...options
        };
        
        return this.retryOperation(
            () => this.createCategory(categoryData),
            config.maxRetries,
            config.baseDelay
        );
    }
    
    /**
     * Delete a category with retry logic
     * @param {string} categoryName - Name of the category to delete
     * @param {Object} options - Operation options
     * @returns {Promise<Object>} Deletion result
     */
    async deleteCategoryWithRetry(categoryName, options = {}) {
        const config = {
            maxRetries: 3,
            baseDelay: 1000,
            ...options
        };
        
        return this.retryOperation(
            () => this.deleteCategory(categoryName),
            config.maxRetries,
            config.baseDelay
        );
    }
    
    /**
     * Enhance error messages for better user experience
     * @private
     * @param {Error} error - Original error
     * @param {string} operation - Operation that failed
     * @returns {Error} Enhanced error
     */
    enhanceError(error, operation) {
        const enhancedError = new Error(error.message);
        enhancedError.operation = operation;
        enhancedError.originalError = error;
        enhancedError.timestamp = Date.now();
        enhancedError.retryable = this.isRetryableError(error);
        
        // Add user-friendly messages based on operation
        switch (operation) {
            case 'create':
                if (error.message.includes('already exists')) {
                    enhancedError.userMessage = 'A category with this name already exists. Please choose a different name.';
                    enhancedError.retryable = false;
                } else if (error.message.includes('parent')) {
                    enhancedError.userMessage = 'Invalid parent category selected. Please choose a valid parent.';
                    enhancedError.retryable = false;
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    enhancedError.userMessage = 'Network error occurred. Please check your connection and try again.';
                    enhancedError.retryable = true;
                } else {
                    enhancedError.userMessage = 'Failed to create category. Please check your input and try again.';
                }
                break;
                
            case 'delete':
                if (error.message.includes('child categories')) {
                    enhancedError.userMessage = 'Cannot delete category with child categories. Please delete child categories first.';
                    enhancedError.retryable = false;
                } else if (error.message.includes('products')) {
                    enhancedError.userMessage = 'This category is assigned to products. Deletion will remove it from all products.';
                    enhancedError.retryable = false;
                } else if (error.message.includes('not found')) {
                    enhancedError.userMessage = 'Category not found. It may have already been deleted.';
                    enhancedError.retryable = false;
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    enhancedError.userMessage = 'Network error occurred. Please check your connection and try again.';
                    enhancedError.retryable = true;
                } else {
                    enhancedError.userMessage = 'Failed to delete category. Please try again.';
                }
                break;
                
            case 'info':
                if (error.message.includes('not found')) {
                    enhancedError.userMessage = 'Category not found. Please refresh the page and try again.';
                    enhancedError.retryable = false;
                } else {
                    enhancedError.userMessage = 'Failed to load category information. Please try again.';
                }
                break;
                
            case 'parent_categories':
                enhancedError.userMessage = 'Failed to load parent categories. Please refresh and try again.';
                break;
                
            case 'batch':
                enhancedError.userMessage = 'Some operations in the batch failed. Please review the results and retry failed operations.';
                break;
                
            default:
                enhancedError.userMessage = 'An error occurred while processing your request. Please try again.';
        }
        
        return enhancedError;
    }
    
    /**
     * Check if an error is retryable
     * @private
     * @param {Error} error - Error to check
     * @returns {boolean} True if error is retryable
     */
    isRetryableError(error) {
        // Network errors are retryable
        if (error.message.includes('network') || 
            error.message.includes('fetch') ||
            error.message.includes('timeout')) {
            return true;
        }
        
        // Server errors (5xx) are retryable
        if (error.status && error.status >= 500) {
            return true;
        }
        
        // Client errors (4xx) and validation errors are not retryable
        if (error.status && error.status >= 400 && error.status < 500) {
            return false;
        }
        
        // Specific business logic errors are not retryable
        if (error.message.includes('already exists') ||
            error.message.includes('not found') ||
            error.message.includes('validation') ||
            error.message.includes('child categories')) {
            return false;
        }
        
        // Default to retryable for unknown errors
        return true;
    }
    
    /**
     * Refresh UI components after category operations
     * This method triggers updates to all relevant UI components
     * @param {string} operation - The operation that was performed ('create', 'delete', 'update')
     * @param {Object} categoryData - Data about the category that was modified
     * @returns {Promise<void>}
     */
    async refreshUIComponents(operation, categoryData = {}) {
        try {
            // Clear relevant caches to ensure fresh data
            this.clearCache();
            
            // Dispatch custom events for UI components to listen to
            const event = new CustomEvent('categoryOperationComplete', {
                detail: {
                    operation,
                    categoryData,
                    timestamp: Date.now()
                }
            });
            
            document.dispatchEvent(event);
            
            // Update specific UI components based on operation
            switch (operation) {
                case 'create':
                    await this.updateCategoryDropdowns();
                    await this.updateCategoryStatistics();
                    break;
                    
                case 'delete':
                    await this.updateCategoryDropdowns();
                    await this.updateCategoryStatistics();
                    await this.updateProductDisplays();
                    break;
                    
                case 'update':
                    await this.updateCategoryDropdowns();
                    break;
            }
            
            console.log(`CategoryService: UI refresh completed for ${operation} operation`);
            
        } catch (error) {
            console.error('CategoryService: Error refreshing UI components:', error);
            // Don't throw error to avoid breaking the main operation
        }
    }
    
    /**
     * Update category dropdowns throughout the application
     * @private
     */
    async updateCategoryDropdowns() {
        // Find all category dropdowns and refresh their options
        const dropdowns = document.querySelectorAll('[data-category-dropdown]');
        
        for (const dropdown of dropdowns) {
            try {
                const level = dropdown.dataset.categoryLevel;
                const parentId = dropdown.dataset.parentId;
                
                if (level && level !== '1') {
                    // Refresh parent category options
                    const parents = await this.getParentCategories(parseInt(level));
                    this.populateDropdown(dropdown, parents);
                } else if (level === '1') {
                    // Refresh level 1 categories
                    const level1Categories = await fetchLevel1Categories();
                    this.populateDropdown(dropdown, level1Categories);
                }
            } catch (error) {
                console.warn('Failed to update dropdown:', dropdown, error);
            }
        }
    }
    
    /**
     * Update category statistics displays
     * @private
     */
    async updateCategoryStatistics() {
        // Find all category statistics elements and refresh them
        const statsElements = document.querySelectorAll('[data-category-stats]');
        
        for (const element of statsElements) {
            try {
                // Trigger a refresh of statistics
                const event = new CustomEvent('refreshCategoryStats');
                element.dispatchEvent(event);
            } catch (error) {
                console.warn('Failed to update category statistics:', element, error);
            }
        }
    }
    
    /**
     * Update product displays after category changes
     * @private
     */
    async updateProductDisplays() {
        // Find all product display elements and refresh them
        const productElements = document.querySelectorAll('[data-product-display]');
        
        for (const element of productElements) {
            try {
                // Trigger a refresh of product display
                const event = new CustomEvent('refreshProductDisplay');
                element.dispatchEvent(event);
            } catch (error) {
                console.warn('Failed to update product display:', element, error);
            }
        }
    }
    
    /**
     * Populate a dropdown with category options
     * @private
     * @param {HTMLSelectElement} dropdown - The dropdown element
     * @param {Array} categories - Array of category objects
     */
    populateDropdown(dropdown, categories) {
        // Store current value
        const currentValue = dropdown.value;
        
        // Clear existing options except the first one (usually a placeholder)
        const firstOption = dropdown.querySelector('option');
        dropdown.innerHTML = '';
        if (firstOption && firstOption.value === '') {
            dropdown.appendChild(firstOption);
        }
        
        // Add new options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id || category.name;
            option.textContent = category.displayName || category.name;
            dropdown.appendChild(option);
        });
        
        // Restore previous value if it still exists
        if (currentValue && dropdown.querySelector(`option[value="${currentValue}"]`)) {
            dropdown.value = currentValue;
        }
    }
    
    /**
     * Batch operation handler for multiple category operations
     * @param {Array} operations - Array of operation objects
     * @param {Object} options - Batch operation options
     * @returns {Promise<Array>} Array of operation results
     */
    async batchOperations(operations, options = {}) {
        const config = {
            continueOnError: false,
            refreshUIAfterBatch: true,
            ...options
        };
        
        const results = [];
        const errors = [];
        
        try {
            for (let i = 0; i < operations.length; i++) {
                const operation = operations[i];
                
                try {
                    let result;
                    
                    switch (operation.type) {
                        case 'create':
                            result = await apiCreateCategory(
                                operation.data.name,
                                operation.data.level,
                                operation.data.parentId
                            );
                            break;
                            
                        case 'delete':
                            result = await apiDeleteCategory(operation.data.name);
                            break;
                            
                        default:
                            throw new Error(`Unknown operation type: ${operation.type}`);
                    }
                    
                    results.push({
                        index: i,
                        operation,
                        result,
                        success: true
                    });
                    
                } catch (error) {
                    const errorResult = {
                        index: i,
                        operation,
                        error: this.enhanceError(error, operation.type),
                        success: false
                    };
                    
                    errors.push(errorResult);
                    results.push(errorResult);
                    
                    if (!config.continueOnError) {
                        break;
                    }
                }
            }
            
            // Clear cache after batch operations
            this.clearCache();
            
            // Refresh UI if requested and if any operations succeeded
            if (config.refreshUIAfterBatch && results.some(r => r.success)) {
                await this.refreshUIComponents('batch', {
                    operationCount: results.filter(r => r.success).length,
                    errorCount: errors.length
                });
            }
            
            return {
                results,
                errors,
                successCount: results.filter(r => r.success).length,
                errorCount: errors.length
            };
            
        } catch (error) {
            console.error('CategoryService: Error in batch operations:', error);
            throw this.enhanceError(error, 'batch');
        }
    }
    
    /**
     * Preload category data for better performance
     * @param {Object} options - Preload options
     * @returns {Promise<void>}
     */
    async preloadCategoryData(options = {}) {
        const config = {
            preloadLevel1: true,
            preloadLevel2: true,
            preloadLevel3: false, // Level 3 can be large, so default to false
            ...options
        };
        
        try {
            const promises = [];
            
            if (config.preloadLevel1) {
                promises.push(this.getParentCategories(2)); // This loads level 1 categories
            }
            
            if (config.preloadLevel2) {
                promises.push(this.getParentCategories(3)); // This loads level 2 categories
            }
            
            if (config.preloadLevel3) {
                promises.push(this.getAllCategoriesForDeletion()); // This loads all categories
            }
            
            await Promise.all(promises);
            
            console.log('CategoryService: Category data preloaded successfully');
            
        } catch (error) {
            console.warn('CategoryService: Error preloading category data:', error);
            // Don't throw error as this is a performance optimization
        }
    }
    
    /**
     * Get cache statistics for debugging
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const stats = {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            oldestEntry: null,
            newestEntry: null
        };
        
        let oldestTime = Date.now();
        let newestTime = 0;
        
        for (const [key, value] of this.cache.entries()) {
            if (value.timestamp < oldestTime) {
                oldestTime = value.timestamp;
                stats.oldestEntry = key;
            }
            if (value.timestamp > newestTime) {
                newestTime = value.timestamp;
                stats.newestEntry = key;
            }
        }
        
        return stats;
    }
}

// Create and export a singleton instance
export const categoryService = new CategoryService();

// Export the class for direct instantiation if needed
export default CategoryService;