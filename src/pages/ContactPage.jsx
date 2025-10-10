// src/pages/ContactPage.jsx - WITH TURNSTILE BOT PROTECTION
import { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageLayout from '../components/PageLayout';

export default function ContactPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.firstName && user?.user_metadata?.lastName 
      ? `${user.user_metadata.firstName} ${user.user_metadata.lastName}`.trim()
      : user?.user_metadata?.full_name || '',
    email: user?.email || '',
    feedback: ''
  });
  
  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileError, setTurnstileError] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const sendEmailNotification = async (contactData) => {
    try {
      // Use relative path - works for both local Netlify Dev and production
      const response = await fetch('/.netlify/functions/send-contact-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData)
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || 'Failed to send email notification';
        } catch (jsonError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          if (jsonError) {
            console.log(jsonError)
          }
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Email notification error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!turnstileToken) {
      setError('Please complete the verification challenge');
      setTurnstileError(true);
      return;
    }
    
    setLoading(true);

    if (!formData.email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (!formData.feedback.trim()) {
      setError('Feedback message is required');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      console.log('Verifying Turnstile token...');
      const verifyResponse = await fetch('/.netlify/functions/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken })
      });

      const verifyResult = await verifyResponse.json();
      
      if (!verifyResult.success) {
        console.error('Turnstile verification failed:', verifyResult);
        throw new Error('Verification failed. Please try again.');
      }

      console.log('Turnstile verification successful');

      const submissionData = {
        name: formData.name.trim() || null,
        email: formData.email.trim(),
        feedback: formData.feedback.trim(),
        user_id: user?.id || null
      };

      const { data: insertedData, error: submitError } = await supabase
        .from('contact_feedback')
        .insert([submissionData])
        .select()
        .single();

      if (submitError) {
        throw submitError;
      }

      await sendEmailNotification(insertedData);

      setSuccess(true);
      setFormData({
        name: user?.user_metadata?.firstName && user?.user_metadata?.lastName 
          ? `${user.user_metadata.firstName} ${user.user_metadata.lastName}`.trim()
          : user?.user_metadata?.full_name || '',
        email: user?.email || '',
        feedback: ''
      });
      
      setTurnstileToken(null);
      setTurnstileError(false);

      setTimeout(() => {
        setSuccess(false);
      }, 5000);

    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err.message || 'Failed to send feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ContactHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Contact Us
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Have questions about water testing or need help with your order? 
            We're here to help! Send us a message and we'll get back to you as soon as possible.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout hero={<ContactHero />}>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Send us a message
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Fill out the form below and we'll respond within 24 hours.
              </p>
            </div>
            
            <div className="px-6 py-6">
              {success && (
                <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded" role="alert">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <h4 className="text-green-800 font-medium">Message sent successfully!</h4>
                      <p className="text-green-700 text-sm mt-1">
                        Thank you for contacting us. We'll get back to you within 24 hours.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded" role="alert">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-red-700">{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    id="feedback"
                    name="feedback"
                    required
                    rows={6}
                    value={formData.feedback}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-vertical"
                    placeholder="Tell us about your question, concern, or feedback."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum 10 characters required
                  </p>
                </div>

                <div>
                  <Turnstile
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                    onSuccess={(token) => {
                      setTurnstileToken(token);
                      setTurnstileError(false);
                    }}
                    onError={() => {
                      setTurnstileToken(null);
                      setTurnstileError(true);
                    }}
                    onExpire={() => {
                      setTurnstileToken(null);
                    }}
                    theme="light"
                    size="normal"
                  />
                  {turnstileError && (
                    <p className="mt-2 text-sm text-red-600">
                      Verification failed. Please refresh the page and try again.
                    </p>
                  )}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || !turnstileToken || formData.feedback.trim().length < 10}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </div>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-4 text-xs text-gray-500">
                <p>* Required fields</p>
                {user ? (
                  <p className="mt-1">✓ You're logged in - we'll associate this message with your account.</p>
                ) : (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="text-blue-700 text-sm">
                      💡 Have an account? <a href="/login" className="font-medium underline hover:text-blue-600">Log in first</a> to track your messages.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Get in Touch
                </h3>
              </div>
              <div className="px-6 py-6 space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">Email Support</h4>
                    <p className="mt-1 text-sm text-gray-600">info@mywaterquality.ca</p>
                    <p className="mt-1 text-xs text-gray-500">We respond within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}