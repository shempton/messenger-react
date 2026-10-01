import { useRef, useCallback } from 'react';

/**
 * Возвращает функцию, которая вызывает callback не чаще, чем раз в `delay` мс.
 */
export const useThrottle = (callback, delay = 1500) => {
  const lastCallRef = useRef(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callbackRef.current(...args);
    }
  }, [delay]);
};