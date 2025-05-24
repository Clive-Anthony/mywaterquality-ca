// src/lib/supabaseClient.js - Updated resetPassword function
export const resetPassword = async (email) => {
  try {
    console.log('Initiating password reset for:', email);
    
    // Send custom password reset email via Netlify function only
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

    console.log('Password reset email sent successfully:', responseData);
    
    return { data: { message: 'Password reset email sent' }, error: null };
  } catch (err) {
    console.error('Error during password reset:', err);
    return { data: null, error: err };
  }
};