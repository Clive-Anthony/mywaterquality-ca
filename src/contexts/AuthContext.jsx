// src/contexts/AuthContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import { supabase, getCurrentUser, getSession } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    // Check for active session on component mount
    const initializeAuth = async () => {
      setLoading(true);
      
      // Get current session
      const currentSession = await getSession();
      setSession(currentSession);
      
      if (currentSession) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        // Check if email is verified (for email/password users)
        // Email confirmed status can be found in the user object
        if (currentUser) {
          // For email/password logins, check email_confirmed_at field
          // For OAuth logins (like Google), the email is always considered verified
          setIsEmailVerified(
            currentUser.app_metadata?.provider === 'google' || 
            currentUser.email_confirmed_at !== null
          );
        }
      } else {
        // Ensure user is set to null when no session exists
        setUser(null);
        setIsEmailVerified(false);
      }
      
      setLoading(false);
      
      // Set up auth state listener
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          console.log('Auth state changed:', event);
          setSession(currentSession);
          
          if (currentSession) {
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
          
          setLoading(false);
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

  const value = {
    user,
    session,
    loading,
    isEmailVerified,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}