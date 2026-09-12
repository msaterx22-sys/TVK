import { useEffect, useState, useCallback } from 'react';

const META_SUFFIX = '__savedAt';

const safelyParseJSON = <T>(value: string): T | string => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
};

export const useLocalStorageState = <T,>(key: string, initialValue: T) => {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        return safelyParseJSON<T>(raw) as T;
      }
    } catch (err) {
      console.warn(`Error reading ${key} from localStorage:`, err);
    }

    return initialValue;
  });

  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return window.localStorage.getItem(`${key}${META_SUFFIX}`);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (state === null || state === undefined) {
        window.localStorage.removeItem(key);
        window.localStorage.removeItem(`${key}${META_SUFFIX}`);
        setLastSavedAt(null);
      } else {
        if (typeof state === 'string') {
          window.localStorage.setItem(key, state);
        } else {
          window.localStorage.setItem(key, JSON.stringify(state));
        }
        const timestamp = new Date().toISOString();
        window.localStorage.setItem(`${key}${META_SUFFIX}`, timestamp);
        setLastSavedAt(timestamp);
      }
    } catch (err) {
      console.warn(`Error writing ${key} to localStorage:`, err);
    }
  }, [key, state]);

  const clear = useCallback(() => {
    setState(initialValue);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        window.localStorage.removeItem(`${key}${META_SUFFIX}`);
      }
    } catch (err) {
      console.warn(`Error clearing ${key} from localStorage:`, err);
    }
    setLastSavedAt(null);
  }, [initialValue, key]);

  return [state, setState, clear, lastSavedAt] as const;
};
