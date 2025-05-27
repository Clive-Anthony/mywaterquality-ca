// src/pages/CheckoutPage.jsx - COMPLETE FILE WITH PAYPAL INTEGRATION
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import PageLayout from '../components/PageLayout';
import PayPalPayment from '../components/PayPalPayment';
import { supabase } from '../lib/supabaseClient';

// STEP COMPONENTS MOVED OUTSIDE TO PREVENT RE-CREATION ON EVERY RENDER

// Review Step Component
const ReviewStep = ({ 
  cartItems, 
  cartSummary, 
  handleQuantityUpdate, 
  formatPrice, 
  calculateShipping, 
  calculateTax, 
  calculateTotal 
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
          <span>{formatPrice(cartSummary.totalPrice)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span>{calculateShipping() === 0 ? 'Free' : formatPrice(calculateShipping())}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax (HST)</span>
          <span>{formatPrice(calculateTax())}</span>
        </div>
        <div className="border-t border-gray-200 pt-2">
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>{formatPrice(calculateTotal())}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Shipping Step Component
const ShippingStep = ({ formData, handleInputChange, provinces }) => (
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
);

// Payment Step Component - UPDATED WITH PAYPAL
const PaymentStep = ({ 
  formData, 
  cartItems, 
  cartSummary, 
  formatPrice, 
  calculateShipping, 
  calculateTax, 
  calculateTotal,
  onPaymentSuccess,
  paymentLoading
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
          <span>{formatPrice(cartSummary.totalPrice)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Shipping</span>
          <span>{calculateShipping() === 0 ? 'Free' : formatPrice(calculateShipping())}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tax (HST)</span>
          <span>{formatPrice(calculateTax())}</span>
        </div>
        <div className="border-t border-gray-200 pt-2">
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>{formatPrice(calculateTotal())}</span>
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
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.190c-.524 0-.968.382-1.05.9l-1.12 7.106H9.59a.641.641 0 0 0 .633.74h3.445a.75.75 0 0 0 .741-.640l.969-6.149a.75.75 0 0 1 .741-.64h1.562c3.797 0 6.765-1.544 7.635-6.008.294-1.506.042-2.707-.594-3.563z"/>
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

        <PayPalPayment
          amount={calculateTotal()}
          currency="CAD"
          onSuccess={onPaymentSuccess}
          onError={(error) => {
            console.error('PayPal payment error:', error);
            alert('Payment failed. Please try again.');
          }}
          onCancel={() => {
            console.log('Payment cancelled by user');
          }}
          disabled={paymentLoading}
        />
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
);

// Confirmation Step Component
const ConfirmationStep = ({ orderConfirmation, formatPrice }) => (
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
);

// MAIN COMPONENT WITH PAYPAL INTEGRATION
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, cartSummary, updateCartItemQuantity, removeFromCart, clearCart } = useCart();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  
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

  // Load user profile data
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
          // Pre-populate form with profile data
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

  // Canadian provinces
  const provinces = [
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
  ];

  // Format price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(price);
  };

  // Calculate shipping (free for now, but structure for future)
  const calculateShipping = () => {
    return 0; // Free shipping
  };

  // Calculate tax (simplified - in real implementation, this would be based on province)
  const calculateTax = () => {
    const subtotal = cartSummary.totalPrice;
    const taxRate = 0.13; // 13% HST for Ontario (would need to be dynamic based on province)
    return subtotal * taxRate;
  };

  // Calculate final total
  const calculateTotal = () => {
    return cartSummary.totalPrice + calculateShipping() + calculateTax();
  };

  // Handle form input changes
  const handleInputChange = (section, field, value) => {
    if (section === 'root') {
      // Handle root-level fields like specialInstructions
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    } else {
      // Handle nested fields like shipping.firstName
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    }
  };

  // Handle quantity updates
  const handleQuantityUpdate = async (itemId, newQuantity) => {
    try {
      if (newQuantity <= 0) {
        await removeFromCart(itemId);
      } else {
        await updateCartItemQuantity(itemId, newQuantity);
      }
    } catch (error) {
      setError('Failed to update cart. Please try again.');
    }
  };

  // Validate shipping form
  const validateShippingForm = () => {
    const { shipping } = formData;
    const requiredFields = ['firstName', 'lastName', 'email', 'address', 'city', 'province', 'postalCode'];
    
    for (const field of requiredFields) {
      if (!shipping[field] || shipping[field].trim() === '') {
        setError(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    // Validate postal code format
    if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(shipping.postalCode)) {
      setError('Please enter a valid Canadian postal code');
      return false;
    }

    return true;
  };

  // Handle step navigation
  const goToNextStep = () => {
    setError(null);
    
    if (currentStep === 2) {
      if (!validateShippingForm()) {
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // PAYPAL PAYMENT SUCCESS HANDLER
  const handlePaymentSuccess = async (paymentDetails) => {
    console.log('Payment successful:', paymentDetails);
    setPaymentData(paymentDetails);
    setPaymentLoading(true);
    
    try {
      // Process the order with PayPal payment data
      await processOrderWithPayment(paymentDetails);
    } catch (error) {
      console.error('Error processing order after payment:', error);
      setError('Payment successful but order processing failed. Please contact support.');
      setPaymentLoading(false);
    }
  };

  // Process order with PayPal payment verification
  const processOrderWithPayment = async (paymentDetails) => {
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
        subtotal: cartSummary.totalPrice,
        shipping_cost: calculateShipping(),
        tax_amount: calculateTax(),
        total_amount: calculateTotal(),
        shipping_address: formData.shipping,
        billing_address: formData.billing.sameAsShipping ? formData.shipping : formData.billing,
        special_instructions: formData.specialInstructions,
        payment_method: 'paypal',
        payment_data: paymentDetails, // Include PayPal payment details
        items: orderItems
      };

      console.log('Processing order with PayPal payment:', orderData);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No valid session found. Please log in again.');
      }

      const response = await fetch('/.netlify/functions/process-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(orderData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Server error: ${response.status}`);
      }

      console.log('Order processed successfully:', responseData);
      
      await clearCart();
      setOrderConfirmation(responseData.order);
      setCurrentStep(4);
      
    } catch (error) {
      console.error('Order processing error:', error);
      setError(error.message || 'Failed to process order. Please try again.');
      
      // If order processing fails after payment, we need to handle this carefully
      if (paymentDetails) {
        setError(`Payment successful (${paymentDetails.paypalOrderId}) but order processing failed. Please contact support with this reference number.`);
      }
    } finally {
      setLoading(false);
      setPaymentLoading(false);
    }
  };

  // Render step content using stable components
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ReviewStep 
            cartItems={cartItems}
            cartSummary={cartSummary}
            handleQuantityUpdate={handleQuantityUpdate}
            formatPrice={formatPrice}
            calculateShipping={calculateShipping}
            calculateTax={calculateTax}
            calculateTotal={calculateTotal}
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
            cartSummary={cartSummary}
            formatPrice={formatPrice}
            calculateShipping={calculateShipping}
            calculateTax={calculateTax}
            calculateTotal={calculateTotal}
            onPaymentSuccess={handlePaymentSuccess}
            paymentLoading={paymentLoading}
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
            calculateShipping={calculateShipping}
            calculateTax={calculateTax}
            calculateTotal={calculateTotal}
          />
        );
    }
  };

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

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons - UPDATED FOR PAYPAL FLOW */}
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
                // Step 3 (Payment) - PayPal handles the final submission
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
    </PageLayout>
  );
}