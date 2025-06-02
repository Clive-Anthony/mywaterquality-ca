// src/hooks/useDbOptimization.js
// Database performance optimization hook to prevent hanging and redundant calls

import { useRef, useCallback, useState } from 'react';

// Request deduplication cache
const requestCache = new Map();
const requestTimestamps = new Map();

// Configuration
const CACHE_DURATION = 30000; // 30 seconds
const DEBOUNCE_DELAY = 300; // 300ms
const MAX_CONCURRENT_REQUESTS = 3;

// Active request counter
let activeRequestCount = 0;

/**
 * Custom hook for optimized database operations
 * Provides debouncing, deduplication, and concurrency control
 */
export function useDbOptimization() {
  const debounceTimers = useRef(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Generate cache key for requests
  const getCacheKey = useCallback((operation, params) => {
    return `${operation}:${JSON.stringify(params)}`;
  }, []);

  // Check if cached result is still valid
  const getCachedResult = useCallback((cacheKey) => {
    const cached = requestCache.get(cacheKey);
    const timestamp = requestTimestamps.get(cacheKey);
    
    if (cached && timestamp && (Date.now() - timestamp < CACHE_DURATION)) {
      console.log(`🎯 Using cached result for: ${cacheKey}`);
      return cached;
    }
    
    return null;
  }, []);

  // Store result in cache
  const setCachedResult = useCallback((cacheKey, result) => {
    requestCache.set(cacheKey, result);
    requestTimestamps.set(cacheKey, Date.now());
    
    // Clean up old cache entries
    if (requestCache.size > 50) {
      const oldestKey = Array.from(requestTimestamps.entries())
        .sort((a, b) => a[1] - b[1])[0][0];
      requestCache.delete(oldestKey);
      requestTimestamps.delete(oldestKey);
    }
  }, []);

  // Debounced database operation
  const debouncedDbOperation = useCallback(async (
    operation, 
    params, 
    dbFunction, 
    options = {}
  ) => {
    const { 
      skipCache = false, 
      skipDebounce = false,
      priority = 'normal' 
    } = options;
    
    const cacheKey = getCacheKey(operation, params);
    
    // Check cache first (unless skipped)
    if (!skipCache) {
      const cached = getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check if request is already in progress
    if (requestCache.has(`${cacheKey}:loading`)) {
      console.log(`⏳ Request already in progress for: ${cacheKey}`);
      // Wait for existing request to complete
      let attempts = 0;
      while (requestCache.has(`${cacheKey}:loading`) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      // Return cached result if available
      const result = getCachedResult(cacheKey);
      if (result) return result;
    }

    return new Promise((resolve, reject) => {
      // Clear existing debounce timer
      if (debounceTimers.current.has(cacheKey)) {
        clearTimeout(debounceTimers.current.get(cacheKey));
      }

      const executeRequest = async () => {
        // Check concurrency limit
        if (activeRequestCount >= MAX_CONCURRENT_REQUESTS && priority !== 'high') {
          console.log(`🚦 Request queued due to concurrency limit: ${cacheKey}`);
          setTimeout(() => executeRequest(), 500);
          return;
        }

        activeRequestCount++;
        setIsLoading(true);
        
        // Mark as loading
        requestCache.set(`${cacheKey}:loading`, true);
        
        try {
          console.log(`🔄 Executing database operation: ${cacheKey}`);
          const startTime = Date.now();
          
          const result = await Promise.race([
            dbFunction(params),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Database operation timeout: ${cacheKey}`)), 10000)
            )
          ]);
          
          const duration = Date.now() - startTime;
          console.log(`✅ Database operation completed in ${duration}ms: ${cacheKey}`);
          
          // Cache the result
          setCachedResult(cacheKey, result);
          
          resolve(result);
        } catch (error) {
          console.error(`❌ Database operation failed: ${cacheKey}`, error);
          reject(error);
        } finally {
          activeRequestCount--;
          setIsLoading(false);
          requestCache.delete(`${cacheKey}:loading`);
        }
      };

      if (skipDebounce) {
        executeRequest();
      } else {
        // Debounce the request
        const timer = setTimeout(executeRequest, DEBOUNCE_DELAY);
        debounceTimers.current.set(cacheKey, timer);
      }
    });
  }, [getCacheKey, getCachedResult, setCachedResult]);

  // Batch multiple operations
  const batchDbOperations = useCallback(async (operations) => {
    console.log(`🔄 Executing batch of ${operations.length} database operations`);
    
    const results = await Promise.allSettled(
      operations.map(({ operation, params, dbFunction, options }) =>
        debouncedDbOperation(operation, params, dbFunction, options)
      )
    );
    
    return results.map((result, index) => ({
      operation: operations[index].operation,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }, [debouncedDbOperation]);

  // Clear cache for specific operation
  const clearCache = useCallback((operation, params) => {
    const cacheKey = getCacheKey(operation, params);
    requestCache.delete(cacheKey);
    requestTimestamps.delete(cacheKey);
    console.log(`🗑️ Cache cleared for: ${cacheKey}`);
  }, [getCacheKey]);

  // Clear all cache
  const clearAllCache = useCallback(() => {
    requestCache.clear();
    requestTimestamps.clear();
    console.log('🗑️ All cache cleared');
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return {
      cacheSize: requestCache.size,
      activeRequests: activeRequestCount,
      oldestCacheTime: Math.min(...Array.from(requestTimestamps.values())),
      newestCacheTime: Math.max(...Array.from(requestTimestamps.values()))
    };
  }, []);

  return {
    debouncedDbOperation,
    batchDbOperations,
    clearCache,
    clearAllCache,
    getCacheStats,
    isLoading
  };
}

// Utility function to create optimized database functions
export function createOptimizedDbFunction(baseFunction, operationName) {
  return async (params, options = {}) => {
    const { debouncedDbOperation } = useDbOptimization();
    return debouncedDbOperation(operationName, params, baseFunction, options);
  };
}

// Hook for monitoring database performance
export function useDbPerformanceMonitor() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    averageResponseTime: 0,
    errorRate: 0,
    cacheHitRate: 0
  });

  const updateStats = useCallback((operation, duration, success, fromCache) => {
    setStats(prev => {
      const newTotalRequests = prev.totalRequests + 1;
      const newAverageResponseTime = (prev.averageResponseTime * prev.totalRequests + duration) / newTotalRequests;
      const newErrorRate = success ? 
        (prev.errorRate * prev.totalRequests) / newTotalRequests :
        (prev.errorRate * prev.totalRequests + 1) / newTotalRequests;
      const newCacheHitRate = fromCache ?
        (prev.cacheHitRate * prev.totalRequests + 1) / newTotalRequests :
        (prev.cacheHitRate * prev.totalRequests) / newTotalRequests;

      return {
        totalRequests: newTotalRequests,
        averageResponseTime: newAverageResponseTime,
        errorRate: newErrorRate,
        cacheHitRate: newCacheHitRate
      };
    });
  }, []);

  return { stats, updateStats };
}