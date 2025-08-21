// UI Handlers for DOM manipulation

// Import dependencies
import { appState } from './appState.js';
import {
    fetchProductCategories,
    removeCategoryFromProduct,
    fetchBulkProductCategories,
    fetchCategoriesByLevelAndParent
} from './services/ApiService.js';

// Import DOM elements
import './domElements.js';

// Global DOM elements for compatibility (will be refactored incrementally)
const productSelect = document.getElementById('productSelect');
const productName = document.getElementById('product-name');
const productHandle = document.getElementById('product-handle');
const currentCategories = document.getElementById('current-categories');
const selectedCategoriesContainer = document.getElementById('selected-categories');
const successMessage = document.getElementById('success-message');
const createCategoryBtn = document.getElementById('newCategoryBtn');
const categoryModal = document.getElementById('categoryModal');
const categoryForm = document.getElementById('categoryForm');
const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
const cancelCategoryBtn2 = document.getElementById('cancelCategoryBtn2');
const categoryLevel = document.getElementById('categoryLevel');
const parentCategoryDiv = document.getElementById('parentCategoryDiv');
const parentCategory = document.getElementById('parentCategory');
const exportCsvBtn = document.getElementById('export-csv-btn');

// Utility function to extract correct category properties
function extractCategoryProperties(category) {
    console.log('Raw category object:', category);
    
    // Try to find the correct ID and name fields
    let categoryId = null;
    let categoryName = null;
    
    // Check for ID in various possible fields
    if (typeof category.id === 'number') {
        categoryId = category.id;
    } else if (typeof category.category_id === 'number') {
        categoryId = category.category_id;
    } else if (typeof category.categoryId === 'number') {
        categoryId = category.categoryId;
    }
    
    // Check for name in various possible fields
    if (typeof category.name === 'string') {
        categoryName = category.name;
    } else if (typeof category.category_name === 'string') {
        categoryName = category.category_name;
    } else if (typeof category.categoryName === 'string') {
        categoryName = category.categoryName;
    } else if (typeof category.id === 'string') {
        // It looks like the API is returning the category name in the ID field
        categoryName = category.id;
    }
    
    // If we still don't have an ID but have a name
    if (!categoryId && categoryName) {
        // Generate a consistent hash from the category name
        categoryId = hashCode(categoryName);
        console.log('Generated hash ID:', categoryId, 'for category name:', categoryName);
    }
    
    console.log('Final extracted properties:', { categoryId, categoryName });
    return { categoryId, categoryName };
}

// Simple hash function to generate numeric IDs from strings
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// Export UI handler functions
export function showSuccessMessage(message = 'Category successfully added!') {
    // Update the message text
    const messageSpan = successMessage.querySelector('span');
    if (messageSpan) {
        messageSpan.textContent = message;
    }
    
    // Show the message with proper responsive animation
    successMessage.classList.remove('hidden');
    
    // Add a small delay to ensure the element is rendered before animation
    requestAnimationFrame(() => {
        // Mobile: slide down from top
        // Desktop: slide in from right
        if (window.innerWidth >= 640) { // sm breakpoint
            successMessage.classList.remove('sm:translate-x-full');
            successMessage.classList.add('sm:translate-x-0');
        } else {
            successMessage.classList.remove('translate-y-[-100%]');
            successMessage.classList.add('translate-y-0');
        }
    });
    
    // Auto-hide after 4 seconds (longer for mobile users)
    setTimeout(() => {
        hideSuccessMessage();
    }, 4000);
}

// Add function to manually hide success message (for mobile close button)
export function hideSuccessMessage() {
    if (window.innerWidth >= 640) { // sm breakpoint
        successMessage.classList.remove('sm:translate-x-0');
        successMessage.classList.add('sm:translate-x-full');
    } else {
        successMessage.classList.remove('translate-y-0');
        successMessage.classList.add('translate-y-[-100%]');
    }
    
    // Hide completely after animation completes
    setTimeout(() => {
        successMessage.classList.add('hidden');
    }, 300);
}

export function setLoading(isLoading) {
    if (isLoading) {
        addButtonText.textContent = 'Adding...';
        loadingSpinner.classList.remove('hidden');
        confirmAddCategory.disabled = true;
    } else {
        addButtonText.textContent = 'Add';
        loadingSpinner.classList.add('hidden');
        confirmAddCategory.disabled = false;
    }
}

export function populateProductDropdown(products) {
    productSelect.innerHTML = '<option value="">Select a product...</option>';
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.product_id;
        option.textContent = product.product_name;
        productSelect.appendChild(option);
    });
    
    // Load categories for first 20 products
    const initialProductIds = products.slice(0, 20).map(p => p.product_id);
    if (initialProductIds.length > 0) {
        loadCategoriesForProducts(initialProductIds);
    }
}

async function loadCategoriesForProducts(productIds) {
    if (productIds.length === 0) return;
    
    try {
        const categoriesMap = await fetchBulkProductCategories(productIds);
        
        // Update UI with category counts
        productIds.forEach(productId => {
            const option = productSelect.querySelector(`option[value="${productId}"]`);
            if (option) {
                const categories = categoriesMap[productId] || [];
                const existingBadge = option.querySelector('.category-badge');
                if (existingBadge) existingBadge.remove();
                
                if (categories.length > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'category-badge ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full';
                    badge.textContent = `${categories.length} cats`;
                    option.appendChild(badge);
                }
            }
        });
    } catch (error) {
        console.error('Error loading bulk categories:', error);
    }
}

export function updateProductDisplay(product) {
    productName.textContent = product.product_name;
    productHandle.textContent = product.product_handle;

    // Get references to the display state elements
    const noProductState = document.getElementById('no-product-selected-state');
    const currentCategoriesDisplay = document.getElementById('current-categories');

    // Toggle visibility based on product selection
    if (product) {
        if (noProductState) noProductState.style.display = 'none';
        if (currentCategoriesDisplay) currentCategoriesDisplay.style.display = 'block';
    } else {
        if (noProductState) noProductState.style.display = 'block';
        if (currentCategoriesDisplay) currentCategoriesDisplay.style.display = 'none';
    }
}

export function displayCurrentProductCategories(categories) {
    currentCategories.innerHTML = '';
    const levelColors = {
        1: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
        2: 'bg-red-100 text-red-800 hover:bg-red-200',
        3: 'bg-green-100 text-green-800 hover:bg-green-200'
    };
    categories.forEach(category => {
        const chip = document.createElement('div');
        const level = category.level || 1;
        const colorClass = levelColors[level] || levelColors[1];
        chip.className = `inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${colorClass} mr-2 mb-2 shadow-sm transition-colors duration-200`;
        const text = document.createElement('span');
        text.textContent = category.name;
        chip.appendChild(text);
        const removeBtn = document.createElement('button');
        removeBtn.className = `ml-2 ${level === 1 ? 'text-blue-600 hover:text-blue-800' : 
                                  level === 2 ? 'text-red-600 hover:text-red-800' : 
                                  'text-green-600 hover:text-green-800'} focus:outline-none`;
        removeBtn.innerHTML = '×';
        removeBtn.onclick = async () => {
            try {
                const response = await removeCategoryFromProduct(appState.currentProductId, category.id);
                if (response.message) {
                    showSuccessMessage(response.message);
                    await refreshCategoryViews();
                }
            } catch (error) {
                showErrorMessage(`Error: ${error.message}`);
            }
        };
        chip.appendChild(removeBtn);
        currentCategories.appendChild(chip);
    });
}

export function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg transition-opacity duration-500 z-50';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // Remove the error message after 3 seconds
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => errorDiv.remove(), 500);
    }, 3000);
}

// Legacy function removed - now handled by enhanced system in main.js

export function createCategoryCard(category, level) {
    console.log('Creating category card:', category, 'Level:', level);
    
    const card = document.createElement('div');
    card.className = 'p-3 rounded-lg border border-gray-300 bg-white shadow-md hover:shadow-lg transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-blue-300 inline-flex items-start text-left min-w-[120px] max-w-xs cursor-pointer';
    
    // Extract correct category properties
    const { categoryId, categoryName } = extractCategoryProperties(category);
    
    console.log('Extracted - ID:', categoryId, 'Name:', categoryName);
    
    // Ensure we have valid category data
    if (!categoryId || !categoryName) {
        console.error('Category missing ID or name! Available properties:', Object.keys(category), category);
        return null;
    }
    
    card.dataset.categoryId = categoryId;
    card.dataset.level = level;
    
    // Store the original identifier for API calls
    card.dataset.originalId = category.id; // Store the original API identifier
    
    if (category.parent_id) {
        card.dataset.parentId = category.parent_id;
    }
    
    console.log('Set dataset:', { 
        categoryId: card.dataset.categoryId, 
        level: card.dataset.level, 
        originalId: card.dataset.originalId 
    });
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `category-${categoryId}`;
    checkbox.className = 'mt-[3px] w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1 focus:ring-offset-1 focus:ring-offset-white mr-2.5 shrink-0';
    
    const label = document.createElement('label');
    label.htmlFor = `category-${categoryId}`;
    label.className = 'cursor-pointer text-sm font-medium text-gray-700 select-none';
    label.textContent = categoryName;
    
    card.appendChild(checkbox);
    card.appendChild(label);
    
    // Add visual indicator for categories with children
    if (category.hasChildren || category.has_children) {
        const indicator = document.createElement('span');
        indicator.className = 'ml-auto text-xs text-gray-400 font-medium';
        indicator.textContent = '+';
        indicator.title = 'Has subcategories';
        card.appendChild(indicator);
    }
    
    // Note: Event listeners are now handled by the enhanced system in main.js
    // This ensures proper cleanup and prevents memory leaks
    
    return card;
}

// clearCategoryDisplayLevels function removed - now using simplified FAB system

export function populateCategoryLevelDisplay(categories, level) {
    const targetContainer = document.getElementById(`level${level}-categories`);
    if (!targetContainer) return;
    categories.forEach(category => {
        const { categoryId } = extractCategoryProperties(category);
        const existingCard = targetContainer.querySelector(`[data-category-id="${categoryId}"]`);
        if (!existingCard) {
            const card = createCategoryCard(category, level);
            if (card) { // Only append if card creation was successful
                targetContainer.appendChild(card);
            }
        }
    });
}

export function updateSelectedCategoriesDisplay() {
    // Ensure the container element exists before proceeding
    if (!selectedCategoriesContainer) {
        console.warn('selectedCategoriesContainer not found. Skipping category display update.');
        return;
    }

    const selectedCategories = appState.getCategories();
    selectedCategoriesContainer.innerHTML = '';
    
    if (selectedCategories.length === 0) {
        selectedCategoriesContainer.innerHTML = '<p class="text-gray-500 text-sm italic">No categories selected</p>';
        return;
    }
    
    // Add count indicator
    const countIndicator = document.createElement('div');
    countIndicator.className = 'text-xs text-gray-600 mb-2 font-medium';
    countIndicator.textContent = `${selectedCategories.length} category${selectedCategories.length > 1 ? 'ies' : ''} selected:`;
    selectedCategoriesContainer.appendChild(countIndicator);
    
    const chipContainer = document.createElement('div');
    chipContainer.className = 'flex flex-wrap gap-2';
    
    selectedCategories.forEach(categoryId => {
        const categoryName = getCategoryNameFromCard(categoryId);
        const categoryCard = document.querySelector(`[data-category-id="${categoryId}"]`);
        const categoryLevel = categoryCard ? parseInt(categoryCard.dataset.level) : 1;
        
        if (categoryName) {
            const chip = document.createElement('span');
            const levelColors = {
                1: 'bg-blue-100 text-blue-800 border-blue-200',
                2: 'bg-red-100 text-red-800 border-red-200',
                3: 'bg-green-100 text-green-800 border-green-200'
            };
            const colorClass = levelColors[categoryLevel] || levelColors[1];
            
            chip.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass} animate-fadeIn`;
            chip.textContent = categoryName;
            
            // Add remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'ml-1.5 inline-flex items-center justify-center w-4 h-4 text-current hover:bg-black hover:bg-opacity-10 rounded-full transition-colors';
            removeBtn.innerHTML = '×';
            removeBtn.title = 'Remove category';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                appState.removeCategory(parseInt(categoryId));
                // The UI will update automatically via the observer pattern
            };
            
            chip.appendChild(removeBtn);
            chipContainer.appendChild(chip);
        }
    });
    
    selectedCategoriesContainer.appendChild(chipContainer);
}

function getCategoryNameFromCard(categoryId) {
    const card = document.querySelector(`[data-category-id="${categoryId}"]`);
    return card ? card.querySelector('label').textContent : null;
}

// Old form functions removed - now using simplified FAB system

export function toggleCategoryModalVisibility(show) {
    if (show) {
        categoryModal.classList.remove('hidden');
    } else {
        categoryModal.classList.add('hidden');
    }
}

export function resetNewCategoryForm() {
    toggleCategoryModalVisibility(false);
    categoryForm.reset();
    parentCategoryDiv.classList.add('hidden');
}

export function populateParentCategoryDropdown(categories) {
    parentCategory.innerHTML = '<option value="">Select a parent category...</option>';
    categories.forEach(category => {
        const { categoryId, categoryName } = extractCategoryProperties(category);
        const option = document.createElement('option');
        option.value = categoryId;
        option.textContent = categoryName;
        parentCategory.appendChild(option);
    });
}

export function setExportButtonState(isLoading) {
    if (isLoading) {
        exportCsvBtn.disabled = true;
        const originalText = exportCsvBtn.textContent;
        exportCsvBtn.textContent = 'Exporting...';
        exportCsvBtn.dataset.originalText = originalText;
        
        // Add loading spinner if not present
        const spinner = exportCsvBtn.querySelector('.loading-spinner');
        if (!spinner) {
            const spinnerEl = document.createElement('span');
            spinnerEl.className = 'loading-spinner inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2';
            exportCsvBtn.insertBefore(spinnerEl, exportCsvBtn.firstChild);
        }
    } else {
        exportCsvBtn.disabled = false;
        const originalText = exportCsvBtn.dataset.originalText || 'Export CSV';
        exportCsvBtn.textContent = originalText;
        
        // Remove loading spinner
        const spinner = exportCsvBtn.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
}

export function updateLastModifiedUI(lastModified) {
    if (!lastModified) return;
    
    const productName = productSelect.options[productSelect.selectedIndex].text;
    console.log(`Last modified data for ${productName}:`, lastModified);
    
    // For now, just log the data. UI implementation would go here.
    // Future implementation might show a notification or update a timestamp display
}

// Old form UI functions removed - now using simplified FAB system

export function clearProductDetails() {
    productName.textContent = '';
    productHandle.textContent = '';
    currentCategories.innerHTML = '';
}

function uncheckCategoryCheckbox(categoryId) {
    const checkbox = document.querySelector(`[data-category-id="${categoryId}"] input[type="checkbox"]`);
    if (checkbox) {
        checkbox.checked = false;
    }
}

export async function refreshCategoryViews() {
    if (appState.currentProductId) {
        const categories = await fetchProductCategories(appState.currentProductId);
        displayCurrentProductCategories(categories);
    }
}

// Legacy function removed - subcategory loading now handled by enhanced system in main.js

export function clearSubCategories(level) {
    const targetContainer = document.getElementById(`level${level}-categories`);
    if (targetContainer) {
        targetContainer.innerHTML = '';
    }
}

// === DELETE CATEGORY UI HANDLERS ===

export function toggleDeleteCategoryModalVisibility(show) {
    const deleteCategoryModal = document.getElementById('deleteCategoryModal');
    if (show) {
        deleteCategoryModal.classList.remove('hidden');
    } else {
        deleteCategoryModal.classList.add('hidden');
    }
}

export function resetDeleteCategoryForm() {
    const deleteCategoryForm = document.getElementById('deleteCategoryForm');
    const deleteCategorySelect = document.getElementById('deleteCategorySelect');
    const deleteCategoryInfo = document.getElementById('deleteCategoryInfo');
    
    deleteCategoryForm.reset();
    deleteCategorySelect.innerHTML = '<option value="">Select category to delete...</option>';
    deleteCategoryInfo.classList.add('hidden');
}

export async function populateDeleteCategoryDropdown(level1Categories) {
    const deleteCategorySelect = document.getElementById('deleteCategorySelect');
    
    // Clear existing options
    deleteCategorySelect.innerHTML = '<option value="">Select category to delete...</option>';
    
    try {
        // Load all categories from the API to get the complete hierarchy
        const response = await fetch('/api/categories');
        const allCategories = await response.json();
        
        // Sort categories by hierarchy: Level 1, then Level 2, then Level 3
        const sortedCategories = allCategories.sort((a, b) => {
            // First sort by level
            const levelA = parseInt(a.level);
            const levelB = parseInt(b.level);
            if (levelA !== levelB) {
                return levelA - levelB;
            }
            // Then sort alphabetically within the same level
            return a.name.localeCompare(b.name);
        });
        
        // Add categories to dropdown with hierarchy indication
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            
            // Format the display name to show hierarchy
            let displayName = category.name;
            if (category.level === 2) {
                displayName = `  ↳ ${category.name}`;
            } else if (category.level === 3) {
                displayName = `    ↳ ${category.name}`;
            }
            
            option.textContent = displayName;
            deleteCategorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories for delete dropdown:', error);
        showErrorMessage('Failed to load categories');
    }
}

export function displayDeleteCategoryInfo(categoryInfo) {
    const deleteCategoryInfo = document.getElementById('deleteCategoryInfo');
    const deleteCategoryName = document.getElementById('deleteCategoryName');
    const deleteCategoryLevel = document.getElementById('deleteCategoryLevel');
    const deleteCategoryParent = document.getElementById('deleteCategoryParent');
    const deleteCategoryProductCount = document.getElementById('deleteCategoryProductCount');
    const deleteCategoryChildCount = document.getElementById('deleteCategoryChildCount');
    
    // Populate the information
    deleteCategoryName.textContent = categoryInfo.name;
    deleteCategoryLevel.textContent = categoryInfo.level;
    deleteCategoryParent.textContent = categoryInfo.parent || 'None';
    deleteCategoryProductCount.textContent = categoryInfo.product_count;
    deleteCategoryChildCount.textContent = categoryInfo.child_count;
    
    // Show the info section
    deleteCategoryInfo.classList.remove('hidden');
}

export function hideDeleteCategoryInfo() {
    const deleteCategoryInfo = document.getElementById('deleteCategoryInfo');
    deleteCategoryInfo.classList.add('hidden');
}

export function updateProductCounts() {
    const visibleCount = document.getElementById('visible-count');
    const totalCount = document.getElementById('total-count');
    // Assuming 'filteredProducts' and 'products' are accessible or passed as arguments
    // For now, I'll assume they are passed or globally available in the context where this is called.
    // In a fully refactored scenario, these would likely be managed by a state module.
    if (visibleCount) visibleCount.textContent = window.filteredProducts ? window.filteredProducts.length : 0;
    if (totalCount) totalCount.textContent = window.products ? window.products.length : 0;
}

export function updateSelectionSummary() {
    const selectionSummary = document.getElementById('selection-summary');
    // Assuming 'selectedProducts' is accessible or passed as an argument
    const count = window.selectedProducts ? window.selectedProducts.size : 0;
    selectionSummary.textContent = `${count} product${count !== 1 ? 's' : ''} selected`;
}

export function updateAssignButtonState(hasSelection) {
    const assignButton = document.getElementById('assignCategoriesBtn'); // Assuming this is the ID of the assign button
    if (assignButton) {
        assignButton.disabled = !hasSelection;
        assignButton.classList.toggle('opacity-50', !hasSelection);
        assignButton.classList.toggle('cursor-not-allowed', !hasSelection);
    }
}

export function updateSelectionDisplay() {
    // This function acts as a bridge to the existing updateSelectedCategoriesDisplay
    // to maintain compatibility with older imports if any.
    updateSelectedCategoriesDisplay();
}
