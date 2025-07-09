// src/pages/CheckoutPage.jsx - Updated with coupon support
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import PageLayout from '../components/PageLayout';
import PayPalPayment from '../components/PayPalPayment';
import { supabase } from '../lib/supabaseClient';

const debugLog = (step, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `🔍 [${timestamp}] [${step}] ${message}`;
  
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
};

const withTimeout = (promise, timeoutMs = 10000, errorMessage = 'Operation timed out') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

// Loading overlay component
const PaymentLoadingOverlay = ({ isVisible, step, error }) => {
  if (!isVisible) return null;

  const steps = [
    'Processing order...',
    'Validating information...',
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

// Shipping Step (now without coupon input)
const ShippingStep = React.memo(({ formData, onInputChange, provinces }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold text-gray-900">Shipping Information</h2>
    
    {/* Shipping Form */}
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
        type="tel"
        placeholder="Phone Number"
        value={formData.shipping.phone}
        onChange={(e) => onInputChange('shipping', 'phone', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md sm:col-span-2"
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

// Updated Review Step with Coupon Section
const ReviewStep = React.memo(({ 
  cartItems, 
  formatPrice, 
  totals, 
  appliedCoupon,
  couponCode,
  onCouponChange,
  couponLoading,
  couponError,
  onApplyCoupon
}) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold text-gray-900">Review</h2>
    
    {/* Order Items */}
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
      <div className="space-y-2">
        {/* Individual test kit lines */}
        {cartItems.map(item => (
          <div key={item.item_id} className="flex justify-between">
            <span>{item.test_kits.name} x {item.quantity}</span>
            <span>{formatPrice(item.quantity * item.test_kits.price)}</span>
          </div>
        ))}
        
        {/* Pricing breakdown */}
        <div className="border-t pt-2 space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(totals.originalSubtotal)}</span>
          </div>
          
          {appliedCoupon && appliedCoupon.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount ({appliedCoupon.code})</span>
              <span>-{formatPrice(appliedCoupon.discountAmount)}</span>
            </div>
          )}
          
          {totals.subtotal > 0 && (
            <div className="flex justify-between">
              <span>Tax (HST 13%)</span>
              <span>{formatPrice(totals.tax)}</span>
            </div>
          )}
          
          <div className="flex justify-between font-semibold text-lg border-t pt-1">
            <span>Total</span>
            <span className={appliedCoupon?.isFreeOrder ? 'text-green-600' : ''}>
              {totals.total === 0 ? 'FREE' : formatPrice(totals.total)}
            </span>
          </div>
          
          {appliedCoupon?.isFreeOrder && (
            <div className="text-center">
              <p className="text-green-600 font-medium text-sm mt-2">
                🎉 Your order is completely FREE! No payment required.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Coupon Code Section */}
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Coupon Code</h3>
      
      {appliedCoupon ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-green-800 font-medium">Coupon Applied!</p>
                <p className="text-green-700 text-sm">
                  Code: {appliedCoupon.code} - {appliedCoupon.isFreeOrder ? 'Your order is FREE!' : `Discount: ${appliedCoupon.discountAmount.toFixed(2)}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => onApplyCoupon(null)} // Remove coupon
              className="text-green-600 hover:text-green-800 text-sm underline"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => onCouponChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={() => onApplyCoupon(couponCode)}
              disabled={!couponCode.trim() || couponLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {couponLoading ? 'Checking...' : 'Apply'}
            </button>
          </div>
          
          {couponError && (
            <div className="text-red-600 text-sm">{couponError}</div>
          )}
          
          <p className="text-gray-500 text-sm">
            Enter a valid coupon code to receive a discount on your order.
          </p>
        </div>
      )}
    </div>
  </div>
));

// Updated Payment Step
const PaymentStep = React.memo(({ 
  totals,
  appliedCoupon,
  onPaymentSuccess,
  onPaymentError,
  onFreeOrderSubmit,
  isProcessing,
  formatPrice
}) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold text-gray-900">Payment</h2>
    
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
      <div className="space-y-2 mb-6">
        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span className={appliedCoupon?.isFreeOrder ? 'text-green-600' : ''}>
            {totals.total === 0 ? 'FREE' : formatPrice(totals.total)}
          </span>
        </div>
      </div>

      {appliedCoupon?.isFreeOrder ? (
        // Free Order Section
        <div className="text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <svg className="h-12 w-12 text-green-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-lg font-semibold text-green-800 mb-2">Your Order is Free! 🎉</h4>
            <p className="text-green-700 mb-4">
              Thanks to your coupon code "{appliedCoupon.code}", no payment is required.
            </p>
            <p className="text-sm text-green-600">
              Click the button below to complete your free order.
            </p>
          </div>
          
          <button
            onClick={onFreeOrderSubmit}
            disabled={isProcessing}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 font-medium transition-colors duration-200 disabled:opacity-50"
          >
            {isProcessing ? 'Processing Free Order...' : 'Complete Free Order'}
          </button>
        </div>
      ) : (
        // Payment Section
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
      )}
    </div>
  </div>
));

// Main Component
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { cartItems, cartSummary, forceRefreshCart } = useCart();  
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingError, setProcessingError] = useState(null);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);
  
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

  // CALCULATIONS with coupon support
  const totals = useMemo(() => {
    const originalSubtotal = cartSummary.totalPrice;
    const discountAmount = appliedCoupon?.discountAmount || 0;
    const subtotal = Math.max(0, originalSubtotal - discountAmount);
    const shipping = 0;
    const tax = subtotal * 0.13;
    const total = subtotal + shipping + tax;
    
    return { 
      originalSubtotal,
      subtotal, 
      shipping, 
      tax, 
      total,
      discountAmount
    };
  }, [cartSummary.totalPrice, appliedCoupon]);

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

  // Apply coupon function with page refresh
  const applyCoupon = useCallback(async (code) => {
    if (!code) {
      setAppliedCoupon(null);
      setCouponError(null);
      // Force a re-render by updating state
      setCurrentStep(1);
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/.netlify/functions/validate-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          couponCode: code,
          orderTotal: cartSummary.totalPrice,
          cartItems: cartItems
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Coupon validation failed');
      }

      if (result.valid) {
        setAppliedCoupon({
          ...result.coupon,
          discountAmount: result.discountAmount,
          finalTotal: result.finalTotal,
          isFreeOrder: result.isFreeOrder
        });
        setCouponCode('');
        
        // debugLog('COUPON', 'Coupon applied successfully', result);
        
        // Force a page refresh by briefly changing and resetting the step
        setCurrentStep(0);
        setTimeout(() => {
          setCurrentStep(1);
        }, 100);
      }

    } catch (error) {
      setCouponError(error.message);
      debugLog('COUPON', 'Coupon validation failed', { error: error.message });
    } finally {
      setCouponLoading(false);
    }
  }, [cartSummary.totalPrice, cartItems]);

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
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
        }
      } catch (error) {
        debugLog('PROFILE', 'Profile load error', { error: error.message });
      }
    };

    loadUserProfile();
  }, [user]);

  // Handlers
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
    return required.every(field => formData.shipping[field]?.trim());
  }, [formData.shipping]);

  const goToStep = useCallback((step) => {
    if (step === 3 && !validateShipping()) {
      alert('Please complete all required shipping fields');
      return;
    }
    setCurrentStep(step);
  }, [validateShipping]);

  // Process order (both free and paid)
  const processOrder = useCallback(async (paymentDetails = null) => {
    setIsProcessing(true);
    setProcessingStep(0);
    setProcessingError(null);
    
    try {
      setProcessingStep(1);
      
      if (!user || !session) {
        throw new Error('User not authenticated');
      }

      const accessToken = session.access_token;
      if (!accessToken) {
        throw new Error('No access token available');
      }

      setProcessingStep(2);
      
      const isFreeOrder = appliedCoupon?.isFreeOrder || false;
      
      const orderRequestData = {
        subtotal: totals.originalSubtotal,
        shipping_cost: totals.shipping,
        tax_amount: totals.tax,
        total_amount: totals.total,
        discount_amount: totals.discountAmount || 0,
        coupon_code: appliedCoupon?.code || null,
        coupon_id: appliedCoupon?.id || null,
        is_free_order: isFreeOrder,
        payment_method: isFreeOrder ? 'free' : 'paypal',
        payment_reference: paymentDetails?.paypalOrderId || null,
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

      setProcessingStep(3);
      
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Refresh cart
      forceRefreshCart().catch(refreshError => {
        debugLog('CART', 'Cart refresh failed, but backend cleared it', { 
          error: refreshError.message 
        });
      });

      // UPDATED: Determine redirect path based on user role
      let redirectPath = '/dashboard';
      try {
        const { data: userRole } = await supabase.rpc('get_user_role', {
          user_uuid: user.id
        });
        
        if (userRole === 'admin' || userRole === 'super_admin') {
          redirectPath = '/admin-dashboard';
        }
      } catch (roleError) {
        debugLog('ROLE', 'Failed to get user role, defaulting to user dashboard', { 
          error: roleError.message 
        });
        // Default to user dashboard if role check fails
      }

      // Navigate to appropriate dashboard with success
      window.location.href = `${redirectPath}?order_success=true&order_number=${responseData.order.order_number}`;

    } catch (error) {
      debugLog('ERROR', 'Order processing failed', { error: error.message });
      setProcessingError(error.message);
      setIsProcessing(false);
    }
  }, [totals, formData, cartItems, user, session, appliedCoupon, forceRefreshCart]);

  const handlePaymentSuccess = useCallback(async (paymentDetails) => {
    // debugLog('PAYPAL', 'Payment success received', { paymentDetails });
    await processOrder(paymentDetails);
  }, [processOrder]);

  const handleFreeOrderSubmit = useCallback(async () => {
    debugLog('FREE_ORDER', 'Processing free order');
    await processOrder();
  }, [processOrder]);

  const handlePaymentError = useCallback((error) => {
    debugLog('PAYPAL_ERROR', 'PayPal error occurred', { error: error.message });
    setProcessingError(`PayPal error: ${error.message}`);
  }, []);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ReviewStep 
            cartItems={cartItems} 
            formatPrice={formatPrice} 
            totals={totals} 
            appliedCoupon={appliedCoupon}
            couponCode={couponCode}
            onCouponChange={setCouponCode}
            couponLoading={couponLoading}
            couponError={couponError}
            onApplyCoupon={applyCoupon}
          />
        );
      case 2:
        return (
          <ShippingStep 
            formData={formData} 
            onInputChange={handleInputChange} 
            provinces={provinces}
          />
        );
      case 3:
        return (
          <PaymentStep 
            totals={totals}
            appliedCoupon={appliedCoupon}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onFreeOrderSubmit={handleFreeOrderSubmit}
            isProcessing={isProcessing}
            formatPrice={formatPrice}
          />
        );
      case 0:
        // Temporary loading state during refresh
        return (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
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
            {currentStep > 1 && currentStep !== 0 && (
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
            {currentStep < 3 && currentStep !== 0 && (
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

      {/* Loading Overlay */}
      <PaymentLoadingOverlay 
        isVisible={isProcessing}
        step={processingStep}
        error={processingError}
      />
    </PageLayout>
  );
}