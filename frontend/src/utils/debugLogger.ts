/**
 * Debug logger gated by environment variable
 * Only logs when DEBUG_QUIZ_GENERATOR=true or in development mode
 * 
 * Usage:
 *   import { debugLog } from '../../utils/debugLogger';
 *   debugLog('Category', 'Message', optionalData);
 */

const isDebugMode = (): boolean => {
  // Check if we're in development mode
  if (import.meta.env.DEV === true) {
    return true;
  }
  
  // Check for explicit debug flag
  return import.meta.env.VITE_DEBUG_QUIZ_GENERATOR === 'true';
};

/**
 * Log debug message (gated by environment)
 * @param category - Debug category (e.g., 'Sanitize', 'AI Output', 'Tag Injection')
 * @param message - Debug message
 * @param data - Optional data to log
 */
export const debugLog = (category: string, message: string, data?: any): void => {
  if (!isDebugMode()) return;
  
  const prefix = `[${category} DEBUG]`;
  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
};

/**
 * Log debug warning (gated by environment)
 * @param category - Debug category
 * @param message - Debug message
 * @param data - Optional data to log
 */
export const debugWarn = (category: string, message: string, data?: any): void => {
  if (!isDebugMode()) return;
  
  const prefix = `[${category} DEBUG]`;
  if (data !== undefined) {
    console.warn(prefix, message, data);
  } else {
    console.warn(prefix, message);
  }
};

/**
 * Log debug error (gated by environment)
 * @param category - Debug category
 * @param message - Debug message
 * @param data - Optional data to log
 */
export const debugError = (category: string, message: string, data?: any): void => {
  if (!isDebugMode()) return;
  
  const prefix = `[${category} DEBUG]`;
  if (data !== undefined) {
    console.error(prefix, message, data);
  } else {
    console.error(prefix, message);
  }
};
