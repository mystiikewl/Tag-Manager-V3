/**
 * ModuleLoader.js - Module dependency management and loading system
 * 
 * This module provides a centralized system for managing JavaScript module dependencies,
 * ensuring proper loading order and handling module initialization.
 */

/**
 * Module registry for tracking loaded modules and their dependencies
 */
class ModuleRegistry {
    constructor() {
        this.modules = new Map();
        this.loadingPromises = new Map();
        this.dependencyGraph = new Map();
        this.initialized = new Set();
    }
    
    /**
     * Register a module with its dependencies
     * @param {string} name - Module name
     * @param {Function} factory - Module factory function
     * @param {Array<string>} dependencies - Array of dependency module names
     */
    register(name, factory, dependencies = []) {
        this.modules.set(name, {
            factory,
            dependencies,
            instance: null,
            loaded: false
        });
        
        this.dependencyGraph.set(name, dependencies);
    }
    
    /**
     * Load a module and its dependencies
     * @param {string} name - Module name to load
     * @returns {Promise} Promise that resolves to the module instance
     */
    async load(name) {
        // Return existing loading promise if already loading
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }
        
        // Return cached instance if already loaded
        const moduleInfo = this.modules.get(name);
        if (moduleInfo && moduleInfo.loaded && moduleInfo.instance) {
            return moduleInfo.instance;
        }
        
        // Create loading promise
        const loadingPromise = this._loadModule(name);
        this.loadingPromises.set(name, loadingPromise);
        
        try {
            const instance = await loadingPromise;
            this.loadingPromises.delete(name);
            return instance;
        } catch (error) {
            this.loadingPromises.delete(name);
            throw error;
        }
    }
    
    /**
     * Internal module loading logic
     * @private
     * @param {string} name - Module name
     * @returns {Promise} Promise that resolves to module instance
     */
    async _loadModule(name) {
        const moduleInfo = this.modules.get(name);
        if (!moduleInfo) {
            throw new Error(`Module '${name}' not found in registry`);
        }
        
        // Load dependencies first
        const dependencyInstances = {};
        for (const depName of moduleInfo.dependencies) {
            dependencyInstances[depName] = await this.load(depName);
        }
        
        // Create module instance
        try {
            const instance = await moduleInfo.factory(dependencyInstances);
            moduleInfo.instance = instance;
            moduleInfo.loaded = true;
            
            return instance;
        } catch (error) {
            throw new Error(`Failed to create module '${name}': ${error.message}`);
        }
    }
    
    /**
     * Check if a module is loaded
     * @param {string} name - Module name
     * @returns {boolean} True if module is loaded
     */
    isLoaded(name) {
        const moduleInfo = this.modules.get(name);
        return moduleInfo && moduleInfo.loaded;
    }
    
    /**
     * Get loaded module instance
     * @param {string} name - Module name
     * @returns {*} Module instance or null if not loaded
     */
    getInstance(name) {
        const moduleInfo = this.modules.get(name);
        return moduleInfo && moduleInfo.loaded ? moduleInfo.instance : null;
    }
    
    /**
     * Initialize a module (call its init method if it exists)
     * @param {string} name - Module name
     * @param {*} config - Configuration to pass to init method
     * @returns {Promise} Promise that resolves when initialization is complete
     */
    async initialize(name, config = {}) {
        if (this.initialized.has(name)) {
            return;
        }
        
        const instance = await this.load(name);
        
        if (instance && typeof instance.init === 'function') {
            await instance.init(config);
        }
        
        this.initialized.add(name);
    }
    
    /**
     * Get dependency graph for debugging
     * @returns {Object} Dependency graph
     */
    getDependencyGraph() {
        const graph = {};
        this.dependencyGraph.forEach((deps, name) => {
            graph[name] = deps;
        });
        return graph;
    }
    
    /**
     * Detect circular dependencies
     * @returns {Array<string>} Array of circular dependency chains
     */
    detectCircularDependencies() {
        const visited = new Set();
        const recursionStack = new Set();
        const cycles = [];
        
        const dfs = (node, path = []) => {
            if (recursionStack.has(node)) {
                const cycleStart = path.indexOf(node);
                cycles.push(path.slice(cycleStart).concat(node));
                return;
            }
            
            if (visited.has(node)) {
                return;
            }
            
            visited.add(node);
            recursionStack.add(node);
            
            const dependencies = this.dependencyGraph.get(node) || [];
            for (const dep of dependencies) {
                dfs(dep, path.concat(node));
            }
            
            recursionStack.delete(node);
        };
        
        for (const node of this.dependencyGraph.keys()) {
            if (!visited.has(node)) {
                dfs(node);
            }
        }
        
        return cycles;
    }
}

// Global module registry instance
const moduleRegistry = new ModuleRegistry();

/**
 * Module loader utility functions
 */
export class ModuleLoader {
    /**
     * Define a module
     * @param {string} name - Module name
     * @param {Array<string>} dependencies - Array of dependency names
     * @param {Function} factory - Module factory function
     */
    static define(name, dependencies, factory) {
        // Handle different parameter patterns
        if (typeof dependencies === 'function') {
            factory = dependencies;
            dependencies = [];
        }
        
        moduleRegistry.register(name, factory, dependencies);
    }
    
    /**
     * Require a module (load and return instance)
     * @param {string} name - Module name
     * @returns {Promise} Promise that resolves to module instance
     */
    static async require(name) {
        return moduleRegistry.load(name);
    }
    
    /**
     * Require multiple modules
     * @param {Array<string>} names - Array of module names
     * @returns {Promise<Object>} Promise that resolves to object with module instances
     */
    static async requireMultiple(names) {
        const instances = {};
        
        await Promise.all(names.map(async (name) => {
            instances[name] = await moduleRegistry.load(name);
        }));
        
        return instances;
    }
    
    /**
     * Initialize application modules in correct order
     * @param {Array<string>} moduleNames - Array of module names to initialize
     * @param {Object} config - Configuration object
     * @returns {Promise} Promise that resolves when all modules are initialized
     */
    static async initializeApp(moduleNames, config = {}) {
        // Check for circular dependencies
        const cycles = moduleRegistry.detectCircularDependencies();
        if (cycles.length > 0) {
            console.warn('Circular dependencies detected:', cycles);
        }
        
        // Initialize modules
        for (const moduleName of moduleNames) {
            try {
                await moduleRegistry.initialize(moduleName, config[moduleName] || {});
                console.log(`Module '${moduleName}' initialized successfully`);
            } catch (error) {
                console.error(`Failed to initialize module '${moduleName}':`, error);
                throw error;
            }
        }
    }
    
    /**
     * Check if module is loaded
     * @param {string} name - Module name
     * @returns {boolean} True if loaded
     */
    static isLoaded(name) {
        return moduleRegistry.isLoaded(name);
    }
    
    /**
     * Get module instance if loaded
     * @param {string} name - Module name
     * @returns {*} Module instance or null
     */
    static getInstance(name) {
        return moduleRegistry.getInstance(name);
    }
    
    /**
     * Get dependency information for debugging
     * @returns {Object} Dependency information
     */
    static getDebugInfo() {
        return {
            dependencyGraph: moduleRegistry.getDependencyGraph(),
            circularDependencies: moduleRegistry.detectCircularDependencies(),
            loadedModules: Array.from(moduleRegistry.modules.keys()).filter(name => 
                moduleRegistry.isLoaded(name)
            ),
            initializedModules: Array.from(moduleRegistry.initialized)
        };
    }
}

/**
 * Dynamic script loader for external dependencies
 */
export class ScriptLoader {
    constructor() {
        this.loadedScripts = new Set();
        this.loadingPromises = new Map();
    }
    
    /**
     * Load external script
     * @param {string} src - Script source URL
     * @param {Object} options - Loading options
     * @returns {Promise} Promise that resolves when script is loaded
     */
    async loadScript(src, options = {}) {
        // Return if already loaded
        if (this.loadedScripts.has(src)) {
            return;
        }
        
        // Return existing promise if already loading
        if (this.loadingPromises.has(src)) {
            return this.loadingPromises.get(src);
        }
        
        const config = {
            async: true,
            defer: false,
            crossOrigin: null,
            integrity: null,
            ...options
        };
        
        const loadingPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = config.async;
            script.defer = config.defer;
            
            if (config.crossOrigin) {
                script.crossOrigin = config.crossOrigin;
            }
            
            if (config.integrity) {
                script.integrity = config.integrity;
            }
            
            script.onload = () => {
                this.loadedScripts.add(src);
                this.loadingPromises.delete(src);
                resolve();
            };
            
            script.onerror = () => {
                this.loadingPromises.delete(src);
                reject(new Error(`Failed to load script: ${src}`));
            };
            
            document.head.appendChild(script);
        });
        
        this.loadingPromises.set(src, loadingPromise);
        return loadingPromise;
    }
    
    /**
     * Load multiple scripts in parallel
     * @param {Array<string|Object>} scripts - Array of script URLs or config objects
     * @returns {Promise} Promise that resolves when all scripts are loaded
     */
    async loadScripts(scripts) {
        const loadPromises = scripts.map(script => {
            if (typeof script === 'string') {
                return this.loadScript(script);
            } else {
                return this.loadScript(script.src, script);
            }
        });
        
        return Promise.all(loadPromises);
    }
    
    /**
     * Check if script is loaded
     * @param {string} src - Script source URL
     * @returns {boolean} True if loaded
     */
    isLoaded(src) {
        return this.loadedScripts.has(src);
    }
}

// Global script loader instance
export const scriptLoader = new ScriptLoader();

/**
 * Configuration management for modules
 */
export class ConfigManager {
    constructor() {
        this.config = {};
        this.watchers = new Map();
    }
    
    /**
     * Set configuration value
     * @param {string} key - Configuration key
     * @param {*} value - Configuration value
     */
    set(key, value) {
        const oldValue = this.config[key];
        this.config[key] = value;
        
        // Notify watchers
        if (this.watchers.has(key)) {
            this.watchers.get(key).forEach(callback => {
                try {
                    callback(value, oldValue);
                } catch (error) {
                    console.error(`Error in config watcher for '${key}':`, error);
                }
            });
        }
    }
    
    /**
     * Get configuration value
     * @param {string} key - Configuration key
     * @param {*} defaultValue - Default value if key not found
     * @returns {*} Configuration value
     */
    get(key, defaultValue = undefined) {
        return this.config.hasOwnProperty(key) ? this.config[key] : defaultValue;
    }
    
    /**
     * Watch for configuration changes
     * @param {string} key - Configuration key to watch
     * @param {Function} callback - Callback function
     */
    watch(key, callback) {
        if (!this.watchers.has(key)) {
            this.watchers.set(key, []);
        }
        this.watchers.get(key).push(callback);
    }
    
    /**
     * Merge configuration object
     * @param {Object} newConfig - Configuration object to merge
     */
    merge(newConfig) {
        Object.entries(newConfig).forEach(([key, value]) => {
            this.set(key, value);
        });
    }
    
    /**
     * Get all configuration
     * @returns {Object} Complete configuration object
     */
    getAll() {
        return { ...this.config };
    }
}

// Global configuration manager
export const configManager = new ConfigManager();

/**
 * Error handling utilities for module loading
 */
export class ModuleErrorHandler {
    /**
     * Handle module loading error
     * @param {Error} error - The error that occurred
     * @param {string} moduleName - Name of the module that failed
     * @param {Object} context - Additional context information
     */
    static handleLoadError(error, moduleName, context = {}) {
        const errorInfo = {
            type: 'MODULE_LOAD_ERROR',
            module: moduleName,
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        };
        
        console.error('Module loading error:', errorInfo);
        
        // Could integrate with error reporting service here
        this.reportError(errorInfo);
    }
    
    /**
     * Handle module initialization error
     * @param {Error} error - The error that occurred
     * @param {string} moduleName - Name of the module that failed
     * @param {Object} config - Module configuration
     */
    static handleInitError(error, moduleName, config = {}) {
        const errorInfo = {
            type: 'MODULE_INIT_ERROR',
            module: moduleName,
            message: error.message,
            stack: error.stack,
            config,
            timestamp: new Date().toISOString()
        };
        
        console.error('Module initialization error:', errorInfo);
        this.reportError(errorInfo);
    }
    
    /**
     * Report error to monitoring system
     * @private
     * @param {Object} errorInfo - Error information
     */
    static reportError(errorInfo) {
        // Placeholder for error reporting integration
        // Could send to logging service, analytics, etc.
        
        // For now, just store in session storage for debugging
        try {
            const errors = JSON.parse(sessionStorage.getItem('moduleErrors') || '[]');
            errors.push(errorInfo);
            
            // Keep only last 50 errors
            if (errors.length > 50) {
                errors.splice(0, errors.length - 50);
            }
            
            sessionStorage.setItem('moduleErrors', JSON.stringify(errors));
        } catch (e) {
            // Ignore storage errors
        }
    }
    
    /**
     * Get stored error information for debugging
     * @returns {Array} Array of error information objects
     */
    static getStoredErrors() {
        try {
            return JSON.parse(sessionStorage.getItem('moduleErrors') || '[]');
        } catch (e) {
            return [];
        }
    }
    
    /**
     * Clear stored errors
     */
    static clearStoredErrors() {
        try {
            sessionStorage.removeItem('moduleErrors');
        } catch (e) {
            // Ignore storage errors
        }
    }
}

// Export the main module loader as default
export default ModuleLoader;