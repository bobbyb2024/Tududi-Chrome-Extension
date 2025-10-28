import type { Settings } from '../types';

// FIX: Added type declarations for the chrome extension API to resolve TS errors.
declare namespace chrome {
  namespace storage {
    namespace local {
      function get(keys: string[]): Promise<{ [key: string]: any }>;
    }
  }
}

const noop = () => {};
// Store the original console object to restore it later
const originalConsole = { ...console };

/**
 * Overrides console methods with no-op functions if logging is disabled.
 * Restores original console methods if enabled.
 * @param enabled - Whether to enable or disable logging.
 */
export function setupLogging(enabled: boolean) {
  if (enabled) {
    Object.assign(console, originalConsole);
  } else {
    // Create a no-op version of the console by mapping original keys to a no-op function
    const disabledConsole = Object.keys(originalConsole).reduce((acc, key) => {
      acc[key] = noop;
      return acc;
    }, {} as Console);
    Object.assign(console, disabledConsole);
  }
}

/**
 * Reads settings from chrome.storage.local and sets up logging accordingly.
 * This is intended for use in the background service worker context where
 * state is not persistent.
 */
export async function setupLoggingFromStorage() {
    if (typeof chrome?.storage?.local === 'undefined') {
        // Not in an extension context, default to enabled logging.
        setupLogging(true);
        return;
    };
    try {
        const result = await chrome.storage.local.get(['settings']);
        const settings: Settings = result.settings || {};
        // Default to true if the setting is not explicitly false
        setupLogging(settings.consoleLoggingEnabled !== false);
    } catch(e) {
        // If storage fails, we can't log the error if logging might be off.
        // Use the original console to ensure this important error is seen.
        originalConsole.error('Failed to set up logging from storage:', e);
    }
}
