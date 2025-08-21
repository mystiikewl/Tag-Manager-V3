// DOM utility functions

export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });
    
    return element;
}

export function toggleVisibility(element, show) {
    if (show) {
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}

export function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

export function getLevelColorClass(level, isBadge = false) {
    switch (level) {
        case 1: 
            return isBadge ? 'bg-blue-100 text-blue-800' : 'bg-blue-600 text-white';
        case 2:
            return isBadge ? 'bg-red-100 text-red-800' : 'bg-red-600 text-white';
        case 3:
            return isBadge ? 'bg-green-100 text-green-800' : 'bg-green-600 text-white';
        default:
            return isBadge ? 'bg-gray-100 text-gray-800' : 'bg-gray-600 text-white';
    }
}

export function createCategoryChip(category, onRemove) {
    const level = category.level || 1;
    const colorClass = getLevelColorClass(level);
    
    const chip = createElement('div', {
        class: `inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${colorClass} mr-2 mb-2 shadow-sm transition-colors duration-200`
    });
    
    const text = createElement('span', {}, [category.name]);
    chip.appendChild(text);
    
    const removeBtn = createElement('button', {
        class: 'ml-2 focus:outline-none'
    }, ['×']);
    
    removeBtn.onclick = () => onRemove(category.id);
    chip.appendChild(removeBtn);
    
    return chip;
}

export function createCategoryCard(category, level, onSelect) {
    const card = createElement('div', {
        class: 'p-3 rounded-lg border border-gray-300 bg-white shadow-md hover:shadow-lg transition-all duration-200 ease-in-out hover:-translate-y-0.5 inline-flex items-start text-left min-w-[120px] max-w-xs',
        'data-category-id': category.id,
        'data-level': level
    });
    
    if (category.parent_id) {
        card.setAttribute('data-parent-id', category.parent_id);
    }
    
    const checkbox = createElement('input', {
        type: 'checkbox',
        id: `category-${category.id}`,
        class: 'mt-[3px] w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1 focus:ring-offset-1 focus:ring-offset-white mr-2.5 shrink-0'
    });
    
    const label = createElement('label', {
        for: `category-${category.id}`,
        class: 'cursor-pointer text-sm font-medium text-gray-700'
    }, [category.name]);
    
    card.appendChild(checkbox);
    card.appendChild(label);
    
    // Add click handler
    card.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
        }
        onSelect(category, checkbox.checked);
    });
    
    return card;
}

export function createSuccessMessage(message) {
    return createElement('div', {
        id: 'success-message',
        class: 'hidden fixed top-5 right-5 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out z-50 transform translate-x-full'
    }, [message]);
}

export function setLoadingState(button, isLoading, loadingText = 'Loading...', originalText = 'Submit') {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `
            <span>${loadingText}</span>
            <svg class="animate-spin ml-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3  7.938l3-2.647z"></path>
            </svg>
        `;
    } else {
        button.disabled = false;
        button.textContent = originalText;
    }
}