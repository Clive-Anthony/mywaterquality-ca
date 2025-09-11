// src/components/Footer.jsx - Enhanced with prominent newsletter section
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { config } from '../config';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');

  // Client-side email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email.trim()) {
      return 'Email is required';
    }
    
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    
    // Check for common typos
    const commonTypos = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'yahoo.co': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'outlokk.com': 'outlook.com',
      'icloud.co': 'icloud.com'
    };
    
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && commonTypos[domain]) {
      return `Did you mean ${email.replace(domain, commonTypos[domain])}?`;
    }
    
    return '';
  };

  // Handle email input changes with real-time validation
  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // Clear previous errors when user starts typing
    if (emailError && newEmail !== email) {
      setEmailError('');
    }
    
    // Clear status messages when user modifies email
    if (status === 'success' || status === 'error') {
      setStatus('idle');
      setMessage('');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email
    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      return;
    }
    
    setEmailError('');
    setStatus('loading');
    setMessage('');
    
    try {
      // Call your Supabase Edge Function
      const response = await fetch(
        `${config.supabaseUrl}/functions/v1/newsletter-signup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.supabaseAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            source: 'footer',
            metadata: {
              page_url: window.location.href,
              referrer: document.referrer || 'direct',
              user_agent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          })
        }
      );

      const result = await response.json();
      
      if (response.ok && result.success) {
        setStatus('success');
        setMessage(result.alreadySubscribed 
          ? 'You\'re already subscribed!' 
          : 'Thanks for subscribing!'
        );
        setEmail(''); // Clear form on success
        
        // Track signup for analytics (if you have GTM/GA set up)
        if (window.gtag) {
          window.gtag('event', 'newsletter_signup', {
            event_category: 'engagement',
            event_label: 'footer'
          });
        }
        
      } else {
        setStatus('error');
        setMessage(result.error || 'Something went wrong. Please try again.');
      }
      
    } catch (error) {
      console.error('Newsletter signup error:', error);
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  return (
    <footer className="bg-gray-900">
      {/* Newsletter Signup Section - Top of Footer */}
      <div className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Newsletter Content */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Stay Informed About Your Water Quality
              </h3>
              <p className="text-gray-300 text-lg mb-4">
                Get expert tips, testing insights, and health updates delivered to your inbox.
              </p>
              {/* <div className="flex items-center space-x-6 text-sm text-gray-400">
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Weekly tips
                </div>
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  No spam
                </div>
                <div className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Easy unsubscribe
                </div>
              </div> */}
            </div>

            {/* Newsletter Form */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label htmlFor="footer-newsletter-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="footer-newsletter-email"
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="Enter your email"
                      disabled={status === 'loading'}
                      className={`
                        w-full px-4 py-3 text-gray-900 placeholder-gray-500 
                        border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${emailError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
                        transition-colors duration-200
                      `}
                      aria-describedby={emailError ? 'footer-email-error' : undefined}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={status === 'loading' || !email.trim()}
                    className="
                      px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg
                      hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors duration-200
                      whitespace-nowrap
                    "
                  >
                    {status === 'loading' ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Subscribing...
                      </span>
                    ) : (
                      'Subscribe'
                    )}
                  </button>
                </div>
                
                {/* Error message */}
                {emailError && (
                  <p id="footer-email-error" className="text-red-400 text-sm flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {emailError}
                  </p>
                )}
                
                {/* Status messages */}
                {message && (
                  <div className={`text-sm ${
                    status === 'success' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {status === 'success' && (
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {message}
                      </div>
                    )}
                    {status === 'error' && (
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {message}
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Regular Footer Content */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold text-white mb-4">My Water Quality</h3>
            <p className="text-gray-300 mb-4">
              Professional drinking water testing services for Canadian homes and businesses. 
              Get the knowledge you need to make informed decisions about your drinking water quality.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/about-us" className="text-gray-300 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors">Get Support</Link></li>
              <li><Link to="/terms-and-conditions" className="text-gray-300 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-center text-gray-300 mb-4 md:mb-0">
              © 2025 My Water Quality. All rights reserved.
            </p>
            
            {/* Quick Contact Info */}
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-300">
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>info@mywaterquality.ca</span>
              </div>
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Mon-Fri 9AM-5PM EST</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}