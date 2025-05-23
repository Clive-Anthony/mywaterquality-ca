// src/lib/loopsClient.js
/**
 * Direct API integration with Loops for email communications
 * This client handles authentication verification emails and welcome messages
 */

// Base URL for Loops API
const LOOPS_API_BASE_URL = 'https://app.loops.so/api/v1';

/**
 * Send a transactional email using Loops API
 * 
 * @param {Object} options - Email options
 * @param {string} options.transactionalId - The Loops template ID
 * @param {string} options.to - Recipient email
 * @param {Object} options.variables - Template variables
 * @returns {Promise<Object>} - API response
 */
export const sendTransactionalEmail = async ({ transactionalId, to, variables }) => {
  try {
    // Make sure we have an API key
    const apiKey = import.meta.env.VITE_LOOPS_API_KEY;
    if (!apiKey) {
      throw new Error('Loops API key is not set in environment variables');
    }

    console.log(`Sending ${transactionalId} email to ${to}`);

    // Make the API request to Loops
    const response = await fetch(`${LOOPS_API_BASE_URL}/transactional`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        transactionalId,
        email: to,
        dataVariables: variables  // Changed from dataFields to dataVariables
      })
    });

    // Check for errors
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to send email via Loops: ${response.status}`);
    }

    // Return success response
    const data = await response.json();
    console.log('Email sent successfully via Loops:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending email via Loops:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send verification email using Loops
 * Template ID: cmay9ss140qtu2u0hrqjhb0or
 * 
 * @param {Object} user - User object from Supabase
 * @param {string} verificationLink - The verification link
 * @returns {Promise<Object>} - Result of the operation
 */
export const sendVerificationEmail = async (user, verificationLink) => {
  try {
    const firstName = user.user_metadata?.firstName || user.user_metadata?.full_name?.split(' ')[0] || 'Valued Customer';
    
    return await sendTransactionalEmail({
      transactionalId: 'cmay9ss140qtu2u0hrqjhb0or',
      to: user.email,
      variables: {
        firstName,
        verificationLink,
        websiteURL: window.location.origin
      }
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email using Loops
 * Template ID: cmazp7ib41er0z60iagt7cw00
 * 
 * @param {Object} user - User object from Supabase
 * @returns {Promise<Object>} - Result of the operation
 */
export const sendWelcomeEmail = async (user) => {
  try {
    const firstName = user.user_metadata?.firstName || user.user_metadata?.full_name?.split(' ')[0] || 'Valued Customer';
    
    return await sendTransactionalEmail({
      transactionalId: 'cmazp7ib41er0z60iagt7cw00',
      to: user.email,
      variables: {
        firstName,
        dashboardLink: `${window.location.origin}/dashboard`,
        websiteURL: window.location.origin
      }
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Export a default object for compatibility
export default {
  sendTransactionalEmail,
  sendVerificationEmail,
  sendWelcomeEmail
};