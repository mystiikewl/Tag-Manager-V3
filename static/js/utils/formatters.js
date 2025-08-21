// Formatting utility functions

export function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${day}-${month}-${year} at ${hours}:${minutes}:${seconds}`;
}

export function formatCategoryLevel(level) {
    switch(level) {
        case 1: return 'Level 1 (Top Level)';
        case 2: return 'Level 2 (Sub Category)';
        case 3: return 'Level 3 (Detailed Category)';
        default: return `Level ${level}`;
    }
}

export function truncateString(str, maxLength = 50) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}

export function formatNumberWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function getCategoryDisplayName(category) {
    return `${category.name} (L${category.level})`;
}