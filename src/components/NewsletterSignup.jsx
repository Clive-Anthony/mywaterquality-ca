import { useState } from 'react';
import { config } from '../config';

export default function NewsletterSignup({ source = 'website_footer', className = '' }) {
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
            source,
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
          ? 'You\'re already subscribed to our newsletter!' 
          : 'Thanks for subscribing! Check your email for confirmation.'
        );
        setEmail(''); // Clear form on success
        
        // Track signup for analytics (if you have GTM/GA set up)
        if (window.gtag) {
          window.gtag('event', 'newsletter_signup', {
            event_category: 'engagement',
            event_label: source
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
    <div className={`newsletter-signup ${className}`}>
      <div className="mb-4">
        <h4 className="text-white font-medium mb-2">Stay Informed</h4>
        <p className="text-gray-300 text-sm">
          Get water quality tips and updates delivered to your inbox.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="Enter your email"
            disabled={status === 'loading'}
            className={`
              w-full px-4 py-2 text-gray-900 placeholder-gray-500 
              border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${emailError ? 'border-red-500' : 'border-gray-300'}
            `}
            aria-describedby={emailError ? 'email-error' : undefined}
          />
          
          {emailError && (
            <p id="email-error" className="mt-1 text-sm text-red-400">
              {emailError}
            </p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={status === 'loading' || !email.trim()}
          className="
            w-full px-4 py-2 text-white font-medium rounded-md
            bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          "
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center">
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
      
      {/* Privacy note */}
      <p className="mt-3 text-xs text-gray-400">
        We respect your privacy. Unsubscribe at any time.
      </p>
    </div>
  );
}