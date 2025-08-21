// Enhanced bulk assignment with revolutionary UX improvements
import { appState } from './appState.js';

// DOM Elements - Category Tree
const categoryPanel = document.getElementById('category-panel');
const resizeHandle = document.getElementById('resize-handle');
const categoryTree = document.getElementById('category-tree');
const categorySearch = document.getElementById('category-search');
const expandAllBtn = document.getElementById('expand-all');
const collapseAllBtn = document.getElementById('collapse-all');
const categoryBreadcrumb = document.getElementById('category-breadcrumb');
const breadcrumbPath = document.getElementById('breadcrumb-path');

// DOM Elements - Products
const productSearch = document.getElementById('product-search');
const categoryFilter = document.getElementById('category-filter');
const selectAllCheckbox = document.getElementById('select-all-checkbox');
const selectAllVisibleBtn = document.getElementById('select-all-visible');
const selectFilteredBtn = document.getElementById('select-filtered');
const productList = document.getElementById('product-list');
const visibleCount = document.getElementById('visible-count');
const totalCount = document.getElementById('total-count');
const selectionSummary = document.getElementById('selection-summary');

// DOM Elements - Actions
const clearSelectionBtn = document.getElementById('clear-selection');
const assignCategoriesBtn = document.getElementById('assign-categories');

// DOM Elements - Modals
const assignmentPreviewModal = document.getElementById('assignment-preview-modal');
const progressModal = document.getElementById('progress-modal');
const loadingOverlay = document.getElementById('loading-overlay');
const notificationContainer = document.getElementById('notification-container');

// State management
let products = [];
let filteredProducts = [];
let categoryData = {};
let selectedCategory = null;
let selectedProducts = new Set();
let currentAsyncOperation = null;
let isResizing = false;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    appState.setCurrentPage('bulk');
    
    await Promise.all([
        loadCategoryTree(),
        loadProducts()
    ]);
    
    setupBulkPageEventListeners(); // Call bulk page specific event listeners
    setupResizablePanels();
    restorePageState();
});

// ===== CATEGORY TREE FUNCTIONALITY =====

async function loadCategoryTree() {
    showLoadingOverlay(true, 'Loading categories...');
    try {
        // Use simple approach first - load all categories and group by level
        const response = await fetch('/api/categories');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const allCategories = await response.json();
        console.log('Loaded categories:', allCategories);
        
        categoryData = buildSimpleCategoryTree(allCategories);
        renderCategoryTree();
    } catch (error) {
        console.error('Failed to load categories:', error);
        showError('Failed to load categories. Please try again.');
        categoryData = {};
    } finally {
        showLoadingOverlay(false);
    }
}

function buildSimpleCategoryTree(allCategories) {
    const tree = { children: {} };
    
    // Group categories by level and create a simple hierarchy
    const level1Categories = allCategories.filter(cat => cat.level === 1);
    const level2Categories = allCategories.filter(cat => cat.level === 2);
    const level3Categories = allCategories.filter(cat => cat.level === 3);
    
    console.log('Level 1 categories:', level1Categories);
    console.log('Level 2 categories:', level2Categories);
    console.log('Level 3 categories:', level3Categories);
    
    // For now, just create a flat structure showing all categories
    // We can enhance this to be hierarchical later
    allCategories.forEach(cat => {
        if (cat.level === 1) {
            tree.children[cat.id] = {
                category_name: cat.id || cat.name,
                level: cat.level,
                children: {},
                expanded: false,
                hasChildren: false // Simplified for now
            };
        }
    });
    
    return tree;
}

function renderCategoryTree() {
    categoryTree.innerHTML = '';
    if (!categoryData.children) return;
    
    const searchTerm = categorySearch.value.toLowerCase().trim();
    
    Object.values(categoryData.children).forEach(category => {
        const treeNode = createCategoryTreeNode(category, 1, searchTerm);
        if (treeNode) categoryTree.appendChild(treeNode);
    });
}

function createCategoryTreeNode(category, level, searchTerm = '') {
    const shouldShow = !searchTerm || 
        category.category_name.toLowerCase().includes(searchTerm) ||
        hasMatchingChild(category, searchTerm);
        
    if (!shouldShow) return null;
    
    const isExpanded = category.expanded || searchTerm;
    const hasChildren = Object.keys(category.children || {}).length > 0;
    
    // Main container
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'category-tree-node';
    nodeDiv.dataset.categoryId = category.category_name;
    nodeDiv.dataset.level = level;
    
    // Category header
    const headerDiv = document.createElement('div');
    headerDiv.className = `category-node-header flex items-center py-2 px-3 rounded-lg cursor-pointer hover:bg-brand-near-white transition-colors`;
    headerDiv.style.marginLeft = `${(level - 1) * 16}px`;
    
    // Expand/collapse icon
    if (hasChildren) {
        const expandIcon = document.createElement('button');
        expandIcon.className = 'expand-icon w-4 h-4 mr-2 text-brand-grey-medium hover:text-brand-dark transition-colors';
        expandIcon.innerHTML = isExpanded 
            ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
            : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
        
        expandIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCategoryNode(category, nodeDiv);
        });
        
        headerDiv.appendChild(expandIcon);
    } else {
        const spacer = document.createElement('div');
        spacer.className = 'w-4 h-4 mr-2';
        headerDiv.appendChild(spacer);
    }
    
    // Category info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'flex-1 flex items-center justify-between';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'font-medium text-brand-dark';
    nameSpan.textContent = category.category_name;
    
    if (searchTerm && category.category_name.toLowerCase().includes(searchTerm)) {
        nameSpan.innerHTML = highlightSearchTerm(category.category_name, searchTerm);
    }
    
    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'text-xs bg-brand-near-white text-brand-grey-medium px-2 py-1 rounded-full';
    badgeSpan.textContent = `L${category.level || level}`;
    
    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(badgeSpan);
    headerDiv.appendChild(infoDiv);
    
    // Click handler for category selection
    headerDiv.addEventListener('click', () => selectCategory(category));
    
    nodeDiv.appendChild(headerDiv);
    
    // Children container
    if (hasChildren) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = `category-children ${isExpanded ? '' : 'hidden'}`;
        
        Object.values(category.children).forEach(child => {
            const childNode = createCategoryTreeNode(child, level + 1, searchTerm);
            if (childNode) childrenDiv.appendChild(childNode);
        });
        
        nodeDiv.appendChild(childrenDiv);
    }
    
    return nodeDiv;
}

function hasMatchingChild(category, searchTerm) {
    if (!category.children) return false;
    
    return Object.values(category.children).some(child => 
        child.category_name.toLowerCase().includes(searchTerm) ||
        hasMatchingChild(child, searchTerm)
    );
}

function highlightSearchTerm(text, searchTerm) {
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toggleCategoryNode(category, nodeElement) {
    category.expanded = !category.expanded;
    
    const childrenDiv = nodeElement.querySelector('.category-children');
    const expandIcon = nodeElement.querySelector('.expand-icon');
    
    if (category.expanded) {
        childrenDiv.classList.remove('hidden');
        expandIcon.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>';
    } else {
        childrenDiv.classList.add('hidden');
        expandIcon.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
    }
}

function selectCategory(category) {
    // Clear previous selection
    document.querySelectorAll('.category-node-header').forEach(header => {
        header.classList.remove('bg-brand-red', 'text-white');
        header.classList.add('hover:bg-brand-near-white');
    });
    
    // Highlight selected category
    const selectedHeader = document.querySelector(`[data-category-id="${category.category_name}"] .category-node-header`);
    if (selectedHeader) {
        selectedHeader.classList.add('bg-brand-red', 'text-white');
        selectedHeader.classList.remove('hover:bg-brand-near-white');
    }
    
    selectedCategory = category;
    appState.setBulkCategory(category);
    
    updateBreadcrumb(category);
    updateAssignButtonState();
    
    showSuccess(`Selected category: ${category.category_name}`);
}

function updateBreadcrumb(category) {
    if (!category) {
        categoryBreadcrumb.classList.add('hidden');
        return;
    }
    
    breadcrumbPath.innerHTML = '';
    
    // For now, just show the category name - breadcrumb path can be enhanced later
    const item = document.createElement('span');
    item.textContent = category.category_name;
    item.className = 'font-semibold text-brand-dark';
    breadcrumbPath.appendChild(item);
    
    categoryBreadcrumb.classList.remove('hidden');
}

// ===== PRODUCT MANAGEMENT =====

async function loadProducts() {
    showLoadingOverlay(true, 'Loading products...');
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        products = await response.json();
        console.log('Loaded products:', products.length); // Debug log
        await updateProductCategories();
        applyFilters();
        updateProductCounts();
    } catch (error) {
        console.error('Failed to load products:', error);
        showError('Failed to load products. Please try again.');
        products = [];
        filteredProducts = [];
        renderProducts(); // Ensure we render empty state
    } finally {
        showLoadingOverlay(false);
    }
}

function applyFilters() {
    const searchTerm = productSearch.value.toLowerCase().trim();
    const filterValue = categoryFilter.value;
    
    filteredProducts = products.filter(product => {
        // Text search filter
        if (searchTerm && !product.product_name.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        // Category filter
        const categoriesCount = (product.categories || []).length;
        switch (filterValue) {
            case 'uncategorized':
                return categoriesCount === 0;
            case 'categorized':
                return categoriesCount > 0;
            case 'multi-category':
                return categoriesCount > 1;
            default:
                return true;
        }
    });
    
    renderProducts();
    updateProductCounts();
}

function renderProducts() {
    productList.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        const tr = productList.insertRow();
        const td = tr.insertCell();
        td.colSpan = 4;
        td.textContent = 'No products found matching the current filters.';
        td.className = 'text-center py-8 text-brand-grey-medium';
        return;
    }
    
    const savedSelections = appState.getBulkProducts();
    
    filteredProducts.forEach(product => {
        const tr = productList.insertRow();
        tr.dataset.productId = product.product_id;
        tr.className = 'hover:bg-brand-near-white transition-colors';
        
        // Checkbox cell
        const tdCheckbox = tr.insertCell();
        tdCheckbox.className = 'px-4 py-3';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'product-checkbox rounded border-brand-grey-light text-brand-red focus:ring-brand-red';
        checkbox.dataset.productId = product.product_id;
        checkbox.checked = savedSelections.includes(product.product_id);
        
        if (checkbox.checked) {
            selectedProducts.add(product.product_id);
        }
        
        checkbox.addEventListener('change', handleProductCheckboxChange);
        tdCheckbox.appendChild(checkbox);
        
        // Product Name cell
        const tdName = tr.insertCell();
        tdName.className = 'px-4 py-3 text-sm text-brand-dark font-medium';
        tdName.textContent = product.product_name;
        
        // Current Categories cell
        const tdCategories = tr.insertCell();
        tdCategories.className = 'px-4 py-3 text-sm';
        tdCategories.id = `product-cats-${product.product_id}`;
        
        if (product.categories && product.categories.length > 0) {
            const categoryChips = product.categories.map(cat => 
                `<span class="inline-block bg-brand-near-white text-brand-dark text-xs px-2 py-1 rounded-full mr-1 mb-1">${cat}</span>`
            ).join('');
            tdCategories.innerHTML = categoryChips;
        } else {
            tdCategories.innerHTML = '<span class="text-brand-grey-medium italic">No categories</span>';
        }
        
        // Actions cell
        const tdActions = tr.insertCell();
        tdActions.className = 'px-4 py-3 text-sm';
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'text-brand-red hover:text-brand-dark transition-colors';
        viewBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>';
        viewBtn.title = 'View product details';
        
        tdActions.appendChild(viewBtn);
    });
}

async function updateProductCategories() {
    // For now, assume products already have categories from the API
    // This can be enhanced with a bulk categories endpoint later
    try {
        // Simulate category loading for each product
        for (const product of products) {
            if (!product.categories) {
                product.categories = []; // Initialize empty if not present
            }
        }
    } catch (error) {
        console.error('Failed to load product categories:', error);
    }
}

// ===== EVENT HANDLERS =====

function setupEventListeners() {
    // Category tree controls
    categorySearch.addEventListener('input', debounce(handleCategorySearch, 300));
    expandAllBtn.addEventListener('click', () => expandAllCategories(true));
    collapseAllBtn.addEventListener('click', () => expandAllCategories(false));
    
    // Product controls
    productSearch.addEventListener('input', debounce(applyFilters, 300));
    categoryFilter.addEventListener('change', applyFilters);
    selectAllCheckbox.addEventListener('change', handleSelectAllCheckbox);
    selectAllVisibleBtn.addEventListener('click', () => selectAllVisible(true));
    selectFilteredBtn.addEventListener('click', () => selectAllFiltered());
    
    // Main actions
    clearSelectionBtn.addEventListener('click', clearAllSelections);
    assignCategoriesBtn.addEventListener('click', showAssignmentPreview);
    
    // Modal handlers
    document.getElementById('cancel-assignment').addEventListener('click', hideAssignmentPreview);
    document.getElementById('confirm-assignment').addEventListener('click', confirmAssignment);
}

function handleCategorySearch() {
    renderCategoryTree();
}

function handleProductCheckboxChange(event) {
    const productId = event.target.dataset.productId;
    
    if (event.target.checked) {
        selectedProducts.add(productId);
        appState.addBulkProduct(productId);
    } else {
        selectedProducts.delete(productId);
        appState.removeBulkProduct(productId);
    }
    
    updateSelectionSummary();
    updateAssignButtonState();
}

function handleSelectAllCheckbox() {
    const isChecked = selectAllCheckbox.checked;
    selectAllVisible(isChecked);
}

function selectAllVisible(select = true) {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    
    checkboxes.forEach(checkbox => {
        const productId = checkbox.dataset.productId;
        checkbox.checked = select;
        
        if (select) {
            selectedProducts.add(productId);
            appState.addBulkProduct(productId);
        } else {
            selectedProducts.delete(productId);
            appState.removeBulkProduct(productId);
        }
    });
    
    updateSelectionSummary();
    updateAssignButtonState();
}

function selectAllFiltered() {
    filteredProducts.forEach(product => {
        selectedProducts.add(product.product_id);
        appState.addBulkProduct(product.product_id);
        
        const checkbox = document.querySelector(`[data-product-id="${product.product_id}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    updateSelectionSummary();
    updateAssignButtonState();
}

function clearAllSelections() {
    selectedProducts.clear();
    appState.clearBulkProducts();
    
    document.querySelectorAll('.product-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    selectAllCheckbox.checked = false;
    updateSelectionSummary();
    updateAssignButtonState();
    
    showSuccess('Selection cleared');
}

function expandAllCategories(expand = true) {
    function toggleAll(obj) {
        if (obj.children) {
            obj.expanded = expand;
            Object.values(obj.children).forEach(toggleAll);
        }
    }
    
    Object.values(categoryData.children || {}).forEach(toggleAll);
    renderCategoryTree();
    
    showSuccess(expand ? 'All categories expanded' : 'All categories collapsed');
}

// ===== ASSIGNMENT WORKFLOW =====

function showAssignmentPreview() {
    if (!selectedCategory || selectedProducts.size === 0) {
        showError('Please select a category and at least one product');
        return;
    }
    
    // Populate preview modal
    document.getElementById('preview-category').textContent = selectedCategory.category_name;
    
    const selectedProductsList = Array.from(selectedProducts).map(productId => {
        const product = products.find(p => p.product_id === productId);
        return product ? product.product_name : productId;
    });
    
    const previewProducts = document.getElementById('preview-products');
    previewProducts.innerHTML = selectedProductsList.map(name => 
        `<div class="text-sm text-brand-dark bg-brand-near-white px-3 py-2 rounded">${name}</div>`
    ).join('');
    
    const impactSummary = `${selectedProducts.size} products will be assigned to "${selectedCategory.category_name}" category.`;
    document.getElementById('preview-impact').textContent = impactSummary;
    
    assignmentPreviewModal.classList.remove('hidden');
}

function hideAssignmentPreview() {
    assignmentPreviewModal.classList.add('hidden');
}

async function confirmAssignment() {
    hideAssignmentPreview();
    
    const productIds = Array.from(selectedProducts);
    const categoryId = selectedCategory.category_name;
    
    // Show progress modal
    showProgressModal(productIds.length);
    
    try {
        // Use existing assignment endpoint for each product
        let completed = 0;
        
        for (const productId of productIds) {
            const response = await fetch(`/api/products/${productId}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category_ids: [categoryId]
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to assign category to product ${productId}`);
            }
            
            completed++;
            updateProgress(completed, productIds.length);
            
            // Small delay for smoother UX
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Success
        hideProgressModal();
        showSuccess(`Successfully assigned ${productIds.length} products to "${categoryId}"`);
        
        // Refresh product data and clear selection
        await updateProductCategories();
        clearAllSelections();
        renderProducts();
        
    } catch (error) {
        console.error('Assignment failed:', error);
        hideProgressModal();
        showError(`Failed to assign categories: ${error.message}`);
    }
}

function showProgressModal(total) {
    document.getElementById('progress-total').textContent = total;
    document.getElementById('progress-count').textContent = '0';
    document.getElementById('progress-bar').style.width = '0%';
    progressModal.classList.remove('hidden');
}

function updateProgress(completed, total) {
    const percentage = Math.round((completed / total) * 100);
    document.getElementById('progress-count').textContent = completed;
    document.getElementById('progress-bar').style.width = `${percentage}%`;
}

function hideProgressModal() {
    progressModal.classList.add('hidden');
}

// ===== RESIZABLE PANELS =====

function setupResizablePanels() {
    let startX, startWidth;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(document.defaultView.getComputedStyle(categoryPanel).width, 10);
        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });
    
    function doResize(e) {
        if (!isResizing) return;
        
        const diff = e.clientX - startX;
        const newWidth = startWidth + diff;
        const minWidth = 300;
        const maxWidth = window.innerWidth * 0.5;
        
        const constrainedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
        const widthPercent = (constrainedWidth / window.innerWidth) * 100;
        
        categoryPanel.style.width = `${widthPercent}%`;
    }
    
    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
        document.body.style.cursor = '';
    }
}

// ===== UTILITY FUNCTIONS =====

function updateSelectionSummary() {
    const count = selectedProducts.size;
    selectionSummary.textContent = `${count} product${count !== 1 ? 's' : ''} selected`;
}

function updateProductCounts() {
    visibleCount.textContent = filteredProducts.length;
    totalCount.textContent = products.length;
}

function updateAssignButtonState() {
    const hasSelection = selectedProducts.size > 0;
    const hasCategory = selectedCategory !== null;
    const canAssign = hasSelection && hasCategory;
    
    assignCategoriesBtn.disabled = !canAssign;
    assignCategoriesBtn.classList.toggle('opacity-50', !canAssign);
    assignCategoriesBtn.classList.toggle('cursor-not-allowed', !canAssign);
}

function restorePageState() {
    try {
        const savedCategory = appState.getBulkCategory();
        if (savedCategory) {
            selectCategory(savedCategory);
        }
        
        const savedProducts = appState.getBulkProducts();
        savedProducts.forEach(productId => {
            selectedProducts.add(productId);
            const checkbox = document.querySelector(`[data-product-id="${productId}"]`);
            if (checkbox) checkbox.checked = true;
        });
        
        updateSelectionSummary();
        updateAssignButtonState();
        
        if (savedProducts.length > 0) {
            showSuccess('Previous selection restored');
        }
    } catch (error) {
        console.warn('Could not restore previous state:', error);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
