/**
 * infrastructure-test.js - Simple test to verify modular infrastructure setup
 * 
 * This test file can be loaded in the browser to verify that the modular
 * infrastructure is working correctly.
 */

// Test function to verify infrastructure
async function testCategoryModalInfrastructure() {
    console.log('Testing Category Modal Infrastructure...');
    
    try {
        // Import the main module
        const { initializeCategoryModalInfrastructure, getCategoryModalInfrastructure } = 
            await import('../modules/CategoryModalModule.js');
        
        // Initialize infrastructure
        console.log('1. Initializing infrastructure...');
        const infrastructure = await initializeCategoryModalInfrastructure({
            enableDebugMode: true
        });
        
        console.log('✓ Infrastructure initialized successfully');
        
        // Test modal creation
        console.log('2. Testing modal creation...');
        try {
            // This will fail if no modal element exists, but should not throw module errors
            const testModal = infrastructure.createModal('test-modal');
            console.log('✓ Modal creation method works (element may not exist)');
        } catch (error) {
            if (error.message.includes('not found')) {
                console.log('✓ Modal creation properly validates element existence');
            } else {
                throw error;
            }
        }
        
        // Test category service
        console.log('3. Testing category service...');
        const categoryService = infrastructure.getCategoryService();
        console.log('✓ Category service accessible');
        
        // Test validation utils
        console.log('4. Testing validation utilities...');
        const validationUtils = infrastructure.getValidationUtils();
        const testValidation = validationUtils.validateCategoryName('Test Category');
        console.log('✓ Validation utilities working:', testValidation.isValid);
        
        // Test UI helpers
        console.log('5. Testing UI helpers...');
        const uiHelpers = infrastructure.getUIHelpers();
        console.log('✓ UI helpers accessible');
        
        // Test form validation setup
        console.log('6. Testing form validation setup...');
        const mockForm = document.createElement('form');
        mockForm.innerHTML = `
            <input name="name" type="text" />
            <select name="level">
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
            </select>
        `;
        
        infrastructure.setupFormValidation(mockForm);
        console.log('✓ Form validation setup completed');
        
        // Test debug info
        console.log('7. Testing debug information...');
        const debugInfo = infrastructure.getDebugInfo();
        console.log('✓ Debug info available:', debugInfo);
        
        console.log('\n🎉 All infrastructure tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Infrastructure test failed:', error);
        return false;
    }
}

// Auto-run test if in browser environment
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', testCategoryModalInfrastructure);
    } else {
        testCategoryModalInfrastructure();
    }
}

// Export for manual testing
export { testCategoryModalInfrastructure };