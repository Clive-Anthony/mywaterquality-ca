// src/hooks/useAuthToken.js - UPDATED VERSION
import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

// Token expiration check utility
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const bufferTime = 60 * 1000; // 60 second buffer
    return Date.now() >= ((payload.exp * 1000) - bufferTime);
  } catch {
    return true; // Assume expired if can't parse
  }
};

// Storage corruption detection
const detectStorageCorruption = () => {
  try {
    const stored = localStorage.getItem('supabase.auth.token');
    if (stored) {
      JSON.parse(stored); // Will throw if corrupted
      return false;
    }
  } catch (error) {
    console.error('Auth storage corrupted, clearing...', error);
    localStorage.removeItem('supabase.auth.token');
    return true;
  }
  return false;
};

export const useAuthToken = () => {
  const { session, user, loading } = useAuth();
  
  const getValidToken = useCallback(async () => {
    // Check for storage corruption first
    if (detectStorageCorruption()) {
      throw new Error('Auth storage corrupted - please refresh the page');
    }
    
    // If still loading, throw a more specific error but don't prevent other operations
    if (loading) {
      throw new Error('LOADING'); // Special error code that callers can handle
    }
    
    // Try context session first (fastest)
    if (session?.access_token && !isTokenExpired(session.access_token)) {
      return session.access_token;
    }
    
    // Fallback to fresh fetch only if context token invalid/missing
    try {
      const { data: { session: freshSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw new Error(`Auth session error: ${error.message}`);
      }
      
      if (!freshSession?.access_token) {
        throw new Error('No valid authentication session');
      }
      
      if (isTokenExpired(freshSession.access_token)) {
        throw new Error('Authentication session expired');
      }
      
      return freshSession.access_token;
    } catch (error) {
      console.error('Failed to get valid token:', error);
      throw error;
    }
  }, [session, loading]);
  
  const makeAuthenticatedRequest = useCallback(async (url, options = {}) => {
    try {
      const token = await getValidToken();
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Handle auth errors consistently
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed - please login again');
      }
      
      return response;
    } catch (error) {
      // If the error is due to loading state, provide a more helpful message
      if (error.message === 'LOADING') {
        throw new Error('Authentication in progress - please wait');
      }
      throw error;
    }
  }, [getValidToken]);
  
  const validateUserAuth = useCallback(() => {
    if (loading) {
      throw new Error('LOADING'); // Use the special error code
    }
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    return user;
  }, [user, loading]);
  
  return {
    getValidToken,
    makeAuthenticatedRequest,
    validateUserAuth,
    user,
    session,
    loading,
    isAuthenticated: !loading && !!user && !!session
  };
};