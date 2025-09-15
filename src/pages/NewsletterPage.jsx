// src/pages/NewsletterPage.jsx
import { useState } from 'react';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import { config } from '../config';
import { trackNewsletterSignupConversion } from '../utils/gtm';

export default function NewsletterPage() {
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
          source: 'newsletter_page', // Specific source for this page
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
        : 'Thanks for subscribing! Welcome to the My Water Quality community.'
      );
      
      // Track newsletter signup conversion in GTM
      try {
        await trackNewsletterSignupConversion({
          email: email.toLowerCase().trim(),
          source: 'newsletter_page',
          alreadySubscribed: result.alreadySubscribed || false
        });
      } catch (gtmError) {
        console.error('GTM newsletter signup tracking error (non-critical):', gtmError);
      }
      
      setEmail(''); // Clear form on success
      
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
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      
      <main className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl mb-6">
            Stay Informed About Your Water Quality
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Join our community of Canadians who receive expert water quality tips, testing insights, 
            and health updates delivered straight to their inbox.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Newsletter Benefits */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              What You'll Get
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Water Quality Tips
                  </h3>
                  <p className="text-gray-600">
                    Practical advice on maintaining and improving your home's water quality, 
                    from filtration tips to testing schedules.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Testing Insights & Updates
                  </h3>
                  <p className="text-gray-600">
                    Stay updated on the latest water testing methods, new contaminants to watch for, 
                    and how to interpret your water test results.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Health & Safety News
                  </h3>
                  <p className="text-gray-600">
                    Important updates about water quality regulations, health advisories, 
                    and how water quality affects your family's wellbeing.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Exclusive Offers & Discounts
                  </h3>
                  <p className="text-gray-600">
                    Be the first to know about special promotions, seasonal discounts, 
                    and new testing packages before they're available to the public.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h4 className="font-semibold text-green-800">Your Privacy Matters</h4>
              </div>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✅ No spam - we only send valuable content</li>
                <li>✅ Unsubscribe anytime with one click</li>
              </ul>
            </div>
          </div>

          {/* Newsletter Signup Form */}
          <div className="lg:pl-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Join Our Community
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="newsletter-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Enter your email address"
                    disabled={status === 'loading'}
                    className={`
                      w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${emailError ? 'border-red-400 bg-red-50' : 'border-gray-300'}
                      transition-colors duration-200
                    `}
                    aria-describedby={emailError ? 'email-error' : undefined}
                  />
                  
                  {emailError && (
                    <p id="email-error" className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {emailError}
                    </p>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={status === 'loading' || !email.trim()}
                  className="
                    w-full py-3 px-6 text-white font-semibold bg-blue-600 rounded-lg
                    hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors duration-200
                  "
                >
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Subscribing...
                    </span>
                  ) : (
                    'Subscribe to Newsletter'
                  )}
                </button>
                
                {/* Status messages */}
                {message && (
                  <div className={`text-sm ${
                    status === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {status === 'success' && (
                      <div className="flex items-center p-3 bg-green-50 rounded-lg">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <p className="font-medium">{message}</p>
                          <p className="text-xs text-green-600 mt-1">
                            Check your email for a welcome message!
                          </p>
                        </div>
                      </div>
                    )}
                    {status === 'error' && (
                      <div className="flex items-center p-3 bg-red-50 rounded-lg">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {message}
                      </div>
                    )}
                  </div>
                )}
              </form>

              {/* Additional info */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  By subscribing, you agree to receive marketing emails from My Water Quality. 
                  You can unsubscribe at any time.
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}