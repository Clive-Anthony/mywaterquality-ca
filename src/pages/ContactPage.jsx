// src/pages/ContactPage.jsx - WITH FRONTEND EMAIL NOTIFICATION
import { useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Send email notification via Netlify function
const sendEmailNotification = async (contactData) => {
  try {
    // console.log('Sending email notification for contact:', contactData.id);
    
    // Use different URL for development vs production
    const isDev = window.location.hostname === 'localhost';
    const functionUrl = isDev 
      ? 'http://localhost:8888/.netlify/functions/send-contact-notification'
      : '/.netlify/functions/send-contact-notification';
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData)
    });

    if (!response.ok) {
      // Handle non-JSON error responses
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || 'Failed to send email notification';
      } catch (jsonError) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // console.log('Email notification sent successfully');
    return await response.json();
  } catch (error) {
    console.error('Email notification error:', error);
    // Don't throw - we don't want email failure to prevent form submission success
    // Just log the error
  }
};

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic validation
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      // Prepare data for submission
      const submissionData = {
        name: formData.name.trim() || null,
        email: formData.email.trim(),
        feedback: formData.feedback.trim(),
        user_id: user?.id || null
      };

      // Submit to Supabase
      const { data: insertedData, error: submitError } = await supabase
        .from('contact_feedback')
        .insert([submissionData])
        .select()
        .single();

      if (submitError) {
        throw submitError;
      }

      // console.log('Contact form submitted successfully:', insertedData);

      // Send email notification (non-blocking)
      // We have the inserted data with ID and created_at timestamp
      await sendEmailNotification(insertedData);

      // Success
      setSuccess(true);
      setFormData({
        name: user?.user_metadata?.firstName && user?.user_metadata?.lastName 
          ? `${user.user_metadata.firstName} ${user.user_metadata.lastName}`.trim()
          : user?.user_metadata?.full_name || '',
        email: user?.email || '',
        feedback: ''
      });

      // Clear success message after 5 seconds
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

  // Hero section for the contact page
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
          {/* Contact Form */}
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
              {/* Success Message */}
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
              
              {/* Error Message */}
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
                {/* Name Field */}
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

                {/* Email Field */}
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

                {/* Feedback Field */}
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
                    placeholder="Tell us about your question, concern, or feedback. Please include any relevant details such as order numbers or specific water testing questions."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum 10 characters required
                  </p>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={loading || formData.feedback.trim().length < 10}
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
                      💡 Have an account? <a href="/login" className="font-medium underline hover:text-blue-600">Log in first</a> to track your messages and get faster support.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* Contact Info Card */}
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

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">Business Hours</h4>
                    <p className="mt-1 text-sm text-gray-600">Monday - Friday: 9:00 AM - 5:00 PM EST</p>
                    <p className="text-sm text-gray-600">Saturday: 10:00 AM - 2:00 PM EST</p>
                    <p className="text-sm text-gray-600">Sunday: Closed</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">Location</h4>
                    <p className="mt-1 text-sm text-gray-600">Serving all of Canada</p>
                    <p className="text-xs text-gray-500">Free shipping on all test kits</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Quick Links */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Common Questions
                </h3>
              </div>
              <div className="px-6 py-6">
                <ul className="space-y-4">
                  <li>
                    <h4 className="text-sm font-medium text-gray-900">How long does testing take?</h4>
                    <p className="text-sm text-gray-600 mt-1">Most test results are available within 5-7 business days after we receive your sample.</p>
                  </li>
                  <li>
                    <h4 className="text-sm font-medium text-gray-900">What's included in the test kit?</h4>
                    <p className="text-sm text-gray-600 mt-1">Each kit includes sample containers, detailed instructions, prepaid shipping labels, and access to your online results.</p>
                  </li>
                  <li>
                    <h4 className="text-sm font-medium text-gray-900">Can I track my sample?</h4>
                    <p className="text-sm text-gray-600 mt-1">Yes! Log into your account to track your sample status and view results when they're ready.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}