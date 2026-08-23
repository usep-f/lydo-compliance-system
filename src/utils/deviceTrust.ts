const TOKEN_KEY = 'lydo_device_trust_token';

/**
 * Saves the device trust token to localStorage.
 */
export function saveDeviceToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save device token:', error);
  }
}

/**
 * Retrieves the device trust token from localStorage.
 */
export function getDeviceToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get device token:', error);
    return null;
  }
}

/**
 * Removes the device trust token from localStorage.
 */
export function clearDeviceToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear device token:', error);
  }
}
