// src/pages/CheckoutPage.jsx - FIXED: Session hanging issue resolved
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import PageLayout from '../components/PageLayout';
import PayPalPayment from '../components/PayPalPayment';
import { supabase } from '../lib/supabaseClient';

// DEBUG LOGGING FUNCTION
const debugLog = (step, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `🔍 [${timestamp}] [${step}] ${message}`;
  
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
};

// TIMEOUT WRAPPER FOR ASYNC OPERATIONS
const withTimeout = (promise, timeoutMs = 10000, errorMessage = 'Operation timed out') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

// SIMPLIFIED LOADING OVERLAY
const PaymentLoadingOverlay = ({ isVisible, step, error, debugInfo }) => {
  if (!isVisible) return null;

  const steps = [
    'Processing PayPal payment...',
    'Preparing order data...',
    'Sending to backend...',
    'Creating order...',
    'Order complete!'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        {error ? (
          <>
            <div className="text-red-600 mb-4">
              <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Failed</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Your Order</h3>
            <p className="text-sm text-gray-600 mb-4">{steps[step] || 'Please wait...'}</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-4">Step {step + 1} of {steps.length}</p>
          </>
        )}
      </div>
    </div>
  );
};

// SUCCESS NOTIFICATION
const OrderSuccessNotification = ({ orderData, onDashboard }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
      <div className="text-green-600 mb-4">
        <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Order Confirmed! 🎉</h3>
      <p className="text-gray-600 mb-1">Order #{orderData?.order_number}</p>
      <p className="text-sm text-gray-500 mb-6">
        Your water testing kit order has been successfully processed.
      </p>
      <button
        onClick={onDashboard}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
      >
        Go to Dashboard
      </button>
    </div>
  </div>
);

// STEP COMPONENTS (simplified for debugging)
const ReviewStep = React.memo(({ cartItems, formatPrice, totals }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold text-gray-900">Review Your Order</h2>
    <div className="bg-white rounded-lg shadow p-6">
      <div className="space-y-2">
        {cartItems.map(item => (
          <div key={item.item_id} className="flex justify-between">
            <span>{item.test_kits.name} x {item.quantity}</span>
            <span>{formatPrice(item.quantity * item.test_kits.price)}</span>
          </div>
        ))}
        <div className="border-t pt-2 font-semibold">
          <div className="flex justify-between">
            <span>Total (incl. tax)</span>
            <span>{formatPrice(totals.total)}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
));

const ShippingStep = React.memo(({ formData, onInputChange, provinces }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold text-gray-900">Shipping Information</h2>
    <div className="bg-white rounded-lg shadow p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <input
        type="text"
        placeholder="First Name *"
        value={formData.shipping.firstName}
        onChange={(e) => onInputChange('shipping', 'firstName', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        required
      />
      <input
        type="text"
        placeholder="Last Name *"
        value={formData.shipping.lastName}
        onChange={(e) => onInputChange('shipping', 'lastName', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        required
      />
      <input
        type="email"
        placeholder="Email *"
        value={formData.shipping.email}
        onChange={(e) => onInputChange('shipping', 'email', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md sm:col-span-2"
        required
      />
      <input
        type="text"
        placeholder="Address *"
        value={formData.shipping.address}
        onChange={(e) => onInputChange('shipping', 'address', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md sm:col-span-2"
        required
      />
      <input
        type="text"
        placeholder="City *"
        value={formData.shipping.city}
        onChange={(e) => onInputChange('shipping', 'city', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        required
      />
      <select
        value={formData.shipping.province}
        onChange={(e) => onInputChange('shipping', 'province', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        required
      >
        {provinces.map(province => (
          <option key={province.value} value={province.value}>
            {province.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Postal Code *"
        value={formData.shipping.postalCode}
        onChange={(e) => onInputChange('shipping', 'postalCode', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        required
      />
    </div>
  </div>
));

const PaymentStep = React.memo(({ 
  formData, 
  cartItems, 
  formatPrice, 
  totals,
  onPaymentSuccess,
  onPaymentError,
  isProcessing
}) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold text-gray-900">Payment</h2>
    
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
      <div className="space-y-2 mb-6">
        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>{formatPrice(totals.total)}</span>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-base font-medium text-gray-900 mb-3">Pay with PayPal</h4>
        <PayPalPayment
          amount={totals.total}
          currency="CAD"
          onSuccess={onPaymentSuccess}
          onError={onPaymentError}
          onCancel={() => debugLog('PAYPAL', 'Payment cancelled by user')}
          disabled={isProcessing}
        />
      </div>
    </div>
  </div>
));

// MAIN COMPONENT WITH SESSION FIX
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, session } = useAuth(); // Use session from auth context instead of fetching
  const { cartItems, cartSummary, clearCart } = useCart();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingError, setProcessingError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({ lastAction: 'Initialized' });
  const [orderData, setOrderData] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    shipping: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Canada'
    },
    specialInstructions: ''
  });

  // CALCULATIONS
  const totals = useMemo(() => {
    const subtotal = cartSummary.totalPrice;
    const shipping = 0;
    const tax = subtotal * 0.13;
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total };
  }, [cartSummary.totalPrice]);

  const formatPrice = useCallback((price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(price);
  }, []);

  const provinces = useMemo(() => [
    { value: '', label: 'Select Province' },
    { value: 'AB', label: 'Alberta' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'MB', label: 'Manitoba' },
    { value: 'NB', label: 'New Brunswick' },
    { value: 'NL', label: 'Newfoundland and Labrador' },
    { value: 'NS', label: 'Nova Scotia' },
    { value: 'NT', label: 'Northwest Territories' },
    { value: 'NU', label: 'Nunavut' },
    { value: 'ON', label: 'Ontario' },
    { value: 'PE', label: 'Prince Edward Island' },
    { value: 'QC', label: 'Quebec' },
    { value: 'SK', label: 'Saskatchewan' },
    { value: 'YT', label: 'Yukon' }
  ], []);

  // LOAD USER PROFILE
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;

      try {
        debugLog('PROFILE', 'Loading user profile', { userId: user.id });
        
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          debugLog('PROFILE', 'Profile loaded successfully');
          setFormData(prev => ({
            ...prev,
            shipping: {
              ...prev.shipping,
              firstName: data.first_name || user.user_metadata?.firstName || '',
              lastName: data.last_name || user.user_metadata?.lastName || '',
              email: user.email || '',
              phone: data.phone || '',
              address: data.address || '',
              city: data.city || '',
              province: data.province || '',
              postalCode: data.postal_code || ''
            }
          }));
        } else {
          debugLog('PROFILE', 'No profile found, using user metadata');
          setFormData(prev => ({
            ...prev,
            shipping: {
              ...prev.shipping,
              firstName: user.user_metadata?.firstName || '',
              lastName: user.user_metadata?.lastName || '',
              email: user.email || ''
            }
          }));
        }
      } catch (error) {
        debugLog('PROFILE', 'Profile load error', { error: error.message });
      }
    };

    loadUserProfile();
  }, [user]);

  // HANDLERS
  const handleInputChange = useCallback((section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  }, []);

  const validateShipping = useCallback(() => {
    const required = ['firstName', 'lastName', 'email', 'address', 'city', 'province', 'postalCode'];
    const isValid = required.every(field => formData.shipping[field]?.trim());
    debugLog('VALIDATION', 'Shipping validation result', { 
      isValid, 
      missingFields: required.filter(field => !formData.shipping[field]?.trim())
    });
    return isValid;
  }, [formData.shipping]);

  const goToStep = useCallback((step) => {
    if (step === 3 && !validateShipping()) {
      alert('Please complete all required shipping fields');
      return;
    }
    setCurrentStep(step);
    debugLog('NAVIGATION', `Moved to step ${step}`);
  }, [validateShipping]);

  // FIXED PAYMENT SUCCESS HANDLER - NO MORE SESSION HANGING
  const handlePaymentSuccess = useCallback(async (paymentDetails) => {
    // ALTERNATIVE: Replace the success section with immediate redirect

// Replace this section in handlePaymentSuccess:
// setOrderData(responseData.order);
// setIsProcessing(false);
// setShowSuccess(true);

// With this immediate redirect:
debugLog('SUCCESS', 'Order created, redirecting immediately to dashboard');

// Clear cart
clearCart().catch(cartError => {
  console.warn('Cart clear failed:', cartError);
});

// Immediate redirect - no modal
navigate('/dashboard', { 
  replace: true,
  state: { 
    orderSuccess: true,
    orderNumber: responseData.order.order_number,
    orderTotal: totals.total,
    message: `🎉 Order #${responseData.order.order_number} confirmed! Your water testing kits will ship within 1-2 business days.`
  }
});

// No need to set processing states - we're leaving the page
    
    try {
      // Step 1: Skip session retrieval - use existing session/user from context
      setProcessingStep(1);
      setDebugInfo({ lastAction: 'Preparing order data (skipping session fetch)' });
      debugLog('AUTH', 'Using existing session from auth context', { 
        hasUser: !!user,
        hasSession: !!session,
        userId: user?.id
      });

      // Verify we have what we need
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get access token directly from session in auth context or create a fresh one
      let accessToken;
      if (session?.access_token) {
        accessToken = session.access_token;
        debugLog('AUTH', 'Using access token from auth context');
      } else {
        debugLog('AUTH', 'No access token in context, getting fresh token with timeout');
        // Only if we absolutely need to, get a fresh token with timeout
        try {
          const { data: sessionData } = await withTimeout(
            supabase.auth.getSession(),
            5000,
            'Session fetch timed out'
          );
          
          if (sessionData?.session?.access_token) {
            accessToken = sessionData.session.access_token;
            debugLog('AUTH', 'Fresh access token retrieved');
          } else {
            throw new Error('No access token available');
          }
        } catch (sessionError) {
          debugLog('AUTH', 'Session fetch failed, trying to refresh', { error: sessionError.message });
          // Try to refresh the session
          const { data: refreshData } = await withTimeout(
            supabase.auth.refreshSession(),
            5000,
            'Session refresh timed out'
          );
          
          if (refreshData?.session?.access_token) {
            accessToken = refreshData.session.access_token;
            debugLog('AUTH', 'Access token from refresh');
          } else {
            throw new Error('Unable to get valid access token');
          }
        }
      }

      // Step 2: Prepare order data
      setProcessingStep(2);
      setDebugInfo({ lastAction: 'Preparing order data' });
      debugLog('ORDER', 'Preparing order data...');

      const orderRequestData = {
        subtotal: totals.subtotal,
        shipping_cost: totals.shipping,
        tax_amount: totals.tax,
        total_amount: totals.total,
        payment_method: 'paypal',
        payment_reference: paymentDetails.paypalOrderId,
        shipping_address: formData.shipping,
        billing_address: formData.shipping,
        special_instructions: formData.specialInstructions || null,
        items: cartItems.map(item => ({
          test_kit_id: item.test_kit_id,
          quantity: item.quantity,
          unit_price: item.test_kits.price,
          product_name: item.test_kits.name,
          product_description: item.test_kits.description
        }))
      };

      debugLog('ORDER', 'Order data prepared', { 
        total: orderRequestData.total_amount,
        itemCount: orderRequestData.items.length,
        paymentReference: orderRequestData.payment_reference
      });

      // Step 3: Send to backend with timeout
      setProcessingStep(3);
      setDebugInfo({ lastAction: 'Sending request to backend' });
      debugLog('BACKEND', 'Sending request to backend...');

      const response = await withTimeout(
        fetch('/.netlify/functions/process-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(orderRequestData)
        }),
        30000,
        'Backend request timed out'
      );

      debugLog('BACKEND', 'Response received', { 
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      // Step 4: Process response
      setProcessingStep(4);
      setDebugInfo({ lastAction: 'Processing backend response' });
      debugLog('RESPONSE', 'Processing response...');

      const responseText = await response.text();
      
      if (!response.ok) {
        debugLog('RESPONSE', 'Response not OK', { 
          status: response.status,
          responseText: responseText.substring(0, 500)
        });
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText || `HTTP ${response.status}` };
        }
        
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const responseData = JSON.parse(responseText);
      debugLog('RESPONSE', 'Response parsed successfully', { 
        success: responseData.success,
        hasOrder: !!responseData.order,
        orderNumber: responseData.order?.order_number
      });

      // Step 5: Success
      debugLog('SUCCESS', 'Order created successfully', { 
        orderNumber: responseData.order.order_number,
        orderId: responseData.order.id
      });
      
      setOrderData(responseData.order);
      
      // Clear cart
      try {
        await clearCart();
        debugLog('CART', 'Cart cleared successfully');
      } catch (cartError) {
        debugLog('CART', 'Cart clear failed (non-critical)', { error: cartError.message });
      }
      
      setIsProcessing(false);
      setShowSuccess(true);

    } catch (error) {
      debugLog('ERROR', 'Payment processing failed', { 
        error: error.message,
        stack: error.stack,
        step: processingStep
      });
      
      setProcessingError(error.message);
      setDebugInfo({ 
        lastAction: 'Error occurred',
        error: error.message,
        step: processingStep
      });
      setIsProcessing(false);
    }
  }, [totals, formData, cartItems, clearCart, user, session, processingStep]);

  const handlePaymentError = useCallback((error) => {
    debugLog('PAYPAL_ERROR', 'PayPal error occurred', { error: error.message });
    setProcessingError(`PayPal error: ${error.message}`);
  }, []);

  const goToDashboard = useCallback(() => {
    debugLog('NAVIGATION', 'Redirecting to dashboard');
    navigate('/dashboard', { 
      replace: true,
      state: { 
        orderSuccess: true,
        orderNumber: orderData?.order_number 
      }
    });
  }, [navigate, orderData]);

  // RENDER STEP CONTENT
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ReviewStep cartItems={cartItems} formatPrice={formatPrice} totals={totals} />;
      case 2:
        return <ShippingStep formData={formData} onInputChange={handleInputChange} provinces={provinces} />;
      case 3:
        return (
          <PaymentStep 
            formData={formData}
            cartItems={cartItems}
            formatPrice={formatPrice}
            totals={totals}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            isProcessing={isProcessing}
          />
        );
      default:
        return null;
    }
  };

  if (!user || cartSummary.totalItems === 0) {
    return null;
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Debug Info Panel */}
        <div className="mb-4 bg-gray-100 p-4 rounded-lg text-sm">
          <h4 className="font-semibold mb-2">Debug Info:</h4>
          <p>Current Step: {currentStep}</p>
          <p>Processing: {isProcessing ? 'Yes' : 'No'}</p>
          <p>Processing Step: {processingStep}</p>
          <p>Last Action: {debugInfo.lastAction}</p>
          <p>Has User: {user ? 'Yes' : 'No'}</p>
          <p>Has Session: {session ? 'Yes' : 'No'}</p>
          {processingError && <p className="text-red-600">Error: {processingError}</p>}
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-center">
              {[
                { id: 1, name: 'Review' },
                { id: 2, name: 'Shipping' },
                { id: 3, name: 'Payment' }
              ].map((step, stepIdx) => (
                <li key={step.id} className={`${stepIdx !== 2 ? 'pr-8 sm:pr-20' : ''} relative`}>
                  <div className={`relative w-8 h-8 flex items-center justify-center rounded-full ${
                    currentStep > step.id 
                      ? 'bg-blue-600' 
                      : currentStep === step.id 
                        ? 'border-2 border-blue-600 bg-white' 
                        : 'border-2 border-gray-300 bg-white'
                  }`}>
                    {currentStep > step.id ? (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className={`text-sm font-medium ${
                        currentStep === step.id ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {step.id}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className={`text-xs font-medium ${
                      currentStep === step.id ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => goToStep(currentStep - 1)}
                disabled={isProcessing}
                className="px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                ← Previous
              </button>
            )}
          </div>
          <div>
            {currentStep < 3 && (
              <button
                onClick={() => goToStep(currentStep + 1)}
                className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overlays */}
      <PaymentLoadingOverlay 
        isVisible={isProcessing}
        step={processingStep}
        error={processingError}
        debugInfo={debugInfo}
      />
      
      {showSuccess && orderData && (
        <OrderSuccessNotification
          orderData={orderData}
          onDashboard={goToDashboard}
        />
      )}
    </PageLayout>
  );
}