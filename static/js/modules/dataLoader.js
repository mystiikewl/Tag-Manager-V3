import { showLoadingOverlay, showError, showSuccess } from '../utils/ui.js';
import { appState } from '../appState.js';
import { getProducts, setProducts, getFilteredProducts, setFilteredProducts, selectedProducts } from '../core/stateManager.js'; // Import state variables and setters
import { productList, visibleCount, totalCount, selectionSummary } from '../domElements.js'; // Import DOM elements
import { updateCurrentCategoriesDisplayForAllVisibleProducts } from './categoryTree.js';
import { updateProductCounts, updateSelectionSummary } from '../uiHandlers.js';
import { debouncedRefreshAllStatistics } from '../utils/statisticsManager.js';

// --- Product Loading and Rendering ---
export async function loadProducts() {
    showLoadingOverlay(true, 'Loading products...');
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        setProducts(await response.json());
        setFilteredProducts([...getProducts()]); // Initialize filteredProducts
        
        // Check if we're on the main page (index.html) or bulk assignment page
        if (appState.getCurrentPage() === 'main') {
            await populateProductDropdown(getProducts());
        } else {
            renderProducts(getFilteredProducts());
            await updateCurrentCategoriesDisplayForAllVisibleProducts(); // Fetch categories for initially loaded products
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        showError('Failed to load products. Please try again.');
        setProducts([]); // Ensure products is an empty array on failure
        setFilteredProducts([]);
        if (appState.getCurrentPage() === 'main') {
            await populateProductDropdown([]);
        } else {
            renderProducts([]); // Render an empty table or error message
        }
    } finally {
        showLoadingOverlay(false);
    }
}

// Function to populate the product dropdown (for main page)
export async function populateProductDropdown(products) {
    const productSelect = document.getElementById('productSelect');
    if (!productSelect) return;
    
    productSelect.innerHTML = '<option value="">Choose a product...</option>';
    
    // Apply hide allocated filter if enabled
    const hideAllocatedToggle = document.getElementById('hide-allocated-toggle');
    const hideAllocated = hideAllocatedToggle ? hideAllocatedToggle.checked : false;
    
    let filteredProducts = products;
    
    if (hideAllocated) {
        // Use categorization status to filter more efficiently
        try {
            const response = await fetch('/api/products/categorization-status');
            if (response.ok) {
                const productsWithStatus = await response.json();
                filteredProducts = productsWithStatus.filter(product => !product.has_categories);
            } else {
                // Fallback to the old method
                filteredProducts = products.filter(product => !product.has_allocations);
            }
        } catch (error) {
            console.error('Failed to fetch categorization status, using fallback:', error);
            filteredProducts = products.filter(product => !product.has_allocations);
        }
    }
    
    filteredProducts.forEach(product => {
        const option = document.createElement('option');
        option.value = product.product_id;
        option.textContent = product.product_name;
        productSelect.appendChild(option);
    });
    
    // Update product count badge
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
    
    // Set up event listeners for product selection and filter toggle
    setupMainPageProductEvents();
}

// Set up event listeners for main page product functionality
let mainPageEventsSetup = false;
function setupMainPageProductEvents() {
    if (mainPageEventsSetup) return; // Prevent duplicate event listeners
    
    const productSelect = document.getElementById('productSelect');
    const hideAllocatedToggle = document.getElementById('hide-allocated-toggle');
    
    // Product selection event
    if (productSelect) {
        productSelect.addEventListener('change', handleProductSelection);
    }
    
    // Hide allocated toggle event
    if (hideAllocatedToggle) {
        hideAllocatedToggle.addEventListener('change', async () => {
            await populateProductDropdown(getProducts());
            // Also refresh product count badge when filter changes
            debouncedRefreshAllStatistics(300);
        });
    }
    
    mainPageEventsSetup = true;
}

// Handle product selection on main page
function handleProductSelection(event) {
    const productId = event.target.value;
    
    if (productId) {
        // Find the selected product
        const selectedProduct = getProducts().find(p => p.product_id === productId);
        if (selectedProduct) {
            // Update appState
            appState.setProduct(productId);
            
            // Show selected product in header
            if (window.showSelectedProduct) {
                window.showSelectedProduct(selectedProduct);
            }
            
            // Hide "no product selected" state and show category management
            const noProductState = document.getElementById('no-product-selected-state');
            const addCategoryBtn = document.getElementById('add-category-btn');
            const categoryTree = document.getElementById('category-tree');
            
            console.log('Product selected, updating UI elements:');
            console.log('- noProductState:', noProductState ? 'found' : 'not found');
            console.log('- addCategoryBtn:', addCategoryBtn ? 'found' : 'not found');
            console.log('- categoryTree:', categoryTree ? 'found' : 'not found');
            
            if (noProductState) noProductState.style.display = 'none';
            if (addCategoryBtn) {
                addCategoryBtn.style.display = 'block';
                console.log('Add Category button made visible');
            }
            if (categoryTree) categoryTree.style.display = 'block';
            
            // Load product categories
            loadProductCategories(productId);
        }
    } else {
        // Clear selection
        appState.clearProduct();
        
        // Clear product selection in header
        if (window.clearProductSelection) {
            window.clearProductSelection();
        }
        
        // Show "no product selected" state
        const noProductState = document.getElementById('no-product-selected-state');
        const addCategoryBtn = document.getElementById('add-category-btn');
        const categoryTree = document.getElementById('category-tree');
        
        if (noProductState) noProductState.style.display = 'block';
        if (addCategoryBtn) addCategoryBtn.style.display = 'none';
        if (categoryTree) categoryTree.style.display = 'none';
    }
}

// Load categories for the selected product
async function loadProductCategories(productId) {
    try {
        const response = await fetch(`/api/products/${productId}/categories`);
        if (response.ok) {
            const categories = await response.json();
            displayProductCategories(categories);
        }
    } catch (error) {
        console.error('Failed to load product categories:', error);
    }
}

// Display product categories
function displayProductCategories(categories) {
    const currentCategories = document.getElementById('current-categories');
    if (!currentCategories) return;
    
    // Show the current-categories section when a product is selected
    currentCategories.style.display = 'block';
    
    // Find the selected-categories div to update its content
    const selectedCategoriesDiv = document.getElementById('selected-categories');
    if (!selectedCategoriesDiv) return;
    
    if (categories.length === 0) {
        // Keep the existing styled message in the selected-categories div
        selectedCategoriesDiv.innerHTML = '<p class="text-gray-500 text-sm italic">No categories assigned to this product</p>';
        return;
    }
    
    // Clear the selected-categories content and show the assigned categories
    selectedCategoriesDiv.innerHTML = '';
    
    // Sort categories by level first, then by name
    const sortedCategories = [...categories].sort((a, b) => {
        const levelA = a.level || 1;
        const levelB = b.level || 1;
        
        if (levelA !== levelB) {
            return levelA - levelB; // Sort by level first
        }
        
        // If same level, sort by name
        const nameA = (a.name || a.category_name || '').toLowerCase();
        const nameB = (b.name || b.category_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    // Group categories by level for display
    const categoryLevels = {
        1: [],
        2: [],
        3: []
    };
    
    sortedCategories.forEach(category => {
        const level = category.level || 1;
        if (categoryLevels[level]) {
            categoryLevels[level].push(category);
        }
    });
    
    // Create category display organized by levels
    Object.keys(categoryLevels).forEach(level => {
        const levelCategories = categoryLevels[level];
        if (levelCategories.length === 0) return;
        
        const levelNum = parseInt(level);
        
        // Create level header
        const levelHeader = document.createElement('div');
        levelHeader.className = 'flex items-center mb-2 mt-3 first:mt-0';
        
        const levelBadge = document.createElement('span');
        const levelColors = {
            1: 'bg-blue-600 text-white',
            2: 'bg-red-600 text-white',
            3: 'bg-green-600 text-white'
        };
        levelBadge.className = `inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 ${levelColors[levelNum]}`;
        levelBadge.textContent = `L${levelNum}`;
        
        const levelTitle = document.createElement('span');
        levelTitle.className = 'text-sm font-semibold text-gray-700';
        const levelNames = {
            1: 'Industries',
            2: 'Subcategories', 
            3: 'Specialties'
        };
        levelTitle.textContent = `${levelNames[levelNum]} (${levelCategories.length})`;
        
        levelHeader.appendChild(levelBadge);
        levelHeader.appendChild(levelTitle);
        selectedCategoriesDiv.appendChild(levelHeader);
        
        // Create chip container for this level
        const chipContainer = document.createElement('div');
        chipContainer.className = 'flex flex-wrap gap-2 mb-3';
        
        levelCategories.forEach(category => {
            const chip = createCategoryChip(category, levelNum);
            chipContainer.appendChild(chip);
        });
        
        selectedCategoriesDiv.appendChild(chipContainer);
    });
}

// Helper function to create level-colored category chips
function createCategoryChip(category, level) {
    const categoryName = category.name || category.category_name || 'Unknown';
    const categoryId = category.id || category.category_id;
    
    const chip = document.createElement('div');
    
    // Level-based color classes
    const levelColors = {
        1: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
        2: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
        3: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
    };
    
    const colorClass = levelColors[level] || levelColors[1];
    chip.className = `inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border ${colorClass} transition-colors duration-200 shadow-sm`;
    
    // Add category name
    const nameSpan = document.createElement('span');
    nameSpan.textContent = categoryName;
    nameSpan.className = 'select-none';
    chip.appendChild(nameSpan);
    
    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = `ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-black hover:bg-opacity-10 focus:outline-none transition-colors duration-150`;
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove category';
    removeBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await removeCategoryFromProduct(categoryId);
    };
    
    chip.appendChild(removeBtn);
    
    return chip;
}

// Remove category from product
async function removeCategoryFromProduct(categoryId) {
    const productId = appState.getCurrentProductId();
    if (!productId) return;
    
    try {
        const response = await fetch(`/api/products/${productId}/category/${categoryId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showSuccess('Category removed successfully!');
            // Reload categories
            loadProductCategories(productId);
            // Refresh statistics and product count badge immediately
            debouncedRefreshAllStatistics(500);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to remove category');
        }
    } catch (error) {
        console.error('Failed to remove category:', error);
        showError(`Failed to remove category: ${error.message}`);
    }
}

// Export removeCategoryFromProduct for use in other modules
export { removeCategoryFromProduct };

export function renderProducts(productsToRender) {
    productList.innerHTML = ''; // Clear existing products

    if (productsToRender.length === 0) {
        const tr = productList.insertRow();
        const td = tr.insertCell();
        td.colSpan = 4; // Span across all columns (checkbox, name, categories, actions)
        td.textContent = 'No products found.';
        td.className = 'text-center py-4 text-brand-grey-medium';
        return;
    }

    // Get saved product selections
    const savedSelections = appState.getBulkProducts();

    productsToRender.forEach(product => {
        const tr = productList.insertRow();
        tr.dataset.productId = product.product_id;
        tr.className = 'hover:bg-blue-50 transition-colors duration-150';

        // Checkbox cell
        const tdCheckbox = tr.insertCell();
        tdCheckbox.className = 'px-4 py-3';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'product-checkbox rounded border-brand-grey-light text-brand-red focus:ring-brand-red';
        checkbox.dataset.productId = product.product_id;
        
        // Restore saved selection state
        checkbox.checked = savedSelections.includes(product.product_id);
        if (checkbox.checked) {
            selectedProducts.add(product.product_id);
            appState.addBulkProduct(product.product_id); // Sync with state
        }
        
        tdCheckbox.appendChild(checkbox);

        // Product Name cell
        const tdName = tr.insertCell();
        tdName.className = 'px-4 py-3 text-sm text-brand-dark font-medium';
        tdName.textContent = product.product_name;

        // Current Categories cell
        const tdCategories = tr.insertCell();
        tdCategories.className = 'px-4 py-3 text-sm text-brand-grey-medium product-categories-cell';
        tdCategories.id = `product-cats-${product.product_id}`; // ID for easy update
        tdCategories.textContent = 'Loading categories...'; // Placeholder
        
        // Actions cell
        const tdActions = tr.insertCell();
        tdActions.className = 'px-4 py-3 text-sm';
        const viewBtn = document.createElement('button');
        viewBtn.className = 'text-brand-red hover:text-brand-dark text-xs';
        viewBtn.textContent = 'View';
        viewBtn.onclick = () => window.open(`/?product=${product.product_id}`, '_blank');
        tdActions.appendChild(viewBtn);
    });
    
    // Update UI counters
    updateProductCounts();
    updateSelectionSummary();
}
