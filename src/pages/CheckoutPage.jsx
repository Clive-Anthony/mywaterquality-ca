// src/pages/CheckoutPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import PageLayout from '../components/PageLayout';
import { supabase } from '../lib/supabaseClient';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, cartSummary, updateCartItemQuantity, removeFromCart, clearCart } = useCart();
  
  const [currentStep, setCurrentStep] = useState(1); // 1: Review, 2: Shipping, 3: Payment, 4: Confirmation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [orderConfirmation, setOrderConfirmation] = useState(null);
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
          // No profile, use user metadata
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
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
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

  // Process order through Netlify function
  const processOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      // Convert cart items to order items format
      const orderItems = cartItems.map(item => ({
        test_kit_id: item.test_kit_id,
        quantity: item.quantity,
        unit_price: item.test_kits.price,
        product_name: item.test_kits.name,
        product_description: item.test_kits.description
      }));

      // Prepare order data
      const orderData = {
        subtotal: cartSummary.totalPrice,
        shipping_cost: calculateShipping(),
        tax_amount: calculateTax(),
        total_amount: calculateTotal(),
        shipping_address: formData.shipping,
        billing_address: formData.billing.sameAsShipping ? formData.shipping : formData.billing,
        special_instructions: formData.specialInstructions,
        payment_method: 'demo', // For now, until Stripe is integrated
        items: orderItems
      };

      console.log('Processing order with data:', orderData);

      // Get user session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No valid session found. Please log in again.');
      }

      // Call Netlify function to process order
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
      
      // Clear cart on successful order
      await clearCart();
      
      // Store order info for confirmation page
      setOrderConfirmation(responseData.order);
      
      // Go to confirmation step
      setCurrentStep(4);
      
    } catch (error) {
      console.error('Order processing error:', error);
      setError(error.message || 'Failed to process order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ReviewStep />;
      case 2:
        return <ShippingStep />;
      case 3:
        return <PaymentStep />;
      case 4:
        return <ConfirmationStep />;
      default:
        return <ReviewStep />;
    }
  };

  // Review Step Component
  const ReviewStep = () => (
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
  const ShippingStep = () => (
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
            onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any special delivery instructions..."
          />
        </div>
      </div>
    </div>
  );

  // Payment Step Component
  const PaymentStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Payment Integration Coming Soon</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Stripe payment integration will be added in the next phase. For now, you can complete the order as a demo.
            </p>
          </div>
        </div>
      </div>

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
    </div>
  );

  // Confirmation Step Component
  const ConfirmationStep = () => (
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

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="flex justify-between">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={goToPreviousStep}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
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
                <button
                  onClick={processOrder}
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Complete Order'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}