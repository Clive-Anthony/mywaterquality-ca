// src/contexts/AuthContext.jsx - FIXED VERSION to reset mounted ref on remount
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
  
  // Use refs to prevent race conditions and multiple setups
  const mountedRef = useRef(true);
  const authListenerRef = useRef(null);
  const setupCompleteRef = useRef(false);

  // CRITICAL FIX: Reset mounted ref on every render
  useEffect(() => {
    mountedRef.current = true;
    // console.log('🔄 Component mounted/remounted - mountedRef set to true');
  });

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
      // console.log('🔄 Setting user state:', newUser?.email || 'null');
      setUser(newUser);
    } else {
      console.log('⚠️ Attempted to set user state but component unmounted');
    }
  };

  const safeSetSession = (newSession) => {
    if (mountedRef.current) {
      // console.log('🔄 Setting session state:', !!newSession);
      setSession(newSession);
    } else {
      console.log('⚠️ Attempted to set session state but component unmounted');
    }
  };

  const safeSetLoading = (loadingState) => {
    if (mountedRef.current) {
      // console.log('🔄 Setting loading state:', loadingState);
      setLoading(loadingState);
    } else {
      console.log('⚠️ Attempted to set loading state but component unmounted');
    }
  };

  const safeSetInitialized = (initState) => {
    if (mountedRef.current) {
      // console.log('🔄 Setting initialized state:', initState);
      setInitialized(initState);
    } else {
      console.log('⚠️ Attempted to set initialized state but component unmounted');
    }
  };

  // Handle auth state changes
  const handleAuthStateChange = async (event, newSession) => {
    // console.log('🔥 AUTH STATE CHANGE RECEIVED:', event, {
    //   hasSession: !!newSession,
    //   hasUser: !!newSession?.user,
    //   userEmail: newSession?.user?.email,
    //   timestamp: new Date().toISOString(),
    //   mountedRefValue: mountedRef.current
    // });
    
    if (!mountedRef.current) {
      console.log('⚠️ Auth state change ignored - component unmounted (mountedRef.current =', mountedRef.current, ')');
      return;
    }
    
    try {
      // Always set the session first
      safeSetSession(newSession);
      
      if (newSession?.user) {
        // console.log('✅ Setting user from session:', newSession.user.email);
        safeSetUser(newSession.user);
        // Clear loading state immediately when we have a user
        safeSetLoading(false);
      } else if (newSession && !newSession.user) {
        // Edge case: session without user, fetch user
        // console.log('⚠️ Session without user, fetching user...');
        const currentUser = await getCurrentUser();
        safeSetUser(currentUser);
        if (currentUser) {
          safeSetLoading(false);
        }
      } else {
        // console.log('❌ No session, clearing user');
        safeSetUser(null);
        // Don't set loading to false here if we're just starting up
        if (initialized) {
          safeSetLoading(false);
        }
      }
      
    } catch (error) {
      console.error('❌ Error handling auth state change:', error);
      safeSetUser(null);
      safeSetSession(null);
    }
  };

  // Set up auth listener and initialize - prevent multiple setups
  useEffect(() => {
    // Reset setup flag on mount (in case of remount)
    if (setupCompleteRef.current) {
      console.log('⚠️ Resetting setup flag due to remount');
      setupCompleteRef.current = false;
    }

    let isCancelled = false;
    
    const setupAuthAndListener = async () => {
      try {
        // console.log('🚀 Setting up auth listener and initializing...');
        
        // Set up the auth listener if not already set up
        if (!authListenerRef.current || !setupCompleteRef.current) {
          // Clean up any existing listener first
          if (authListenerRef.current?.subscription) {
            authListenerRef.current.subscription.unsubscribe();
          }
          
          const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);
          authListenerRef.current = authListener;
          // console.log('✅ Auth listener set up successfully');
        }
        
        // Now get initial state
        const [currentSession, currentUser] = await Promise.all([
          getSession(),
          getCurrentUser()
        ]);
        
        if (isCancelled || !mountedRef.current) return;
        
        // console.log('📊 Initial auth state:', {
        //   hasSession: !!currentSession,
        //   hasUser: !!currentUser,
        //   sessionUser: currentSession?.user?.email,
        //   directUser: currentUser?.email
        // });
        
        // Set initial state
        safeSetSession(currentSession);
        
        if (currentSession?.user) {
          safeSetUser(currentSession.user);
        } else if (currentUser) {
          safeSetUser(currentUser);
        } else {
          safeSetUser(null);
        }
        
        safeSetInitialized(true);
        safeSetLoading(false);
        setupCompleteRef.current = true;
        
        // console.log('✅ Auth initialization complete');
        
      } catch (error) {
        console.error('❌ Auth setup error:', error);
        if (mountedRef.current) {
          safeSetUser(null);
          safeSetSession(null);
          safeSetInitialized(true);
          safeSetLoading(false);
        }
      }
    };

    setupAuthAndListener();
    
    return () => {
      isCancelled = true;
      // console.log('🧹 Auth setup effect cleanup (but keeping listener active)');
      // DON'T clean up the listener here unless component is actually unmounting
    };
  }, []); // Empty dependency array - only run once on mount

  // Cleanup on actual unmount only
  useEffect(() => {
    return () => {
      // console.log('🗑️ AuthProvider unmounting - cleaning up listener');
      mountedRef.current = false;
      setupCompleteRef.current = false;
      
      if (authListenerRef.current?.subscription) {
        authListenerRef.current.subscription.unsubscribe();
        authListenerRef.current = null;
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