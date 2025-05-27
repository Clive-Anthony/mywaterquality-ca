// src/pages/CheckoutPage.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import PageLayout from '../components/PageLayout';
import PayPalPayment from '../components/PayPalPayment';
import { supabase } from '../lib/supabaseClient';

// ENHANCED LOADING OVERLAY COMPONENT
const PaymentLoadingOverlay = ({ paymentLoading, paymentData }) => {
  if (!paymentLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Your Payment</h3>
        <p className="text-gray-600 mb-4">
          Please don't close this window. We're processing your order...
        </p>
        {paymentData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">
              ✅ PayPal payment successful
            </p>
            <p className="text-xs text-green-600 mt-1">
              Reference: {paymentData.paypalOrderId}
            </p>
          </div>
        )}
        <div className="text-xs text-gray-500">
          This usually takes 10-30 seconds...
        </div>
      </div>
    </div>
  );
};

// PAYPAL ERROR BOUNDARY COMPONENT
const PayPalErrorBoundary = ({ children, onError }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (event) => {
      if (event.error && event.error.message?.includes('paypal')) {
        setHasError(true);
        setError(event.error);
        onError?.(event.error);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);

  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-sm font-medium text-red-800">PayPal Loading Error</h3>
        </div>
        <p className="text-sm text-red-700 mb-3">
          There was an issue loading the PayPal payment option. Please try refreshing the page.
        </p>
        <button
          onClick={() => {
            setHasError(false);
            setError(null);
            window.location.reload();
          }}
          className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return children;
};

// SUCCESS NOTIFICATION COMPONENT
const OrderSuccessNotification = ({ show, orderConfirmation, onClose }) => {
  useEffect(() => {
    if (show) {
      // Auto-close after 10 seconds
      const timer = setTimeout(onClose, 10000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-green-800">
            Order Confirmed!
          </h3>
          <p className="mt-1 text-sm text-green-700">
            Order #{orderConfirmation?.order_number} has been processed successfully.
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="text-green-400 hover:text-green-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// MEMOIZED STEP COMPONENTS TO PREVENT UNNECESSARY RE-RENDERS

// Review Step Component - Memoized
const ReviewStep = React.memo(({ 
  cartItems, 
  cartSummary, 
  handleQuantityUpdate, 
  formatPrice, 
  totals 
}) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold text-gray-900">Review Your Order</h2>
    
    {/* Cart Items */}
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Items in Your Cart</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {cartItems.map((item) => (
          <div key={item.item_id} className="p-6 flex items-center space-x-4">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900">{item.test_kits.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{item.test_kits.description}</p>
              <p className="text-sm text-gray-900 mt-1">{formatPrice(item.test_kits.price)} each</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleQuantityUpdate(item.item_id, item.quantity - 1)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <button
                onClick={() => handleQuantityUpdate(item.item_id, item.quantity + 1)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
              >
                +
              </button>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {formatPrice(item.quantity * item.test_kits.price)}
              </p>
              <button
                onClick={() => handleQuantityUpdate(item.item_id, 0)}
                className="text-xs text-red-600 hover:text-red-800 mt-1"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Order Summary */}
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span>{totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}</span>
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

// Shipping Step Component - Memoized
const ShippingStep = React.memo(({ formData, handleInputChange, provinces }) => (
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
            onChange={(e) => handleInputChange('shipping', 'firstName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
          <input
            type="text"
            required
            value={formData.shipping.lastName}
            onChange={(e) => handleInputChange('shipping', 'lastName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
          <input
            type="email"
            required
            value={formData.shipping.email}
            onChange={(e) => handleInputChange('shipping', 'email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            value={formData.shipping.phone}
            onChange={(e) => handleInputChange('shipping', 'phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
          <input
            type="text"
            required
            value={formData.shipping.address}
            onChange={(e) => handleInputChange('shipping', 'address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
          <input
            type="text"
            required
            value={formData.shipping.city}
            onChange={(e) => handleInputChange('shipping', 'city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
          <select
            required
            value={formData.shipping.province}
            onChange={(e) => handleInputChange('shipping', 'province', e.target.value)}
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
            onChange={(e) => handleInputChange('shipping', 'postalCode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="K1A 0A6"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <input
            type="text"
            value={formData.shipping.country}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
          />
        </div>
      </div>
      
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (Optional)</label>
        <textarea
          rows={3}
          value={formData.specialInstructions}
          onChange={(e) => handleInputChange('root', 'specialInstructions', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Any special delivery instructions..."
        />
      </div>
    </div>
  </div>
));

// Payment Step Component - Memoized with stable PayPal props
const PaymentStep = React.memo(({ 
  formData, 
  cartItems, 
  formatPrice, 
  totals,
  onPaymentSuccess,
  paymentLoading,
  onPayPalError
}) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
    
    {/* Order Summary */}
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Final Order Summary</h3>
      
      {/* Shipping Address */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Shipping Address</h4>
        <div className="text-sm text-gray-600">
          <p>{formData.shipping.firstName} {formData.shipping.lastName}</p>
          <p>{formData.shipping.address}</p>
          <p>{formData.shipping.city}, {formData.shipping.province} {formData.shipping.postalCode}</p>
          <p>{formData.shipping.country}</p>
          <p>{formData.shipping.email}</p>
          {formData.shipping.phone && <p>{formData.shipping.phone}</p>}
        </div>
      </div>

      {/* Items */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Items</h4>
        <div className="space-y-2">
          {cartItems.map((item) => (
            <div key={item.item_id} className="flex justify-between text-sm">
              <span>{item.test_kits.name} × {item.quantity}</span>
              <span>{formatPrice(item.quantity * item.test_kits.price)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatPrice(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Shipping</span>
          <span>{totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}</span>
        </div>
        <div className="flex justify-between text-sm">
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

    {/* Payment Methods */}
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Payment Method</h3>
      
      {/* PayPal Payment */}
      <div className="mb-6">
        <div className="flex items-center mb-3">
          <svg className="h-6 w-6 text-blue-600 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.190c-.524 0-.968.382-1.05.9l-1.12 7.106H9.59a.641.641 0 0 0 .633.74h3.445a.75.75 0 0 0 .741-.640l.969-6.149a.75.75 0 0 1 .741-.640h1.562c3.797 0 6.765-1.544 7.635-6.008.294-1.506.042-2.707-.594-3.563z"/>
          </svg>
          <h4 className="text-base font-medium text-gray-900">Pay with PayPal</h4>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h5 className="text-sm font-medium text-blue-800">Secure Payment</h5>
              <p className="text-sm text-blue-700 mt-1">
                Pay securely with PayPal. You can use your PayPal balance, bank account, or credit card.
              </p>
            </div>
          </div>
        </div>

        {/* ENHANCED PAYPAL COMPONENT WITH ERROR BOUNDARY */}
        <PayPalErrorBoundary onError={onPayPalError}>
          <PayPalPayment
            amount={totals.total}
            currency="CAD"
            onSuccess={onPaymentSuccess}
            onError={(error) => {
              console.error('PayPal payment error:', error);
              onPayPalError(error);
            }}
            onCancel={() => {
              console.log('Payment cancelled by user');
            }}
            disabled={paymentLoading}
          />
        </PayPalErrorBoundary>
      </div>

      {/* Alternative Payment Methods (Future) */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Other Payment Methods</h4>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p className="text-sm text-gray-600">
                Credit card payments coming soon. Currently accepting PayPal only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Security Notice */}
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start">
        <svg className="h-5 w-5 text-green-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <div>
          <h5 className="text-sm font-medium text-green-800">Secure & Protected</h5>
          <p className="text-sm text-green-700 mt-1">
            Your payment information is encrypted and secure. We never store your payment details.
          </p>
        </div>
      </div>
    </div>
  </div>
));

// Confirmation Step Component - Memoized
const ConfirmationStep = React.memo(({ orderConfirmation, formatPrice }) => (
  <div className="space-y-6 text-center">
    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
      <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Order Confirmed!</h2>
      <p className="mt-2 text-gray-600">
        Thank you for your order. You will receive a confirmation email shortly.
      </p>
      {orderConfirmation && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Order Number:</strong> {orderConfirmation.order_number}
          </p>
          <p className="text-sm text-blue-800">
            <strong>Total:</strong> {formatPrice(orderConfirmation.total_amount)}
          </p>
          {orderConfirmation.payment_method === 'paypal' && (
            <p className="text-sm text-blue-800">
              <strong>Payment Method:</strong> PayPal
            </p>
          )}
        </div>
      )}
    </div>

    <div className="bg-green-50 rounded-lg p-6">
      <h3 className="text-lg font-medium text-green-800 mb-2">What's Next?</h3>
      <div className="text-sm text-green-700 space-y-2 text-left max-w-md mx-auto">
        <p>1. You'll receive your water testing kit within 3-5 business days</p>
        <p>2. Follow the included instructions to collect your water sample</p>
        <p>3. Ship your sample back using the prepaid label</p>
        <p>4. Receive your detailed results within 5-7 business days</p>
      </div>
    </div>

    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Link
        to="/dashboard"
        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
      >
        Go to Dashboard
      </Link>
      <Link
        to="/test-kits"
        className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
      >
        Continue Shopping
      </Link>
    </div>
  </div>
));

// MAIN COMPONENT WITH OPTIMIZATIONS
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, cartSummary, updateCartItemQuantity, removeFromCart, clearCart } = useCart();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  
  // PAYPAL SPECIFIC STATE
  const [paymentData, setPaymentData] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
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
    billing: {
      sameAsShipping: true,
      firstName: '',
      lastName: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Canada'
    },
    specialInstructions: ''
  });

  // MEMOIZED CALCULATIONS TO PREVENT UNNECESSARY RE-RENDERS
  const totals = useMemo(() => {
    const subtotal = cartSummary.totalPrice;
    const shipping = 0; // Free shipping
    const tax = subtotal * 0.13; // 13% HST for Ontario
    const total = subtotal + shipping + tax;
    
    return {
      subtotal,
      shipping,
      tax,
      total
    };
  }, [cartSummary.totalPrice]);

  // MEMOIZED FORMAT PRICE FUNCTION
  const formatPrice = useCallback((price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(price);
  }, []);

  // STABLE PROVINCES ARRAY
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

  // Redirect if cart is empty or user not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login', { 
        state: { message: 'Please log in to continue with checkout' }
      });
      return;
    }

    if (cartSummary.totalItems === 0) {
      navigate('/test-kits', { 
        state: { message: 'Your cart is empty. Please add items before checkout.' }
      });
      return;
    }
  }, [user, cartSummary.totalItems, navigate]);

  // Load user profile data (only once)
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading profile:', error);
          return;
        }

        if (data) {
          setUserProfile(data);
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
        console.error('Exception loading profile:', error);
      }
    };

    loadUserProfile();
  }, [user]);

  // STABLE CALLBACK FUNCTIONS
  const handleInputChange = useCallback((section, field, value) => {
    if (section === 'root') {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    }
  }, []);

  const handleQuantityUpdate = useCallback(async (itemId, newQuantity) => {
    try {
      if (newQuantity <= 0) {
        await removeFromCart(itemId);
      } else {
        await updateCartItemQuantity(itemId, newQuantity);
      }
    } catch (error) {
      setError('Failed to update cart. Please try again.');
    }
  }, [removeFromCart, updateCartItemQuantity]);

  // Validate shipping form
  const validateShippingForm = useCallback(() => {
    const { shipping } = formData;
    const requiredFields = ['firstName', 'lastName', 'email', 'address', 'city', 'province', 'postalCode'];
    
    for (const field of requiredFields) {
      if (!shipping[field] || shipping[field].trim() === '') {
        setError(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(shipping.postalCode)) {
      setError('Please enter a valid Canadian postal code');
      return false;
    }

    return true;
  }, [formData]);

  // Handle step navigation
  const goToNextStep = useCallback(() => {
    setError(null);
    
    if (currentStep === 2) {
      if (!validateShippingForm()) {
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 4));
  }, [currentStep, validateShippingForm]);

  const goToPreviousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  // ENHANCED PAYPAL SUCCESS HANDLER WITH TIMEOUT PROTECTION
  const handlePaymentSuccess = useCallback(async (paymentDetails) => {
    console.log('🎉 Payment successful:', paymentDetails);
    setPaymentData(paymentDetails);
    setPaymentLoading(true);
    
    try {
      await processOrderWithPayment(paymentDetails);
    } catch (error) {
      console.error('💥 Error processing order after payment:', error);
      setError('Payment successful but order processing failed. Please contact support.');
      setPaymentLoading(false);
    }
  }, []);

  // ENHANCED PAYPAL ERROR HANDLER
  const handlePayPalError = useCallback((error) => {
    console.error('PayPal error:', error);
    setPaymentLoading(false);
    
    let errorMessage = 'Payment failed. Please try again.';
    
    if (error.message?.includes('container element removed')) {
      errorMessage = 'PayPal interface issue. Please refresh the page and try again.';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Payment timed out. Please try again.';
    } else if (error.message?.includes('cancelled')) {
      errorMessage = 'Payment was cancelled. You can try again when ready.';
    }
    
    setError(errorMessage);
  }, []);

  // ENHANCED PROCESS ORDER WITH PAYMENT VERIFICATION AND TIMEOUT PROTECTION
  const processOrderWithPayment = useCallback(async (paymentDetails) => {
    console.log('🚀 Starting order processing with payment details:', paymentDetails);
    setLoading(true);
    setError(null);

    try {
      const orderItems = cartItems.map(item => ({
        test_kit_id: item.test_kit_id,
        quantity: item.quantity,
        unit_price: item.test_kits.price,
        product_name: item.test_kits.name,
        product_description: item.test_kits.description
      }));

      const orderData = {
        subtotal: totals.subtotal,
        shipping_cost: totals.shipping,
        tax_amount: totals.tax,
        total_amount: totals.total,
        shipping_address: formData.shipping,
        billing_address: formData.billing.sameAsShipping ? formData.shipping : formData.billing,
        special_instructions: formData.specialInstructions,
        payment_method: 'paypal',
        payment_reference: paymentDetails.paypalOrderId,
        items: orderItems
      };

      console.log('📋 Order data prepared:', {
        total: orderData.total_amount,
        items: orderData.items.length,
        payment_method: orderData.payment_method,
        payment_reference: orderData.payment_reference
      });

      // Get fresh session token
      console.log('🔑 Getting authentication session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Session error:', sessionError);
        throw new Error('Authentication session expired. Please refresh the page and try again.');
      }
      
      console.log('✅ Session valid, making API call...');

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - please try again')), 30000); // 30 second timeout
      });

      // Make the API call with timeout
      const apiCallPromise = fetch('/.netlify/functions/process-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(orderData)
      });

      console.log('📡 API request sent, waiting for response...');
      
      // Race between API call and timeout
      const response = await Promise.race([apiCallPromise, timeoutPromise]);
      
      console.log('📨 Response received:', response.status, response.statusText);

      // Parse response
      let responseData;
      try {
        const responseText = await response.text();
        console.log('📄 Raw response:', responseText.substring(0, 200) + '...');
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error('Invalid response from server. Please try again.');
      }

      if (!response.ok) {
        console.error('❌ API error response:', responseData);
        throw new Error(responseData.error || responseData.message || `Server error: ${response.status}`);
      }

      console.log('✅ Order processed successfully:', responseData);
      
      // Clear cart
      console.log('🧹 Clearing cart...');
      try {
        await clearCart();
        console.log('✅ Cart cleared successfully');
      } catch (cartError) {
        console.warn('⚠️ Cart clear failed (non-critical):', cartError);
        // Don't fail the whole process if cart clear fails
      }
      
      // Set order confirmation and move to confirmation step
      console.log('🎉 Setting order confirmation and redirecting...');
      setOrderConfirmation(responseData.order);
      setCurrentStep(4);
      setShowSuccessNotification(true);
      
      // Additional success feedback
      console.log('✅ Order processing completed successfully!');
      
    } catch (error) {
      console.error('💥 Order processing error:', error);
      
      // Provide specific error messages
      let errorMessage = error.message || 'Failed to process order. Please try again.';
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'The request is taking longer than expected. Your payment was successful. Please contact support with your PayPal transaction ID: ' + paymentDetails.paypalOrderId;
      } else if (error.message?.includes('Authentication') || error.message?.includes('session')) {
        errorMessage = 'Your session has expired. Please refresh the page and try again.';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network connection issue. Please check your internet and try again.';
      }
      
      setError(errorMessage);
      
      // If we have payment details, show them to user
      if (paymentDetails) {
        setError(`${errorMessage} Your PayPal payment (${paymentDetails.paypalOrderId}) was successful. Please contact support if this issue persists.`);
      }
    } finally {
      console.log('🏁 Order processing finished, resetting loading states...');
      setLoading(false);
      setPaymentLoading(false);
    }
  }, [cartItems, totals, formData, clearCart]);

  // STABLE STEP CONTENT RENDERING
  const renderStepContent = useCallback(() => {
    switch (currentStep) {
      case 1:
        return (
          <ReviewStep 
            cartItems={cartItems}
            cartSummary={cartSummary}
            handleQuantityUpdate={handleQuantityUpdate}
            formatPrice={formatPrice}
            totals={totals}
          />
        );
      case 2:
        return (
          <ShippingStep 
            formData={formData}
            handleInputChange={handleInputChange}
            provinces={provinces}
          />
        );
      case 3:
        return (
          <PaymentStep 
            formData={formData}
            cartItems={cartItems}
            formatPrice={formatPrice}
            totals={totals}
            onPaymentSuccess={handlePaymentSuccess}
            paymentLoading={paymentLoading}
            onPayPalError={handlePayPalError}
          />
        );
      case 4:
        return (
          <ConfirmationStep 
            orderConfirmation={orderConfirmation}
            formatPrice={formatPrice}
          />
        );
      default:
        return (
          <ReviewStep 
            cartItems={cartItems}
            cartSummary={cartSummary}
            handleQuantityUpdate={handleQuantityUpdate}
            formatPrice={formatPrice}
            totals={totals}
          />
        );
    }
  }, [currentStep, cartItems, cartSummary, handleQuantityUpdate, formatPrice, totals, formData, handleInputChange, provinces, handlePaymentSuccess, paymentLoading, handlePayPalError, orderConfirmation]);

  if (!user || cartSummary.totalItems === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-center">
              {[
                { id: 1, name: 'Review', status: currentStep > 1 ? 'complete' : currentStep === 1 ? 'current' : 'upcoming' },
                { id: 2, name: 'Shipping', status: currentStep > 2 ? 'complete' : currentStep === 2 ? 'current' : 'upcoming' },
                { id: 3, name: 'Payment', status: currentStep > 3 ? 'complete' : currentStep === 3 ? 'current' : 'upcoming' },
                { id: 4, name: 'Confirmation', status: currentStep === 4 ? 'current' : 'upcoming' }
              ].map((step, stepIdx) => (
                <li key={step.id} className={`${stepIdx !== 3 ? 'pr-8 sm:pr-20' : ''} relative`}>
                  {step.status === 'complete' ? (
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="h-0.5 w-full bg-blue-600" />
                    </div>
                  ) : step.status === 'current' ? (
                    stepIdx !== 3 && (
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-gray-200" />
                      </div>
                    )
                  ) : (
                    stepIdx !== 3 && (
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-gray-200" />
                      </div>
                    )
                  )}
                  
                  <div className={`relative w-8 h-8 flex items-center justify-center rounded-full ${
                    step.status === 'complete' 
                      ? 'bg-blue-600' 
                      : step.status === 'current' 
                        ? 'border-2 border-blue-600 bg-white' 
                        : 'border-2 border-gray-300 bg-white'
                  }`}>
                    {step.status === 'complete' ? (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className={`text-sm font-medium ${
                        step.status === 'current' ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {step.id}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className={`text-xs font-medium ${
                      step.status === 'current' ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* ENHANCED Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-1">Order Processing Error</h3>
                <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
                {error.includes('PayPal') && (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setError(null)}
                      className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="flex justify-between">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={goToPreviousStep}
                  disabled={paymentLoading}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  ← Previous
                </button>
              )}
            </div>
            <div>
              {currentStep < 3 ? (
                <button
                  onClick={goToNextStep}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Continue →
                </button>
              ) : (
                <div className="text-sm text-gray-500">
                  {paymentLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing payment...
                    </div>
                  ) : (
                    'Complete payment above to finish your order'
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ENHANCED OVERLAYS AND NOTIFICATIONS */}
      <PaymentLoadingOverlay 
        paymentLoading={paymentLoading} 
        paymentData={paymentData} 
      />
      
      <OrderSuccessNotification
        show={showSuccessNotification}
        orderConfirmation={orderConfirmation}
        onClose={() => setShowSuccessNotification(false)}
      />
    </PageLayout>
  );
}