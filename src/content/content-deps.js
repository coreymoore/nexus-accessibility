/**
 * Content Script Dependency Management System
 *
 * This module provides robust dependency injection and management for IIFE modules.
 * It ensures proper loading order, handles missing dependencies, and provides
 * graceful error recovery.
 *
 * Dependencies: None (this must load first)
 */

(function () {
  "use strict";

  // Ensure our namespace exists
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  // Dependency management state
  const registeredModules = new Map();
  const dependencyGraph = new Map();
  const initializationQueue = [];
  const maxRetries = 10;
  const retryDelay = 50;

  /**
   * Module registry for dependency tracking
   */
  class ModuleRegistry {
    constructor() {
      this.modules = new Map();
      this.initQueue = [];
      this.initialized = new Set();
    }

    /**
     * Register a module with its dependencies
     * @param {string} name - Module name
     * @param {string[]} dependencies - Array of dependency names
     * @param {Function} initFunction - Module initialization function
     * @param {Object} moduleExports - Module's exported API
     */
    register(
      name,
      dependencies = [],
      initFunction = null,
      moduleExports = null
    ) {
      console.log(`[ContentExtension.deps] Registering module: ${name}`);

      this.modules.set(name, {
        name,
        dependencies,
        initFunction,
        exports: moduleExports,
        loaded: !!moduleExports,
        initialized: false,
        retryCount: 0,
      });

      dependencyGraph.set(name, dependencies);
      registeredModules.set(name, moduleExports);

      // Try to initialize modules that might now have their dependencies met
      this.processInitializationQueue();
    }

    /**
     * Check if all dependencies for a module are available
     * @param {string} moduleName - Name of the module to check
     * @returns {boolean} Whether all dependencies are available
     */
    areDependenciesReady(moduleName) {
      const module = this.modules.get(moduleName);
      if (!module) return false;

      return module.dependencies.every((depName) => {
        const dep = this.modules.get(depName);
        return dep && dep.loaded;
      });
    }

    /**
     * Get missing dependencies for a module
     * @param {string} moduleName - Name of the module to check
     * @returns {string[]} Array of missing dependency names
     */
    getMissingDependencies(moduleName) {
      const module = this.modules.get(moduleName);
      if (!module) return [];

      return module.dependencies.filter((depName) => {
        const dep = this.modules.get(depName);
        return !dep || !dep.loaded;
      });
    }

    /**
     * Initialize a module if its dependencies are ready
     * @param {string} moduleName - Name of the module to initialize
     * @returns {boolean} Whether initialization was attempted
     */
    initializeModule(moduleName) {
      const module = this.modules.get(moduleName);
      if (!module || module.initialized) return false;

      if (!this.areDependenciesReady(moduleName)) {
        const missing = this.getMissingDependencies(moduleName);
        console.warn(
          `[ContentExtension.deps] Cannot initialize ${moduleName}, missing: ${missing.join(
            ", "
          )}`
        );
        return false;
      }

      try {
        console.log(
          `[ContentExtension.deps] Initializing module: ${moduleName}`
        );

        if (module.initFunction) {
          module.initFunction();
        }

        module.initialized = true;
        this.initialized.add(moduleName);

        console.log(
          `[ContentExtension.deps] Successfully initialized: ${moduleName}`
        );
        return true;
      } catch (error) {
        console.error(
          `[ContentExtension.deps] Failed to initialize ${moduleName}:`,
          error
        );
        module.retryCount++;

        if (module.retryCount < maxRetries) {
          setTimeout(() => {
            this.initializeModule(moduleName);
          }, retryDelay * module.retryCount);
        } else {
          console.error(
            `[ContentExtension.deps] Max retries exceeded for ${moduleName}`
          );
        }
        return false;
      }
    }

    /**
     * Process the initialization queue, attempting to initialize ready modules
     */
    processInitializationQueue() {
      const readyModules = [];

      for (const [name, module] of this.modules) {
        if (
          !module.initialized &&
          module.loaded &&
          this.areDependenciesReady(name)
        ) {
          readyModules.push(name);
        }
      }

      // Sort by dependency order (modules with fewer dependencies first)
      readyModules.sort((a, b) => {
        const aDeps = this.modules.get(a).dependencies.length;
        const bDeps = this.modules.get(b).dependencies.length;
        return aDeps - bDeps;
      });

      readyModules.forEach((moduleName) => {
        this.initializeModule(moduleName);
      });
    }

    /**
     * Get the current state of all modules
     * @returns {Object} Module state information
     */
    getModuleState() {
      const state = {};
      for (const [name, module] of this.modules) {
        state[name] = {
          loaded: module.loaded,
          initialized: module.initialized,
          dependencies: module.dependencies,
          missingDependencies: this.getMissingDependencies(name),
          retryCount: module.retryCount,
        };
      }
      return state;
    }

    /**
     * Wait for specific modules to be ready
     * @param {string[]} moduleNames - Array of module names to wait for
     * @param {number} timeout - Maximum time to wait in milliseconds
     * @returns {Promise<boolean>} Whether all modules became ready
     */
    async waitForModules(moduleNames, timeout = 5000) {
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const allReady = moduleNames.every((name) => {
          const module = this.modules.get(name);
          return module && module.loaded && module.initialized;
        });

        if (allReady) {
          return true;
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const notReady = moduleNames.filter((name) => {
        const module = this.modules.get(name);
        return !module || !module.loaded || !module.initialized;
      });

      console.warn(
        `[ContentExtension.deps] Timeout waiting for modules: ${notReady.join(
          ", "
        )}`
      );
      return false;
    }
  }

  // Create global registry instance
  const registry = new ModuleRegistry();

  /**
   * Safe module accessor with dependency validation
   * @param {string} moduleName - Name of the module to access
   * @returns {Object|null} Module exports or null if not available
   */
  function getModule(moduleName) {
    const module = registry.modules.get(moduleName);
    if (!module || !module.loaded || !module.initialized) {
      console.warn(
        `[ContentExtension.deps] Module ${moduleName} not available (loaded: ${module?.loaded}, initialized: ${module?.initialized})`
      );
      return null;
    }
    return module.exports;
  }

  /**
   * Safe method call with dependency validation
   * @param {string} moduleName - Name of the module
   * @param {string} methodName - Name of the method to call
   * @param {...any} args - Arguments to pass to the method
   * @returns {any} Method return value or null if unavailable
   */
  function callModuleMethod(moduleName, methodName, ...args) {
    const module = getModule(moduleName);
    if (!module || typeof module[methodName] !== "function") {
      console.warn(
        `[ContentExtension.deps] Method ${moduleName}.${methodName} not available`
      );
      return null;
    }

    try {
      return module[methodName](...args);
    } catch (error) {
      console.error(
        `[ContentExtension.deps] Error calling ${moduleName}.${methodName}:`,
        error
      );
      return null;
    }
  }

  /**
   * Enhanced IIFE wrapper for robust module creation
   * @param {string} name - Module name
   * @param {string[]} dependencies - Array of dependency names
   * @param {Function} moduleFactory - Function that creates the module
   */
  function defineModule(name, dependencies, moduleFactory) {
    try {
      // Create dependency injection object
      const deps = {};
      let allDepsAvailable = true;

      dependencies.forEach((depName) => {
        const dep = getModule(depName);
        if (dep) {
          deps[depName] = dep;
        } else {
          allDepsAvailable = false;
        }
      });

      // Create module with dependency injection
      const moduleExports = moduleFactory(deps, {
        getModule,
        callModuleMethod,
        registry: registry,
      });

      // Register the module
      registry.register(name, dependencies, null, moduleExports);

      // For modules with no dependencies, mark them as initialized immediately
      if (dependencies.length === 0) {
        const module = registry.modules.get(name);
        if (module) {
          module.initialized = true;
          registry.initialized.add(name);
          console.log(
            `[ContentExtension.deps] Auto-initialized no-dependency module: ${name}`
          );
        }
      }

      // Make available in global namespace for backward compatibility
      CE[name] = moduleExports;

      return moduleExports;
    } catch (error) {
      console.error(
        `[ContentExtension.deps] Error defining module ${name}:`,
        error
      );
      return null;
    }
  }

  // Export dependency management API
  CE.deps = {
    registry,
    getModule,
    callModuleMethod,
    defineModule,

    // Convenience methods
    waitForModules: (moduleNames, timeout) =>
      registry.waitForModules(moduleNames, timeout),
    getModuleState: () => registry.getModuleState(),
    isModuleReady: (name) => {
      const module = registry.modules.get(name);
      return module && module.loaded && module.initialized;
    },
  };

  console.log("[ContentExtension.deps] Dependency management system loaded");
})();
