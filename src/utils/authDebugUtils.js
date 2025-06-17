// utils/authDebugUtils.js - Debug utilities for auth monitoring

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Token expiration check utility
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const bufferTime = 60 * 1000; // 60 second buffer
    return Date.now() >= ((payload.exp * 1000) - bufferTime);
  } catch {
    return true;
  }
};

// Debug hook to monitor auth state changes
export const useAuthDebug = (enabled = false) => {
  const { user, session, loading, initialized } = useAuth();
  const previousState = useRef({});

  useEffect(() => {
    if (!enabled) return;

    const currentState = {
      hasUser: !!user,
      hasSession: !!session,
      loading,
      initialized,
      sessionValid: session?.access_token ? !isTokenExpired(session.access_token) : false,
      userId: user?.id || null,
      userEmail: user?.email || null,
      sessionExpiry: session?.access_token ? 
        new Date(JSON.parse(atob(session.access_token.split('.')[1])).exp * 1000).toISOString() : 
        null
    };

    // Log changes
    const prev = previousState.current;
    const changes = [];

    Object.keys(currentState).forEach(key => {
      if (prev[key] !== currentState[key]) {
        changes.push(`${key}: ${prev[key]} → ${currentState[key]}`);
      }
    });

    if (changes.length > 0) {
      console.log('🔍 Auth State Change:', {
        timestamp: new Date().toISOString(),
        changes,
        currentState
      });
    }

    previousState.current = currentState;
  }, [user, session, loading, initialized, enabled]);
};

// Periodic auth state monitoring
export const useAuthMonitor = (enabled = false, intervalMs = 30000) => {
  const { user, session } = useAuth();

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const storageToken = localStorage.getItem('supabase.auth.token');
      
      console.log('🔍 Auth Monitor:', {
        timestamp: new Date().toISOString(),
        contextUser: !!user,
        contextSession: !!session,
        contextSessionValid: session?.access_token ? !isTokenExpired(session.access_token) : false,
        storageTokenPresent: !!storageToken,
        storageTokenValid: (() => {
          try {
            if (!storageToken) return false;
            const parsed = JSON.parse(storageToken);
            return parsed.access_token ? !isTokenExpired(parsed.access_token) : false;
          } catch {
            return false;
          }
        })()
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [user, session, enabled, intervalMs]);
};

// Storage corruption detector
export const useStorageMonitor = (enabled = false) => {
  useEffect(() => {
    if (!enabled) return;

    const checkStorageCorruption = () => {
      try {
        const stored = localStorage.getItem('supabase.auth.token');
        if (stored) {
          JSON.parse(stored); // Will throw if corrupted
        }
      } catch (error) {
        console.error('🚨 Storage Corruption Detected:', error);
        console.log('🔧 Clearing corrupted storage...');
        localStorage.removeItem('supabase.auth.token');
        window.location.reload();
      }
    };

    // Check on mount
    checkStorageCorruption();

    // Monitor storage changes
    const handleStorageChange = (e) => {
      if (e.key?.includes('supabase')) {
        console.log('🔍 Storage Change Detected:', e.key);
        checkStorageCorruption();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [enabled]);
};

// Auth operation tracker
let activeAuthOperations = 0;
const operationHistory = [];

export const trackAuthOperation = (operation, operationName) => {
  return async (...args) => {
    activeAuthOperations++;
    const operationId = `${operationName}-${Date.now()}`;
    
    console.log(`🔄 Auth Operation Start: ${operationName} (ID: ${operationId}, Concurrent: ${activeAuthOperations})`);
    
    const startTime = Date.now();
    operationHistory.push({
      id: operationId,
      name: operationName,
      startTime,
      status: 'started'
    });

    try {
      const result = await operation(...args);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Auth Operation Success: ${operationName} (ID: ${operationId}, Duration: ${duration}ms)`);
      
      operationHistory.find(op => op.id === operationId).status = 'success';
      operationHistory.find(op => op.id === operationId).duration = duration;
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Auth Operation Failed: ${operationName} (ID: ${operationId}, Duration: ${duration}ms, Error: ${error.message})`);
      
      operationHistory.find(op => op.id === operationId).status = 'failed';
      operationHistory.find(op => op.id === operationId).duration = duration;
      operationHistory.find(op => op.id === operationId).error = error.message;
      
      throw error;
    } finally {
      activeAuthOperations--;
      console.log(`🏁 Auth Operation End: ${operationName} (ID: ${operationId}, Remaining: ${activeAuthOperations})`);
    }
  };
};

// Get auth debug info
export const getAuthDebugInfo = () => {
  const stored = localStorage.getItem('supabase.auth.token');
  let parsedStorage = null;
  let storageValid = false;

  try {
    if (stored) {
      parsedStorage = JSON.parse(stored);
      storageValid = parsedStorage.access_token ? !isTokenExpired(parsedStorage.access_token) : false;
    }
  } catch (error) {
    console.error('Storage parsing error:', error);
  }

  return {
    timestamp: new Date().toISOString(),
    storage: {
      present: !!stored,
      valid: storageValid,
      tokenExpiry: parsedStorage?.access_token ? 
        new Date(JSON.parse(atob(parsedStorage.access_token.split('.')[1])).exp * 1000).toISOString() : 
        null
    },
    operations: {
      active: activeAuthOperations,
      history: operationHistory.slice(-10) // Last 10 operations
    }
  };
};

// Development-only debug component
export const AuthDebugPanel = ({ enabled = false }) => {
  const { user, session, loading, initialized } = useAuth();

  if (!enabled || process.env.NODE_ENV === 'production') {
    return null;
  }

  const debugInfo = getAuthDebugInfo();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '300px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 10000,
      maxHeight: '50vh',
      overflow: 'auto'
    }}>
      <h3>Auth Debug Panel</h3>
      <div>Loading: {loading ? 'Yes' : 'No'}</div>
      <div>Initialized: {initialized ? 'Yes' : 'No'}</div>
      <div>User: {user ? user.email : 'None'}</div>
      <div>Session: {session ? 'Present' : 'None'}</div>
      <div>Session Valid: {session?.access_token ? (!isTokenExpired(session.access_token) ? 'Yes' : 'No') : 'N/A'}</div>
      <div>Storage Valid: {debugInfo.storage.valid ? 'Yes' : 'No'}</div>
      <div>Active Ops: {debugInfo.operations.active}</div>
      
      <button 
        onClick={() => console.log('Auth Debug Info:', debugInfo)}
        style={{ marginTop: '10px', padding: '5px' }}
      >
        Log Full Debug Info
      </button>
    </div>
  );
};