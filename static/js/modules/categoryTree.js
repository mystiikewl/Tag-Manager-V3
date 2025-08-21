import { showLoadingOverlay, showError, showSuccess } from '../utils/ui.js';
import { categoryTree, selectedCategoriesList, categorySelectionSummary, productList } from '../domElements.js';
import { allCategories, selectedCategories, updateBulkCategoryState, handleCategorySelection } from '../core/stateManager.js';
import { updateAssignButtonState, updateSelectionDisplay, updateSelectedCategoriesDisplay } from '../uiHandlers.js';

// Add event listener for refreshing category display
document.addEventListener('refreshCategoryDisplay', async () => {
    console.log('refreshCategoryDisplay event received. Reloading categories...');
    await loadAllCategories();
});

// --- Category Display & API Calls ---
export async function loadAllCategories() {
    showLoadingOverlay(true, 'Loading categories...');
    try {
        // Load all categories from the backend 
        const response = await fetch('/api/categories/level1');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const level1Cats = await response.json();

        // Store all categories for tree building
        Object.keys(allCategories).forEach(key => delete allCategories[key]); // Clear existing
        level1Cats.forEach(cat => {
            allCategories[cat.id] = { 
                ...cat, 
                children: {},
                expanded: false,
                level: 1,
                hasChildren: cat.hasChildren || false // Ensure hasChildren is preserved
            };
        });
        
        // Render the category tree
        renderCategoryTree();
    } catch (error) {
        console.error('Failed to load categories:', error);
        showError('Failed to load categories. Please try again.');
    } finally {
        showLoadingOverlay(false);
    }
}

export async function renderCategoryTree() {
    categoryTree.innerHTML = '';
    
    // Render all level 1 categories
    const level1Categories = Object.values(allCategories).filter(cat => cat.level === 1);
    
    level1Categories.forEach(category => {
        const categoryNode = createCategoryTreeNode(category, 1);
        categoryTree.appendChild(categoryNode);
    });
}

export function createCategoryTreeNode(category, level) {
    // Main container
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'category-tree-node mb-2';
    nodeDiv.dataset.categoryId = category.id;
    nodeDiv.dataset.level = level;
    
    // Category header
    const headerDiv = document.createElement('div');
    headerDiv.className = `category-node-header flex items-center py-3 px-4 rounded-lg cursor-pointer 
                          bg-brand-near-white hover:bg-brand-grey-light transition-all duration-200 
                          border border-brand-grey-light shadow-sm`;
    headerDiv.style.marginLeft = `${(level - 1) * 20}px`;
    
    // Expand/collapse icon (if has children)
    if (category.hasChildren) {
        const expandIcon = document.createElement('button');
        expandIcon.className = 'expand-icon w-5 h-5 mr-3 text-brand-grey-medium hover:text-brand-dark transition-colors';
        expandIcon.innerHTML = category.expanded 
            ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
            : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
        
        // Add click event listener for expand/collapse functionality
        expandIcon.addEventListener('click', async (e) => {
            e.stopPropagation();
            await toggleCategoryNode(category, nodeDiv);
        });
        
        headerDiv.appendChild(expandIcon);
    } else {
        const spacer = document.createElement('div');
        spacer.className = 'w-5 h-5 mr-3';
        headerDiv.appendChild(spacer);
    }
    
    // Level badge
    const levelBadge = document.createElement('span');
    let badgeColorClass = '';
    if (level === 1) badgeColorClass = 'bg-blue-500 text-white';
    else if (level === 2) badgeColorClass = 'bg-red-500 text-white';   
    else badgeColorClass = 'bg-green-500 text-white';
    levelBadge.className = `w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${badgeColorClass}`;
    levelBadge.textContent = `L${level}`;
    
    // Category name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'font-semibold text-brand-dark flex-1';
    nameSpan.textContent = category.name;
    
    // Multi-selection checkbox instead of single selection indicator
    const checkboxDiv = document.createElement('div');
    checkboxDiv.className = 'checkbox-container ml-2';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'category-checkbox w-4 h-4 rounded border-2 border-brand-grey-medium text-brand-red focus:ring-brand-red transition-colors';
    checkbox.dataset.categoryId = category.id;
    checkbox.dataset.level = level;
    
    // Check if this category is already selected
    checkbox.checked = selectedCategories.has(category.id);
    
    // Add click event listener for checkbox
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        
        // Determine which page we're on and use appropriate handler
        const isMainPage = document.querySelector('#category-tree') && !document.querySelector('#product-table');
        
        console.log('Category checkbox changed:', {
            categoryId: category.id,
            checked: e.target.checked,
            isMainPage,
            hasMainPageHandler: !!window.handleMainPageCategorySelection,
            hasBulkPageHandler: !!window.handleCategorySelection
        });
        
        if (isMainPage && window.handleMainPageCategorySelection) {
            // Main page - use the new category selection system
            console.log('Using main page handler');
            window.handleMainPageCategorySelection(category.id, e.target.checked);
        } else if (window.handleCategorySelection) {
            // Bulk page - use the existing bulk selection system
            console.log('Using bulk page handler');
            handleCategorySelection(category.id, e.target.checked);
        } else {
            console.error('No appropriate category selection handler found');
        }
    });
    
    checkboxDiv.appendChild(checkbox);
    
    headerDiv.appendChild(levelBadge);
    headerDiv.appendChild(nameSpan);
    headerDiv.appendChild(checkboxDiv);
    
    nodeDiv.appendChild(headerDiv);
    
    // Children container (initially hidden unless expanded)
    if (category.hasChildren) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = `category-children mt-2 ${category.expanded ? '' : 'hidden'}`;
        childrenDiv.dataset.parentId = category.id;
        
        // Render children if already loaded
        Object.values(category.children || {}).forEach(child => {
            const childNode = createCategoryTreeNode(child, level + 1);
            childrenDiv.appendChild(childNode);
        });
        
        nodeDiv.appendChild(childrenDiv);
    }
    
    return nodeDiv;
}

export async function toggleCategoryNode(category, nodeElement) {
    category.expanded = !category.expanded;
    
    // Update expand icon
    const expandIcon = nodeElement.querySelector('.expand-icon');
    if (expandIcon) {
        expandIcon.innerHTML = category.expanded 
            ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
            : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
    }
    
    const childrenDiv = nodeElement.querySelector('.category-children');
    if (childrenDiv) {
        if (category.expanded) {
            // Load children if not already loaded
            if (Object.keys(category.children || {}).length === 0) {
                await loadCategoryChildren(category);
                // Re-render children
                childrenDiv.innerHTML = '';
                Object.values(category.children || {}).forEach(child => {
                    const childNode = createCategoryTreeNode(child, category.level + 1);
                    childrenDiv.appendChild(childNode);
                });
            }
            childrenDiv.classList.remove('hidden');
        } else {
            childrenDiv.classList.add('hidden');
        }
    }
}

export async function loadCategoryChildren(parentCategory) {
    try {
        const level = parentCategory.level + 1;
        const response = await fetch(`/api/categories/level${level}/${parentCategory.id}`);
        if (!response.ok) throw new Error(`Failed to fetch level ${level} categories`);
        
        const children = await response.json();
        parentCategory.children = {};
        
        children.forEach(child => {
            parentCategory.children[child.id] = {
                ...child,
                level: level,
                children: {},
                expanded: false,
                hasChildren: child.hasChildren || false // Ensure hasChildren is preserved
            };
            allCategories[child.id] = parentCategory.children[child.id];
        });
    } catch (error) {
        console.error(`Error loading category children:`, error);
        showError(`Failed to load subcategories. Please try again.`);
    }
}

export function updateCategorySelectionSummary() {
    if (!categorySelectionSummary || !selectedCategoriesList) return;
    
    if (selectedCategories.size === 0) {
        categorySelectionSummary.classList.add('hidden');
        return;
    }
    
    categorySelectionSummary.classList.remove('hidden');
    selectedCategoriesList.innerHTML = '';
    
    // Create chips for each selected category
    selectedCategories.forEach(catId => {
        const category = allCategories[catId];
        if (!category) return;
        
        const chip = document.createElement('span');
        const levelColors = {
            1: 'bg-blue-100 text-blue-800',
            2: 'bg-red-100 text-red-800',
            3: 'bg-green-100 text-green-800'
        };
        
        // Extract numeric level from string like "Level 2 Category" or use direct number
        let categoryLevel = category.level || 1;
        if (typeof categoryLevel === 'string') {
            const levelMatch = categoryLevel.match(/Level (\d+)/);
            categoryLevel = levelMatch ? parseInt(levelMatch[1]) : 1;
        }
        
        const bgColor = levelColors[categoryLevel] || levelColors[1];
        
        chip.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgColor}`;
        chip.innerHTML = `
            <span class="mr-1 font-bold">L${category.level}</span>
            <span>${category.name}</span>
            <button type="button" class="ml-1 inline-flex items-center justify-center w-4 h-4 text-current hover:bg-black hover:bg-opacity-20 rounded-full" onclick="window.removeCategoryFromSelection('${category.id}')">
                <svg class="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 8 8">
                    <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7"/>
                </svg>
            </button>
        `;
        
        selectedCategoriesList.appendChild(chip);
    });
}

export async function updateCurrentCategoriesDisplayForProducts(productIdsToUpdate) {
    if (!productIdsToUpdate || productIdsToUpdate.length === 0) return;

    // Use the /api/products/bulk-categories endpoint
    try {
        const response = await fetch('/api/products/bulk-categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_ids: productIdsToUpdate })
        });
        if (!response.ok) {
            throw new Error('Failed to fetch bulk category details');
        }
        const productsCategoriesMap = await response.json(); // Expects { product_id: [{id, name, level, parent}, ...], ... }

        productIdsToUpdate.forEach(productId => {
            const cellId = `product-cats-${productId}`;
            const cell = document.getElementById(cellId);
            if (cell) {
                const categoriesForProduct = productsCategoriesMap[productId] || [];
                if (categoriesForProduct.length > 0) {
                    // Display as small chips
                    cell.innerHTML = categoriesForProduct.map(cat => {
                        let bgColor = 'bg-brand-grey-medium'; // Default
                        if (cat.level === 1) bgColor = 'bg-blue-500';
                        else if (cat.level === 2) bgColor = 'bg-red-500';
                        else if (cat.level === 3) bgColor = 'bg-green-500';
                        return `<span class="inline-block ${bgColor} text-brand-white text-xs font-semibold px-2 py-2 rounded-full mb-1 mr-1 mt-1 ml-1">${cat.name}</span>`;
                    }).join('');
                } else {
                    cell.textContent = 'No categories assigned.';
                }
            }
        });
    } catch (error) {
        console.error('Error updating current categories display:', error);
        showError('Could not update product categories.');
        // Optionally set cell text to an error message for affected products
        productIdsToUpdate.forEach(productId => {
            const cell = document.getElementById(`product-cats-${productId}`);
            if (cell) cell.textContent = 'Error loading categories.';
        });
    }
}

export async function updateCurrentCategoriesDisplayForAllVisibleProducts() {
    const visibleProductIds = Array.from(productList.querySelectorAll('tr[data-product-id]'))
                                   .map(tr => tr.dataset.productId)
                                   .filter(id => id); // Filter out any undefined/null IDs
    if (visibleProductIds.length > 0) {
        await updateCurrentCategoriesDisplayForProducts(visibleProductIds);
    }
}

export async function expandAllCategories() {
    showLoadingOverlay(true, 'Expanding categories...');
    try {
        // Get all expandable categories
        const expandableNodes = document.querySelectorAll('.category-tree-node[data-level="1"], .category-tree-node[data-level="2"]');
        
        for (const nodeElement of expandableNodes) {
            const categoryId = nodeElement.dataset.categoryId;
            const category = allCategories[categoryId];
            
            if (category && category.hasChildren && !category.expanded) {
                await toggleCategoryNode(category, nodeElement);
                // Add small delay for smoother UX
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        showSuccess('All categories expanded');
    } catch (error) {
        console.error('Error expanding categories:', error);
        showError('Failed to expand all categories');
    } finally {
        showLoadingOverlay(false);
    }
}

export function collapseAllCategories() {
    // Collapse all expanded categories
    const expandedNodes = document.querySelectorAll('.category-tree-node');
    
    expandedNodes.forEach(nodeElement => {
        const categoryId = nodeElement.dataset.categoryId;
        const category = allCategories[categoryId];
        
        if (category && category.expanded) {
            category.expanded = false;
            
            // Update expand icon
            const expandIcon = nodeElement.querySelector('.expand-icon');
            if (expandIcon) {
                expandIcon.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
            }
            
            // Hide children
            const childrenDiv = nodeElement.querySelector('.category-children');
            if (childrenDiv) {
                childrenDiv.classList.add('hidden');
            }
        }
    });
    
    showSuccess('All categories collapsed');
}
