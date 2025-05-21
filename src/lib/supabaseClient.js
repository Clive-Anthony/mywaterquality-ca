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
  console.log('Redirecting to:', config.baseUrl); // Debug log
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: config.baseUrl,
    },
  });
  return { data, error };
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