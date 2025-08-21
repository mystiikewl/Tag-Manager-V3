// ApiService.js: Enhanced service for making API calls with comprehensive error handling

const API_BASE_URL = '/api';

/**
 * Enhanced fetch wrapper with error handling, retries, and detailed error messages
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retry attempts
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function fetchWithErrorHandling(url, options = {}, retries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                // Try to parse error details from response
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData?.error || errorData?.message || errorMessage;
                } catch (parseError) {
                    // If response isn't JSON, use status text
                    errorMessage = response.statusText || errorMessage;
                }
                
                // Don't retry on client errors (4xx)
                if (response.status >= 400 && response.status < 500) {
                    throw new Error(errorMessage);
                }
                
                // Retry on server errors (5xx) and network issues
                if (attempt === retries) {
                    throw new Error(errorMessage);
                }
                
                console.warn(`API call failed (attempt ${attempt}/${retries}): ${url}`, errorMessage);
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
                continue;
            }
            
            // Handle different response types
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else if (response.status === 204) {
                return { message: 'Operation completed successfully' };
            }
            
            return response;
            
        } catch (error) {
            if (attempt === retries) {
                console.error(`API call failed after ${retries} attempts: ${url}`, error);
                throw error;
            }
            
            // Only retry on network errors, not parsing errors
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                console.warn(`Network error (attempt ${attempt}/${retries}): ${url}`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
                continue;
            }
            
            throw error;
        }
    }
}

// === PRODUCT RELATED API CALLS ===

/**
 * Fetches all products with optional hide_allocated filter
 * @param {boolean} hideAllocated - Whether to hide allocated products
 * @returns {Promise<Array>} Array of product objects
 */
export async function fetchProducts(hideAllocated = false) {
    try {
        const url = hideAllocated ? `${API_BASE_URL}/products?hide_allocated=true` : `${API_BASE_URL}/products`;
        return await fetchWithErrorHandling(url);
    } catch (error) {
        console.error('Error fetching products:', error);
        throw new Error('Failed to load products. Please try again.');
    }
}

/**
 * Fetches detailed information for a specific product
 * @param {string|number} productId - ID of the product
 * @returns {Promise<Object>} Product object
 */
export async function fetchProductDetails(productId) {
    try {
        // For now, get from product list (can be optimized with dedicated endpoint later)
        const products = await fetchProducts();
        const product = products.find(p => p.product_id == productId);
        if (!product) {
            throw new Error('Product not found');
        }
        return product;
    } catch (error) {
        console.error(`Error fetching product details for ${productId}:`, error);
        throw new Error('Failed to load product details. Please try again.');
    }
}

/**
 * Fetches categories assigned to a specific product
 * @param {string|number} productId - ID of the product
 * @returns {Promise<Array>} Array of category objects
 */
export async function fetchProductCategories(productId) {
    try {
        const url = `${API_BASE_URL}/products/${productId}/categories`;
        return await fetchWithErrorHandling(url);
    } catch (error) {
        console.error(`Error fetching categories for product ${productId}:`, error);
        throw new Error('Failed to load product categories. Please try again.');
    }
}

/**
 * Fetches last modified timestamp for a product
 * @param {string|number} productId - ID of the product
 * @returns {Promise<Object|null>} Last modified data or null if unavailable
 */
export async function fetchLastModifiedTimestamp(productId) {
    try {
        const url = `${API_BASE_URL}/products/${productId}/last-modified`;
        return await fetchWithErrorHandling(url, {}, 1); // Only try once for this non-critical feature
    } catch (error) {
        console.warn(`Could not fetch last modified timestamp for product ${productId}:`, error);
        return null; // Non-critical, return null on failure
    }
}

// === CATEGORY RELATED API CALLS ===

/**
 * Fetches all level 1 categories
 * @returns {Promise<Array>} Array of category objects
 */
export async function fetchLevel1Categories() {
    try {
        const url = `${API_BASE_URL}/categories/level1`;
        return await fetchWithErrorHandling(url);
    } catch (error) {
        console.error('Error fetching level 1 categories:', error);
        throw new Error('Failed to load top-level categories. Please try again.');
    }
}

/**
 * Fetches categories by level and parent ID
 * @param {number} level - Category level (2 or 3)
 * @param {string|number} parentId - ID of parent category
 * @returns {Promise<Array>} Array of category objects
 */
export async function fetchCategoriesByLevelAndParent(level, parentId) {
    try {
        // Encode the parent ID to handle special characters like '&' in category names
        const encodedParentId = encodeURIComponent(parentId);
        const url = `${API_BASE_URL}/categories/level${level}/${encodedParentId}`;
        console.log(`API Call: Fetching ${url} (original parentId: ${parentId})`);
        const result = await fetchWithErrorHandling(url);
        console.log(`API Response: Found ${result.length} categories for level ${level}, parent ${parentId}:`, result);
        return result;
    } catch (error) {
        console.error(`Error fetching level ${level} categories for parent ${parentId}:`, error);
        throw new Error(`Failed to load level ${level} categories. Please try again.`);
    }
}

/**
 * Fetches parent categories for new category dropdown
 * @param {string|number} level - Category level
 * @returns {Promise<Array>} Array of parent category objects
 */
export async function fetchParentCategoriesForNewCategoryDropdown(level) {
    if (level === '2' || level === '3') {
        try {
            // For now, always fetch level1 for parent dropdown
            const url = `${API_BASE_URL}/categories/level1`;
            return await fetchWithErrorHandling(url);
        } catch (error) {
            console.error('Error loading parent categories for dropdown:', error);
            throw new Error('Failed to load parent categories. Please try again.');
        }
    }
    return []; // No parent needed for Level 1, or invalid level
}

/**
 * Creates a new category
 * @param {string} name - Category name
 * @param {string|number} level - Category level
 * @param {string|number|null} parentId - Parent category ID (optional)
 * @returns {Promise<Object>} Created category object
 */
export async function createCategory(name, level, parentId = null) {
    const data = {
        name: name.trim(),
        level: parseInt(level),
        ...(parentId && parentId.trim() && parseInt(level) > 1 && { parent_id: parentId.trim() })
    };
    
    try {
        const url = `${API_BASE_URL}/categories/create`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        };
        
        return await fetchWithErrorHandling(url, options);
    } catch (error) {
        console.error('Error creating category:', error);
        if (error.message.includes('already exists')) {
            throw new Error(`Category "${name}" already exists. Please choose a different name.`);
        }
        throw new Error('Failed to create category. Please try again.');
    }
}

/**
 * Deletes a category and removes it from all products
 * @param {string} categoryName - Name of the category to delete
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteCategory(categoryName) {
    const data = {
        category_name: categoryName.trim()
    };
    
    try {
        const url = `${API_BASE_URL}/categories/delete`;
        const options = {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        };
        
        return await fetchWithErrorHandling(url, options);
    } catch (error) {
        console.error('Error deleting category:', error);
        if (error.message.includes('child categories')) {
            throw new Error('Cannot delete category with child categories. Please delete all child categories first.');
        }
        throw new Error('Failed to delete category. Please try again.');
    }
}

/**
 * Gets detailed information about a category
 * @param {string} categoryName - Name of the category
 * @returns {Promise<Object>} Category information including product and child counts
 */
export async function getCategoryInfo(categoryName) {
    try {
        const url = `${API_BASE_URL}/categories/${encodeURIComponent(categoryName)}/info`;
        return await fetchWithErrorHandling(url);
    } catch (error) {
        console.error('Error getting category info:', error);
        throw new Error('Failed to get category information. Please try again.');
    }
}

// === PRODUCT-CATEGORY ASSIGNMENT API CALLS ===

/**
 * Assigns categories to a product
 * @param {string|number} productId - ID of the product
 * @param {Array<string|number>} categoryIds - Array of category IDs
 * @returns {Promise<Object>} Assignment result
 */
export async function assignCategoriesToProduct(productId, categoryIds) {
    try {
        const url = `${API_BASE_URL}/products/${productId}/categories`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ category_ids: categoryIds })
        };
        
        return await fetchWithErrorHandling(url, options);
    } catch (error) {
        console.error('Error assigning categories:', error);
        throw new Error('Failed to assign categories. Please try again.');
    }
}

/**
 * Removes a category from a product
 * @param {string|number} productId - ID of the product
 * @param {string|number} categoryId - ID of the category to remove
 * @returns {Promise<Object>} Removal result
 */
export async function removeCategoryFromProduct(productId, categoryId) {
    try {
        const url = `${API_BASE_URL}/products/${productId}/category/${categoryId}`;
        const options = { method: 'DELETE' };
        
        const result = await fetchWithErrorHandling(url, options);
        return result || { message: 'Category removed successfully' };
    } catch (error) {
        console.error('Error removing category:', error);
        throw new Error('Failed to remove category. Please try again.');
    }
}

/**
 * Fetches categories for multiple products in bulk
 * @param {Array<string|number>} productIds - Array of product IDs
 * @returns {Promise<Object>} Map of product ID to categories array
 */
export async function fetchBulkProductCategories(productIds) {
    try {
        const url = `${API_BASE_URL}/products/bulk-categories`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_ids: productIds })
        };
        
        return await fetchWithErrorHandling(url, options);
    } catch (error) {
        console.error('Error loading bulk categories:', error);
        throw new Error('Failed to load category information. Please try again.');
    }
}

// === EXPORT API CALLS ===

/**
 * Exports product categories as CSV
 * @param {string|number} productId - ID of the product
 * @returns {Promise<{blob: Blob, filename: string}>} CSV blob and filename
 */
export async function fetchExportCSV(productId) {
    if (!productId) {
        throw new Error('Product ID is required for CSV export');
    }
    
    try {
        const url = `${API_BASE_URL}/export/csv?product_id=${productId}`;
        const response = await fetch(url); // Don't use fetchWithErrorHandling for blob responses
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || response.statusText || 'CSV Export failed');
        }
        
        if (response.headers.get('content-length') === '0') {
            throw new Error('Empty response from server for CSV export');
        }
        
        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'categories_export.csv';
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }
        
        return { blob, filename };
    } catch (error) {
        console.error('Error exporting CSV:', error);
        throw new Error('Failed to export CSV. Please try again.');
    }
}

// === UTILITY FUNCTIONS ===

/**
 * Validates if a response is successful
 * @param {Response} response - Fetch response object
 * @returns {boolean} True if response is successful
 */
export function isResponseSuccess(response) {
    return response && response.ok && response.status >= 200 && response.status < 300;
}

/**
 * Gets appropriate error message from various error sources
 * @param {Error|Object|string} error - Error object or message
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return 'An unexpected error occurred. Please try again.';
}

/**
 * New function to get category counts efficiently for bulk operations.
 * @param {Array<string|number>} productIds - Array of product IDs.
 * @returns {Promise<Object>} Map of product ID to category counts.
 */
export async function getCategoryCounts(productIds) {
    if (productIds.length === 0) return {};
    
    try {
        const response = await fetchWithErrorHandling('/api/products/bulk-categories-summary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_ids: productIds })
        });
        
        return response;
    } catch (error) {
        console.error('Error fetching category counts:', error);
        throw new Error('Failed to load category counts');
    }
}
