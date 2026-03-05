'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RobustWebSocketClient } from '@/lib/websocket-client-robust';

export interface ErrorHandlingOptions {
  /** Enable automatic error recovery */
  autoRecovery?: boolean;
  /** Max retry attempts for failed operations */
  maxRetries?: number;
  /** Delay between retries (ms) */
  retryDelay?: number;
  /** Enable error logging */
  enableLogging?: boolean;
  /** Custom error handler */
  onError?: (error: Error, context: string) => void;
}

export interface OperationResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  retry: () => void;
  reset: () => void;
}

/**
 * Error Handling Hook with Retry and Recovery
 *
 * Provides comprehensive error handling for:
 * - Async operations with automatic retry
 * - WebSocket errors
 * - API request failures
 * - Timeout handling
 */
export function useErrorHandling(options: ErrorHandlingOptions = {}) {
  const {
    autoRecovery = true,
    maxRetries = 3,
    retryDelay = 1000,
    enableLogging = process.env.NODE_ENV === 'development',
    onError,
  } = options;

  // State
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());
  const [retryCount, setRetryCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  // Refs
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const operationsRef = useRef<Map<string, () => void>>(new Map());

  /**
   * Log error
   */
  const logError = useCallback((error: Error, context: string) => {
    if (enableLogging) {
      console.error(`[ErrorHandling] ${context}:`, error);
    }

    // Call custom error handler
    if (onError) {
      onError(error, context);
    }
  }, [enableLogging, onError]);

  /**
   * Add error to state
   */
  const addError = useCallback((key: string, error: Error) => {
    setErrors((prev) => new Map(prev).set(key, error));
  }, []);

  /**
   * Remove error from state
   */
  const removeError = useCallback((key: string) => {
    setErrors((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors(new Map());
    setRetryCount(0);

    // Clear all pending retries
    for (const timeout of retryTimeoutsRef.current.values()) {
      clearTimeout(timeout);
    }
    retryTimeoutsRef.current.clear();
  }, []);

  /**
   * Execute async operation with retry
   */
  const executeWithRetry = useCallback(
    async <T,>(
      key: string,
      operation: () => Promise<T>,
      options?: {
        timeout?: number;
        retries?: number;
        onAttempt?: (attempt: number) => void;
      }
    ): Promise<T> => {
      const { timeout = 10000, retries = maxRetries, onAttempt } = options || {};
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          if (onAttempt) {
            onAttempt(attempt);
          }

          // Execute operation with timeout
          const result = await Promise.race([
            operation(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Operation timeout')), timeout)
            ),
          ]);

          // Success - remove error if exists
          removeError(key);
          return result;
        } catch (error) {
          lastError = error as Error;

          if (attempt < retries) {
            const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      addError(key, lastError!);
      logError(lastError!, `Operation "${key}" failed after ${retries} retries`);
      throw lastError!;
    },
    [maxRetries, retryDelay, addError, removeError, logError]
  );

  /**
   * Execute operation with result tracking
   */
  const executeOperation = useCallback(
    async <T,>(
      key: string,
      operation: () => Promise<T>,
      options?: {
        timeout?: number;
        retries?: number;
      }
    ): Promise<OperationResult<T>> => {
      let result: OperationResult<T> = {
        data: null,
        error: null,
        loading: true,
        retry: () => { },
        reset: () => { },
      };

      // Store retry function
      const retry = () => {
        executeOperation(key, operation, options);
      };

      const reset = () => {
        removeError(key);
      };

      result.retry = retry;
      result.reset = reset;

      try {
        const data = await executeWithRetry(key, operation, options);
        result = { ...result, data, loading: false };
      } catch (error) {
        result = { ...result, error: error as Error, loading: false };
      }

      return result;
    },
    [executeWithRetry, addError, removeError]
  );

  /**
   * Schedule automatic retry
   */
  const scheduleRetry = useCallback((key: string, operation: () => void, delay?: number) => {
    // Clear existing timeout if any
    const existingTimeout = retryTimeoutsRef.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(() => {
      operation();
      retryTimeoutsRef.current.delete(key);
    }, delay || retryDelay);

    retryTimeoutsRef.current.set(key, timeoutId);
  }, [retryDelay]);

  /**
   * Retry specific operation
   */
  const retry = useCallback((key: string) => {
    const operation = operationsRef.current.get(key);
    if (operation) {
      setRetryCount((prev) => prev + 1);
      operation();
    }
  }, []);

  /**
   * Register operation for retry
   */
  const registerOperation = useCallback((key: string, operation: () => void) => {
    operationsRef.current.set(key, operation);
  }, []);

  /**
   * Unregister operation
   */
  const unregisterOperation = useCallback((key: string) => {
    operationsRef.current.delete(key);
    const timeout = retryTimeoutsRef.current.get(key);
    if (timeout) {
      clearTimeout(timeout);
      retryTimeoutsRef.current.delete(key);
    }
  }, []);

  /**
   * Get error by key
   */
  const getError = useCallback((key: string): Error | undefined => {
    return errors.get(key);
  }, [errors]);

  /**
   * Check if has error
   */
  const hasError = useCallback((key?: string): boolean => {
    if (key) {
      return errors.has(key);
    }
    return errors.size > 0;
  }, [errors]);

  /**
   * Handle WebSocket error with recovery
   */
  const handleWebSocketError = useCallback(
    (client: RobustWebSocketClient, error: Error) => {
      const key = 'websocket';

      logError(error, 'WebSocket error');
      addError(key, error);

      if (autoRecovery && client.state !== 'connected') {
        setIsRecovering(true);

        // Attempt reconnection with exponential backoff
        const delay = Math.min(retryDelay * Math.pow(2, retryCount), 30000);

        scheduleRetry(key, () => {
          client.reconnect();
          setIsRecovering(false);
          removeError(key);
        }, delay);

        setRetryCount((prev) => prev + 1);
      }
    },
    [autoRecovery, retryDelay, retryCount, addError, removeError, logError, scheduleRetry]
  );

  /**
   * Handle API error with retry
   */
  const handleAPIError = useCallback(
    async <T,>(
      key: string,
      apiCall: () => Promise<T>,
      options?: {
        timeout?: number;
        retries?: number;
      }
    ): Promise<T> => {
      return executeWithRetry(key, apiCall, options);
    },
    [executeWithRetry]
  );

  /**
   * Create timeout promise
   */
  const createTimeout = useCallback((ms: number, message = 'Operation timeout'): Promise<never> => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }, []);

  /**
   * Execute with timeout
   */
  const executeWithTimeout = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      timeoutMs: number,
      timeoutMessage?: string
    ): Promise<T> => {
      return Promise.race([
        operation(),
        createTimeout(timeoutMs, timeoutMessage),
      ]);
    },
    [createTimeout]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clear all timeouts
      for (const timeout of retryTimeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      retryTimeoutsRef.current.clear();
      operationsRef.current.clear();
    };
  }, []);

  return {
    // State
    errors,
    errorCount: errors.size,
    hasError,
    retryCount,
    isRecovering,

    // Actions
    addError,
    removeError,
    clearErrors,
    getError,
    retry,

    // Operations
    executeWithRetry,
    executeOperation,
    handleWebSocketError,
    handleAPIError,
    executeWithTimeout,

    // Registration
    registerOperation,
    unregisterOperation,
    scheduleRetry,
  };
}

/**
 * Hook for managing async operation state with error handling
 */
export function useAsyncOperation<T = any>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (operation: () => Promise<T>, options?: { timeout?: number }) => {
      setLoading(true);
      setError(null);

      try {
        const timeout = options?.timeout || 30000;
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), timeout)
          ),
        ]);

        setData(result);
        setLoading(false);
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        setLoading(false);
        throw error;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    error,
    loading,
    execute,
    reset,
  };
}

/**
 * Hook for managing multiple operations with error tracking
 */
export function useOperationTracker() {
  const [operations, setOperations] = useState<Map<string, { loading: boolean; error: string | null }>>(new Map());

  const start = useCallback((key: string) => {
    setOperations((prev) => new Map(prev).set(key, { loading: true, error: null }));
  }, []);

  const complete = useCallback((key: string) => {
    setOperations((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const fail = useCallback((key: string, error: string) => {
    setOperations((prev) => new Map(prev).set(key, { loading: false, error }));
  }, []);

  const isLoading = useCallback((key?: string) => {
    if (key) {
      return operations.get(key)?.loading || false;
    }
    return Array.from(operations.values()).some((op) => op.loading);
  }, [operations]);

  const hasError = useCallback((key?: string) => {
    if (key) {
      return operations.get(key)?.error !== null;
    }
    return Array.from(operations.values()).some((op) => op.error !== null);
  }, [operations]);

  const getError = useCallback((key: string) => {
    return operations.get(key)?.error || null;
  }, [operations]);

  const clear = useCallback((key: string) => {
    setOperations((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  return {
    operations,
    start,
    complete,
    fail,
    isLoading,
    hasError,
    getError,
    clear,
  };
}

export default useErrorHandling;
