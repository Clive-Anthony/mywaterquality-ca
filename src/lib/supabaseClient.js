// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Create a single supabase client for interacting with your database
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Enhanced Auth helper functions with Loops email integration
export const signUp = async (email, password, firstName = '', lastName = '') => {
  try {
    // Create user account with metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // Include both formats - camelCase for existing app code and snake_case for Supabase trigger
          firstName, 
          lastName,
          first_name: firstName, // Added for Supabase trigger function
          last_name: lastName    // Added for Supabase trigger function
        },
        // Set the redirect URL for email verification
        emailRedirectTo: `${config.baseUrl}auth/callback`,
      }
    });

    if (error) throw error;

    // If signup was successful and we have a user, trigger custom verification email
    if (data?.user && !data?.user?.email_confirmed_at) {
      // Call Netlify function to generate verification link and send email via Loops
      try {
        const response = await fetch('/.netlify/functions/generate-verification-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.user.email,
            firstName: firstName || 'Valued Customer'
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to send verification email:', errorData);
          // Don't throw - user is still created, just email failed
        } else {
          console.log('Verification email sent successfully via Loops');
        }
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Don't throw - user creation succeeded, email is secondary
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error during sign up:', err);
    return { data: null, error: err };
  }
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signInWithGoogle = async () => {
  const redirectUrl = `${config.baseUrl}auth/callback`;
  
  console.log('Starting Google sign-in with redirect to:', redirectUrl);
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          _t: Date.now() // Prevent caching issues
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

// FIXED Password reset method - Use only custom Loops email, not Supabase default
export const resetPassword = async (email) => {
  try {
    console.log('Initiating password reset for:', email);
    
    // Send custom password reset email via Netlify function only
    // Don't call supabase.auth.resetPasswordForEmail to avoid conflicts
    const response = await fetch('/.netlify/functions/send-password-reset-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        firstName: 'User' // We don't have the name at this point
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Get the response text first to debug what we're receiving
    const responseText = await response.text();
    console.log('Raw response:', responseText);

    if (!response.ok) {
      console.error('Request failed with status:', response.status);
      
      // Try to parse as JSON, but handle cases where it's not JSON
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Response is not valid JSON:', jsonError);
        // If it's not JSON, create a generic error
        errorData = { 
          message: `Server error (${response.status}): ${responseText || 'Unknown error'}` 
        };
      }
      
      throw new Error(errorData.message || 'Failed to send reset email');
    }

    // Parse successful response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Success response is not valid JSON:', jsonError);
      // If success response isn't JSON, assume it worked
      responseData = { message: 'Password reset email sent' };
    }

    console.log('Password reset email sent successfully via Loops');
    
    return { data: { message: 'Password reset email sent' }, error: null };
  } catch (err) {
    console.error('Error during password reset:', err);
    return { data: null, error: err };
  }
};

// Function to verify email token and send welcome email
export const verifyEmailToken = async (tokenHash) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'email',
    });
    
    if (error) throw error;
    
    // If verification was successful, send welcome email via Netlify function
    if (data?.user) {
      try {
        const response = await fetch('/.netlify/functions/send-welcome-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.user.email,
            firstName: data.user.user_metadata?.firstName || 'Valued Customer'
          }),
        });
        
        if (!response.ok) {
          console.error('Failed to send welcome email, but verification was successful');
        } else {
          console.log('Welcome email sent successfully');
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't throw - verification succeeded, email is secondary
      }
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Error during email verification:', err);
    return { data: null, error: err };
  }
};