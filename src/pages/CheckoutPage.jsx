// src/pages/CheckoutPage.jsx - FIXED VERSION with robust order processing
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import PageLayout from '../components/PageLayout';
import PayPalPayment from '../components/PayPalPayment';
import { supabase } from '../lib/supabaseClient';

// SIMPLIFIED LOADING OVERLAY
const PaymentLoadingOverlay = ({ isVisible, step, error, onRetry, onCancel }) => {
  if (!isVisible) return null;

  const steps = [
    'Processing PayPal payment...',
    'Creating your order...',
    'Finalizing details...',
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
            <div className="flex space-x-3">
              <button
                onClick={onRetry}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
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
            <p className="text-xs text-gray-500 mt-4">Please don't close this window...</p>
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

// SIMPLIFIED STEP COMPONENTS (keeping the existing ones but with minimal changes)
const ReviewStep = React.memo(({ cartItems, formatPrice, totals, onQuantityUpdate }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold text-gray-900">Review Your Order</h2>
    
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Items ({cartItems.length})</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {cartItems.map((item) => (
          <div key={item.item_id} className="p-6 flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">{item.test_kits.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{item.test_kits.description}</p>
              <p className="text-sm text-gray-900 mt-1">{formatPrice(item.test_kits.price)} each</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm">Qty: {item.quantity}</span>
              <span className="text-sm font-medium">{formatPrice(item.quantity * item.test_kits.price)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span>Free</span>
        </div>
        <div className="flex justify-between">
          <span>Tax (HST)</span>
          <span>{formatPrice(totals.tax)}</span>
        </div>
        <div className="border-t border-gray-200 pt-2">
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
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
    
    <div className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
          <input
            type="text"
            required
            value={formData.shipping.firstName}
            onChange={(e) => onInputChange('shipping', 'firstName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
          <input
            type="text"
            required
            value={formData.shipping.lastName}
            onChange={(e) => onInputChange('shipping', 'lastName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
          <input
            type="email"
            required
            value={formData.shipping.email}
            onChange={(e) => onInputChange('shipping', 'email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
          <input
            type="text"
            required
            value={formData.shipping.address}
            onChange={(e) => onInputChange('shipping', 'address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
          <input
            type="text"
            required
            value={formData.shipping.city}
            onChange={(e) => onInputChange('shipping', 'city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
          <select
            required
            value={formData.shipping.province}
            onChange={(e) => onInputChange('shipping', 'province', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {provinces.map(province => (
              <option key={province.value} value={province.value}>
                {province.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
          <input
            type="text"
            required
            value={formData.shipping.postalCode}
            onChange={(e) => onInputChange('shipping', 'postalCode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="K1A 0A6"
          />
        </div>
      </div>
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
        <div className="flex justify-between">
          <span>Items ({cartItems.length})</span>
          <span>{formatPrice(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span>Free</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatPrice(totals.tax)}</span>
        </div>
        <div className="border-t border-gray-200 pt-2">
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>{formatPrice(totals.total)}</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-base font-medium text-gray-900 mb-3">Pay with PayPal</h4>
        <PayPalPayment
          amount={totals.total}
          currency="CAD"
          onSuccess={onPaymentSuccess}
          onError={onPaymentError}
          onCancel={() => console.log('Payment cancelled')}
          disabled={isProcessing}
        />
      </div>
    </div>
  </div>
));

// MAIN COMPONENT
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, cartSummary, clearCart } = useCart();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingError, setProcessingError] = useState(null);
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
    billing: { sameAsShipping: true },
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

  // REDIRECT CHECKS
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (cartSummary.totalItems === 0) {
      navigate('/test-kits');
      return;
    }
  }, [user, cartSummary.totalItems, navigate]);

  // LOAD USER PROFILE
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
        } else {
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
        console.error('Profile load error:', error);
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

  // SIMPLIFIED VALIDATION
  const validateShipping = useCallback(() => {
    const required = ['firstName', 'lastName', 'email', 'address', 'city', 'province', 'postalCode'];
    return required.every(field => formData.shipping[field]?.trim());
  }, [formData.shipping]);

  // NAVIGATION
  const goToStep = useCallback((step) => {
    if (step === 3 && !validateShipping()) {
      alert('Please complete all required shipping fields');
      return;
    }
    setCurrentStep(step);
  }, [validateShipping]);

  // SIMPLIFIED PAYMENT SUCCESS HANDLER
  const handlePaymentSuccess = useCallback(async (paymentDetails) => {
    console.log('💳 Payment successful:', paymentDetails.paypalOrderId);
    
    setIsProcessing(true);
    setProcessingError(null);
    setProcessingStep(0);
    
    try {
      setProcessingStep(1); // Creating order

      const orderRequestData = {
        subtotal: totals.subtotal,
        shipping_cost: totals.shipping,
        tax_amount: totals.tax,
        total_amount: totals.total,
        payment_method: 'paypal',
        payment_reference: paymentDetails.paypalOrderId,
        shipping_address: formData.shipping,
        billing_address: formData.shipping, // Same as shipping for now
        special_instructions: formData.specialInstructions || null,
        items: cartItems.map(item => ({
          test_kit_id: item.test_kit_id,
          quantity: item.quantity,
          unit_price: item.test_kits.price,
          product_name: item.test_kits.name,
          product_description: item.test_kits.description
        }))
      };

      console.log('📤 Sending order to backend...');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication session expired');
      }

      setProcessingStep(2); // Finalizing

      const response = await fetch('/.netlify/functions/process-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(orderRequestData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Server error: ${response.status}`);
      }

      console.log('✅ Order created:', responseData.order.order_number);
      
      setProcessingStep(3); // Complete
      setOrderData(responseData.order);
      
      // Clear cart and show success
      await clearCart();
      
      setIsProcessing(false);
      setShowSuccess(true);

    } catch (error) {
      console.error('❌ Order processing failed:', error);
      setProcessingError(error.message);
      setIsProcessing(false);
    }
  }, [totals, formData, cartItems, clearCart]);

  const handlePaymentError = useCallback((error) => {
    console.error('PayPal error:', error);
    setProcessingError('Payment failed. Please try again.');
  }, []);

  // RETRY AND CANCEL
  const handleRetry = useCallback(() => {
    setIsProcessing(false);
    setProcessingError(null);
    setProcessingStep(0);
  }, []);

  const handleCancel = useCallback(() => {
    setIsProcessing(false);
    setProcessingError(null);
    setProcessingStep(0);
  }, []);

  const goToDashboard = useCallback(() => {
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
        onRetry={handleRetry}
        onCancel={handleCancel}
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