import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Use refs to prevent race conditions
  const mountedRef = useRef(true);
  const authListenerRef = useRef(null);
  const initializingRef = useRef(false);

  const getCurrentUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
        return null;
      }
      return user;
    } catch (error) {
      console.error('Exception getting user:', error);
      return null;
    }
  };

  const getSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }
      return session;
    } catch (error) {
      console.error('Exception getting session:', error);
      return null;
    }
  };

  // Safe state updates that check if component is still mounted
  const safeSetUser = (newUser) => {
    if (mountedRef.current) {
      setUser(newUser);
    }
  };

  const safeSetSession = (newSession) => {
    if (mountedRef.current) {
      setSession(newSession);
    }
  };

  const safeSetLoading = (loadingState) => {
    if (mountedRef.current) {
      setLoading(loadingState);
    }
  };

  const safeSetInitialized = (initState) => {
    if (mountedRef.current) {
      setInitialized(initState);
    }
  };

  // Handle auth state changes with debouncing to prevent rapid updates
  const handleAuthStateChange = async (event, newSession) => {
    if (!mountedRef.current) return;
    
    console.log('Auth state change:', event, newSession ? 'session present' : 'no session');
    
    try {
      safeSetSession(newSession);
      
      if (newSession?.user) {
        safeSetUser(newSession.user);
      } else {
        // Only fetch user if we don't have session user but have a session
        if (newSession && !newSession.user) {
          const currentUser = await getCurrentUser();
          safeSetUser(currentUser);
        } else {
          safeSetUser(null);
        }
      }
    } catch (error) {
      console.error('Error handling auth state change:', error);
      safeSetUser(null);
      safeSetSession(null);
    }
  };

  // Initialize auth state once
  useEffect(() => {
    let isCancelled = false;
    
    const initializeAuth = async () => {
      // Prevent multiple initializations
      if (initializingRef.current || !mountedRef.current) {
        return;
      }
      
      initializingRef.current = true;
      
      try {
        console.log('Initializing auth...');
        
        // Get initial session and user in parallel but handle them sequentially
        const [currentSession, currentUser] = await Promise.all([
          getSession(),
          getCurrentUser()
        ]);
        
        if (isCancelled || !mountedRef.current) return;
        
        // Set session first
        safeSetSession(currentSession);
        
        // Set user - prefer session user if available
        if (currentSession?.user) {
          safeSetUser(currentSession.user);
        } else {
          safeSetUser(currentUser);
        }
        
        safeSetInitialized(true);
        
        console.log('Auth initialized:', {
          hasSession: !!currentSession,
          hasUser: !!(currentSession?.user || currentUser)
        });
        
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mountedRef.current) {
          safeSetUser(null);
          safeSetSession(null);
          safeSetInitialized(true);
        }
      } finally {
        if (mountedRef.current) {
          safeSetLoading(false);
          initializingRef.current = false;
        }
      }
    };

    initializeAuth();
    
    return () => {
      isCancelled = true;
    };
  }, []); // Only run once on mount

  // Set up auth listener after initialization
  useEffect(() => {
    if (!initialized) return;
    
    console.log('Setting up auth state listener...');
    
    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    authListenerRef.current = authListener;
    
    return () => {
      console.log('Cleaning up auth state listener...');
      if (authListenerRef.current?.subscription) {
        authListenerRef.current.subscription.unsubscribe();
      }
      authListenerRef.current = null;
    };
  }, [initialized]); // Re-run if initialization state changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('AuthProvider unmounting...');
      mountedRef.current = false;
      
      // Clean up any existing listener
      if (authListenerRef.current?.subscription) {
        authListenerRef.current.subscription.unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      
      // Clear state immediately
      safeSetUser(null);
      safeSetSession(null);
      
    } catch (error) {
      console.error('Exception during sign out:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    initialized,
    signOut,
    // Helper methods
    isAuthenticated: !loading && !!user && !!session,
    isReady: initialized && !loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};