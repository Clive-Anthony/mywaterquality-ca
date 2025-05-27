// src/components/PayPalPayment.jsx - FIXED VERSION
import { useEffect, useRef, useState, useCallback } from 'react';

export default function PayPalPayment({ 
  amount, 
  currency = 'CAD', 
  onSuccess, 
  onError, 
  onCancel,
  disabled = false 
}) {
  const paypalRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const buttonInstanceRef = useRef(null);

  // Cleanup function to destroy PayPal buttons safely
  const cleanupPayPal = useCallback(() => {
    if (buttonInstanceRef.current) {
      try {
        if (typeof buttonInstanceRef.current.close === 'function') {
          buttonInstanceRef.current.close();
        }
      } catch (err) {
        console.log('PayPal cleanup warning:', err.message);
      }
      buttonInstanceRef.current = null;
    }
    
    if (paypalRef.current) {
      paypalRef.current.innerHTML = '';
    }
  }, []);

  // Initialize PayPal buttons
  const initializePayPal = useCallback(() => {
    if (isDestroyed || !window.paypal || !paypalRef.current) {
      return;
    }

    // Clean up any existing buttons first
    cleanupPayPal();

    console.log('Initializing PayPal buttons for amount:', amount);

    try {
      const buttonsComponent = window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal',
          height: 40
        },
        
        createOrder: (data, actions) => {
          console.log('Creating PayPal order for amount:', amount);
          
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: amount.toFixed(2),
                currency_code: currency
              },
              description: 'MyWaterQuality.ca - Water Testing Kit Order'
            }],
            application_context: {
              shipping_preference: 'NO_SHIPPING' // We handle shipping separately
            }
          });
        },
        
        onApprove: async (data, actions) => {
          try {
            console.log('PayPal payment approved:', data);
            
            // Capture the payment on PayPal's servers
            const details = await actions.order.capture();
            console.log('PayPal payment captured:', details);
            
            // Call success handler with payment details
            onSuccess({
              paypalOrderId: data.orderID,
              paypalPaymentId: details.id,
              payerInfo: details.payer,
              amount: details.purchase_units[0].amount,
              status: details.status
            });
            
          } catch (error) {
            console.error('Error capturing PayPal payment:', error);
            onError(error);
          }
        },
        
        onError: (err) => {
          console.error('PayPal payment error:', err);
          onError(err);
        },
        
        onCancel: (data) => {
          console.log('PayPal payment cancelled:', data);
          onCancel(data);
        }
      });

      // Render the buttons and store the instance
      buttonsComponent.render(paypalRef.current).then((instance) => {
        if (!isDestroyed) {
          buttonInstanceRef.current = instance;
          setIsLoading(false);
          setError(null);
          console.log('PayPal buttons rendered successfully');
        }
      }).catch((err) => {
        if (!isDestroyed) {
          console.error('Error rendering PayPal buttons:', err);
          
          // Handle specific zoid errors more gracefully
          if (err.message?.includes('zoid destroyed') || err.message?.includes('destroyed all components')) {
            console.log('PayPal component destroyed during initialization, retrying...');
            
            // Retry after a short delay
            setTimeout(() => {
              if (!isDestroyed && paypalRef.current) {
                initializePayPal();
              }
            }, 1000);
          } else {
            setError('Failed to initialize PayPal buttons. Please refresh the page.');
            setIsLoading(false);
          }
        }
      });

    } catch (initError) {
      if (!isDestroyed) {
        console.error('PayPal initialization error:', initError);
        setError('Failed to initialize PayPal. Please refresh the page.');
        setIsLoading(false);
      }
    }
  }, [amount, currency, onSuccess, onError, onCancel, isDestroyed, cleanupPayPal]);

  // Load PayPal SDK
  useEffect(() => {
    if (disabled || isDestroyed) {
      return;
    }

    const loadPayPalScript = async () => {
      try {
        // Check if PayPal script is already loaded
        if (window.paypal && !paypalLoaded) {
          setPaypalLoaded(true);
          initializePayPal();
          return;
        }

        if (paypalLoaded) {
          initializePayPal();
          return;
        }

        // Load PayPal SDK
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
        if (!clientId) {
          throw new Error('PayPal Client ID not configured');
        }

        // Check if script already exists
        const existingScript = document.querySelector(`script[src*="paypal.com/sdk/js"]`);
        if (existingScript) {
          // Wait for existing script to load
          if (window.paypal) {
            setPaypalLoaded(true);
            initializePayPal();
          } else {
            existingScript.onload = () => {
              if (!isDestroyed) {
                setPaypalLoaded(true);
                initializePayPal();
              }
            };
          }
          return;
        }

        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&components=buttons`;
        script.async = true;
        
        script.onload = () => {
          if (!isDestroyed) {
            console.log('PayPal SDK loaded successfully');
            setPaypalLoaded(true);
            initializePayPal();
          }
        };
        
        script.onerror = () => {
          if (!isDestroyed) {
            setError('Failed to load PayPal SDK');
            setIsLoading(false);
          }
        };

        document.head.appendChild(script);

      } catch (err) {
        if (!isDestroyed) {
          console.error('Error loading PayPal:', err);
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    loadPayPalScript();
  }, [disabled, paypalLoaded, initializePayPal, isDestroyed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsDestroyed(true);
      cleanupPayPal();
    };
  }, [cleanupPayPal]);

  // Re-initialize when amount changes
  useEffect(() => {
    if (paypalLoaded && !disabled && !isDestroyed) {
      initializePayPal();
    }
  }, [amount, paypalLoaded, disabled, initializePayPal, isDestroyed]);

  if (disabled) {
    return (
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-8 text-center">
        <p className="text-gray-500">Complete shipping information to enable PayPal payment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">PayPal Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                setIsLoading(true);
                initializePayPal();
              }}
              className="text-sm text-red-800 underline mt-2 hover:text-red-900"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="paypal-payment-container">
      {isLoading && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PayPal...</p>
        </div>
      )}
      
      <div 
        ref={paypalRef} 
        className={`paypal-buttons ${isLoading ? 'hidden' : ''}`}
        style={{ minHeight: isLoading ? '0' : '50px' }}
      />
      
      {!isLoading && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            By clicking the PayPal button, you agree to our terms of service and privacy policy.
          </p>
        </div>
      )}
    </div>
  );
}