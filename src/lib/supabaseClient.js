// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Create a single supabase client for interacting with your database
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

// Auth helper functions
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signInWithGoogle = async () => {
  // Make absolutely sure we're using the correct redirect URL
  // Force a specific callback URL (not the base URL) to ensure consistent handling
  const redirectUrl = `${config.baseUrl}auth/callback`;
  
  console.log('Starting Google sign-in with redirect to:', redirectUrl);
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        // Add a timestamp to prevent caching issues
        queryParams: {
          _t: Date.now()
        }
      }
    });
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (err) {
    console.error('Error initiating Google sign-in:', err);
    return { data: null, error: err };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      return { error };
    }
    return { error: null };
  } catch (err) {
    console.error('Exception during sign out:', err.message);
    return { error: err };
  }
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};