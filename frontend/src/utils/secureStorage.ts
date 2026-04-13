export class SecureStorage {
  private isProduction: boolean;

  constructor(isProduction: boolean) {
    this.isProduction = isProduction;
  }

  setItem(key: string, value: string): void {
    if (this.isProduction) {
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      document.cookie = `${key}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
    } else {
      console.warn('⚠️ [SecureStorage] Using localStorage fallback in development');
      const encoded = btoa(unescape(encodeURIComponent(value)));
      localStorage.setItem(key, encoded);
    }
  }

  getItem(key: string): string | null {
    if (this.isProduction) {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [cookieKey, cookieValue] = cookie.trim().split('=');
        if (cookieKey === key) {
          return decodeURIComponent(cookieValue);
        }
      }
      return null;
    } else {
      const encoded = localStorage.getItem(key);
      if (!encoded) {
        return null;
      }
      try {
        return decodeURIComponent(escape(atob(encoded)));
      } catch {
        // If it's not base64 encoded (e.g. from our manual inject), return raw
        return encoded;
      }
    }
  }

  removeItem(key: string): void {
    if (this.isProduction) {
      document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;secure;samesite=strict`;
    } else {
      localStorage.removeItem(key);
    }
  }

  clear(): void {
    if (this.isProduction) {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [key] = cookie.trim().split('=');
        if (key) {
          document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;secure;samesite=strict`;
        }
      }
    } else {
      localStorage.clear();
    }
  }
}

export function createSecureStorage(): SecureStorage {
  const isProduction = import.meta.env.PROD;
  return new SecureStorage(isProduction);
}

export const secureStorage = createSecureStorage();
