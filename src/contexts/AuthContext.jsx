// src/contexts/AuthContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import { supabase, getCurrentUser, getSession } from '../lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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
      } else {
        // Ensure user is set to null when no session exists
        setUser(null);
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
          } else {
            // Explicitly set user to null on sign out
            setUser(null);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}