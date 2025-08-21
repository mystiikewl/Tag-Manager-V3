import { productSearch, categoryFilter, productList } from '../domElements.js';
import { getProducts, getFilteredProducts, setFilteredProducts } from '../core/stateManager.js';
import { showError } from '../utils/ui.js';
import { renderProducts } from './dataLoader.js';
import { updateCurrentCategoriesDisplayForAllVisibleProducts } from './categoryTree.js';

export async function applyProductFilters() {
    const searchTerm = productSearch.value.toLowerCase();
    const categoryFilterValue = categoryFilter.value;
    
    // Start with all products
    let filtered = [...getProducts()];
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(product => 
            product.product_name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply category filter
    if (categoryFilterValue !== 'all') {
        try {
            // Get category data for all products that passed search filter
            const productIds = filtered.map(p => p.product_id);
            const response = await fetch('/api/products/bulk-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, // Changed to application/json
                body: JSON.stringify({ product_ids: productIds })
            });
            
            if (response.ok) {
                const categoryData = await response.json();
                
                filtered = filtered.filter(product => {
                    const productCategories = categoryData[product.product_id] || [];
                    const categoryCount = productCategories.length;
                    
                    switch (categoryFilterValue) {
                        case 'uncategorized':
                            return categoryCount === 0;
                        case 'categorized':
                            return categoryCount > 0;
                        case 'multi-category':
                            return categoryCount > 1;
                        default:
                            return true;
                    }
                });
            }
        } catch (error) {
            console.error('Error applying category filter:', error);
            showError('Failed to apply category filter');
        }
    }
    
    setFilteredProducts(filtered);
    
    renderProducts(getFilteredProducts());
    await updateCurrentCategoriesDisplayForAllVisibleProducts();
}
