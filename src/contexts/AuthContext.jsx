// src/contexts/AuthContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import { supabase, getCurrentUser, getSession } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [authError, setAuthError] = useState(null);

  // In src/contexts/AuthContext.jsx - Replace the useEffect with this improved version:

useEffect(() => {
  let isMounted = true; // Cleanup flag
  
  const initializeAuth = async () => {
    if (!isMounted) return;
    
    setLoading(true);
    setAuthError(null);
    
    try {
      console.log('Initializing auth context...');
      
      // Only check hash if we're on callback route
      if (window.location.hash && window.location.hash.includes('access_token=') && 
          window.location.pathname !== '/auth/callback') {
        console.log('Found access token in URL hash, will be processed by AuthRedirect component');
      }
      
      const currentSession = await getSession();
      console.log('Session check result:', !!currentSession);
      
      if (!isMounted) return; // Check if component is still mounted
      
      setSession(currentSession);
      
      if (currentSession && isMounted) {
        try {
          const currentUser = await getCurrentUser();
          if (!isMounted) return;
          
          setUser(currentUser);
          
          if (currentUser) {
            const isVerified = 
              currentUser.app_metadata?.provider === 'google' || 
              currentUser.email_confirmed_at !== null;
            
            setIsEmailVerified(isVerified);
            console.log('Email verification status:', isVerified);
          }
        } catch (userError) {
          if (!isMounted) return;
          console.error('Error getting current user:', userError);
          setAuthError('Failed to retrieve user information');
        }
      } else {
        if (!isMounted) return;
        setUser(null);
        setIsEmailVerified(false);
      }
    } catch (error) {
      if (!isMounted) return;
      console.error('Auth initialization error:', error);
      setAuthError(error.message || 'Authentication initialization failed');
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };
  
  initializeAuth();
  
  // Set up auth state listener with cleanup
  const { data: authListener } = supabase.auth.onAuthStateChange(
    async (event, newSession) => {
      if (!isMounted) return;
      
      // Skip INITIAL_SESSION to reduce duplicate calls
      if (event === 'INITIAL_SESSION') return;
      
      console.log('Auth state changed:', event);
      
      try {
        setSession(newSession);
        
        if (newSession && isMounted) {
          const currentUser = await getCurrentUser();
          if (!isMounted) return;
          
          setUser(currentUser);
          
          if (currentUser) {
            setIsEmailVerified(
              currentUser.app_metadata?.provider === 'google' || 
              currentUser.email_confirmed_at !== null
            );
          }
        } else {
          if (isMounted) {
            setUser(null);
            setIsEmailVerified(false);
          }
        }
      } catch (listenerError) {
        if (!isMounted) return;
        console.error('Auth state change error:', listenerError);
        setAuthError('Error processing authentication change');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
  );
  
  // Cleanup function
  return () => {
    isMounted = false;
    if (authListener?.subscription) {
      authListener.subscription.unsubscribe();
    }
  };
}, []); // Keep empty dependency array

  // Provide auth state and error to components
  const value = {
    user,
    session,
    loading,
    isEmailVerified,
    authError,
    refreshAuth: async () => {
      // Function to manually refresh auth state
      setLoading(true);
      try {
        const currentSession = await getSession();
        setSession(currentSession);
        
        if (currentSession) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
          
          if (currentUser) {
            setIsEmailVerified(
              currentUser.app_metadata?.provider === 'google' || 
              currentUser.email_confirmed_at !== null
            );
          }
        } else {
          setUser(null);
          setIsEmailVerified(false);
        }
      } catch (error) {
        console.error('Auth refresh error:', error);
        setAuthError(error.message || 'Failed to refresh authentication');
      } finally {
        setLoading(false);
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}