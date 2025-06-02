// src/contexts/AuthContext.jsx - FIXED VERSION
// Removed database optimization from critical auth operations

import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { supabase, getCurrentUser, getSession } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  // Refs to prevent unnecessary re-renders and track initialization
  const userRef = useRef(null);
  const sessionRef = useRef(null);
  const initializationRef = useRef(false);
  const authListenerRef = useRef(null);

  // FIXED: Direct session fetch without optimization (critical for auth flow)
  const fetchSession = useCallback(async () => {
    console.log('🔄 AuthContext: Fetching session directly...');
    try {
      const session = await getSession();
      console.log('✅ AuthContext: Session fetched successfully', { hasSession: !!session });
      return session;
    } catch (error) {
      console.error('❌ AuthContext: Session fetch error:', error);
      throw error;
    }
  }, []);

  // FIXED: Direct user fetch without optimization (critical for auth flow)
  const fetchUser = useCallback(async () => {
    console.log('🔄 AuthContext: Fetching user directly...');
    try {
      const user = await getCurrentUser();
      console.log('✅ AuthContext: User fetched successfully', { hasUser: !!user, email: user?.email });
      return user;
    } catch (error) {
      console.error('❌ AuthContext: User fetch error:', error);
      throw error;
    }
  }, []);

  // Debounced state updates to prevent rapid re-renders
  const updateAuthState = useCallback(async (newSession, newUser = null) => {
    // Only update if values actually changed
    if (newSession !== sessionRef.current) {
      console.log('📝 AuthContext: Session updated');
      sessionRef.current = newSession;
      setSession(newSession);
    }

    if (newUser !== userRef.current) {
      console.log('📝 AuthContext: User updated');
      userRef.current = newUser;
      setUser(newUser);
      
      // Update email verification status
      if (newUser) {
        const isVerified = 
          newUser.app_metadata?.provider === 'google' || 
          newUser.email_confirmed_at !== null;
        setIsEmailVerified(isVerified);
      } else {
        setIsEmailVerified(false);
      }
    }
  }, []);

  // Initial auth setup - runs only once
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initializeAuth = async () => {
      console.log('🚀 AuthContext: Initializing auth...');
      setLoading(true);
      setAuthError(null);
      
      try {
        // Check for access token in URL hash first
        if (window.location.hash && window.location.hash.includes('access_token=')) {
          console.log('🔍 AuthContext: Found access token in URL hash, will be processed by AuthRedirect');
        }
        
        // FIXED: Fetch session and user directly without timeout or optimization
        console.log('🔄 AuthContext: Fetching initial auth data...');
        const [currentSession, currentUser] = await Promise.all([
          fetchSession(),
          fetchUser()
        ]);
        
        console.log('✅ AuthContext: Initial auth data loaded', {
          hasSession: !!currentSession,
          hasUser: !!currentUser,
          userEmail: currentUser?.email
        });
        
        await updateAuthState(currentSession, currentUser);
        
      } catch (error) {
        console.error('❌ AuthContext: Auth initialization error:', error);
        setAuthError(error.message || 'Authentication initialization failed');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [fetchSession, fetchUser, updateAuthState]);

  // Set up auth state listener - runs only once
  useEffect(() => {
    if (authListenerRef.current) return;

    console.log('📡 AuthContext: Setting up auth state listener...');
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`📡 AuthContext: Auth state changed - ${event}`);
        
        // Ignore initial session to prevent duplicate initialization
        if (event === 'INITIAL_SESSION' && initializationRef.current) {
          console.log('⏭️ AuthContext: Skipping INITIAL_SESSION (already initialized)');
          return;
        }
        
        try {
          let newUser = null;
          
          if (newSession) {
            // Only fetch user if session is new or changed
            if (newSession !== sessionRef.current) {
              console.log('🔄 AuthContext: Session changed, fetching user...');
              newUser = await fetchUser();
            } else {
              newUser = userRef.current; // Use existing user
            }
          }
          
          await updateAuthState(newSession, newUser);
          
          // Only set loading to false if we're currently loading
          if (loading) {
            setLoading(false);
          }
          
        } catch (listenerError) {
          console.error('❌ AuthContext: Auth state change error:', listenerError);
          setAuthError('Error processing authentication change');
          setLoading(false);
        }
      }
    );
    
    authListenerRef.current = authListener;
    
    // Cleanup function
    return () => {
      console.log('🧹 AuthContext: Cleaning up auth listener...');
      if (authListenerRef.current?.subscription) {
        authListenerRef.current.subscription.unsubscribe();
      }
    };
  }, [fetchUser, updateAuthState, loading]);

  // FIXED: Simplified refresh function without optimization
  const refreshAuth = useCallback(async () => {
    console.log('🔄 AuthContext: Manual auth refresh requested...');
    
    setLoading(true);
    setAuthError(null);
    
    try {
      const [currentSession, currentUser] = await Promise.all([
        fetchSession(),
        fetchUser()
      ]);
      
      await updateAuthState(currentSession, currentUser);
      
      console.log('✅ AuthContext: Auth refreshed successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ AuthContext: Auth refresh error:', error);
      setAuthError(error.message || 'Failed to refresh authentication');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [fetchSession, fetchUser, updateAuthState]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = {
    user,
    session,
    loading,
    isEmailVerified,
    authError,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}