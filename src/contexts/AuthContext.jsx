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

  useEffect(() => {
    // Check for active session on component mount
    const initializeAuth = async () => {
      setLoading(true);
      setAuthError(null);
      
      try {
        console.log('Initializing auth context...');
        
        // Check for URL hash with access token (for callback handling)
        if (window.location.hash && window.location.hash.includes('access_token=')) {
          console.log('Found access token in URL hash, will be processed by AuthRedirect component');
        }
        
        // Get current session
        const currentSession = await getSession();
        console.log('Session check result:', !!currentSession);
        
        setSession(currentSession);
        
        if (currentSession) {
          try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            
            // Check if email is verified (for email/password users)
            // Email confirmed status can be found in the user object
            if (currentUser) {
              // For email/password logins, check email_confirmed_at field
              // For OAuth logins (like Google), the email is always considered verified
              const isVerified = 
                currentUser.app_metadata?.provider === 'google' || 
                currentUser.email_confirmed_at !== null;
              
              setIsEmailVerified(isVerified);
              console.log('Email verification status:', isVerified);
            }
          } catch (userError) {
            console.error('Error getting current user:', userError);
            setAuthError('Failed to retrieve user information');
          }
        } else {
          // Ensure user is set to null when no session exists
          setUser(null);
          setIsEmailVerified(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthError(error.message || 'Authentication initialization failed');
      } finally {
        setLoading(false);
      }
      
      // Set up auth state listener
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          console.log('Auth state changed:', event);
          
          try {
            console.log('This is a new session');
            setSession(newSession);
            
            if (newSession) {
              console.log('Awaiting getCurrentUser');
              const currentUser = await getCurrentUser();
              setUser(currentUser);
              
              // Update email verification status
              if (currentUser) {
                setIsEmailVerified(
                  currentUser.app_metadata?.provider === 'google' || 
                  currentUser.email_confirmed_at !== null
                );
              }
            } else {
              // Explicitly set user to null on sign out
              setUser(null);
              setIsEmailVerified(false);
            }
          } catch (listenerError) {
            console.error('Auth state change error:', listenerError);
            setAuthError('Error processing authentication change');
          } finally {
            setLoading(false);
          }
        }
      );
      
      // Clean up subscription on unmount
      return () => {
        if (authListener && authListener.subscription) {
          authListener.subscription.unsubscribe();
        }
      };
    };
    
    initializeAuth();
  }, []);

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