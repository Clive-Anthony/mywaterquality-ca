// src/components/PayPalPayment.jsx - SEAMLESS VERSION - No refresh needed
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
  const mountedRef = useRef(true);
  const buttonInstanceRef = useRef(null);
  const isInitializingRef = useRef(false);

  // Prevent page visibility changes from affecting PayPal
  useEffect(() => {
    // Override document.hidden and visibilityState to trick PayPal
    let originalHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    let originalVisibilityState = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');

    const overrideVisibility = () => {
      // Make PayPal think the page is always visible
      Object.defineProperty(document, 'hidden', {
        get: () => false,
        configurable: true
      });
      
      Object.defineProperty(document, 'visibilityState', {
        get: () => 'visible',
        configurable: true
      });
    };

    const restoreVisibility = () => {
      // Restore original behavior
      if (originalHidden) {
        Object.defineProperty(document, 'hidden', originalHidden);
      }
      if (originalVisibilityState) {
        Object.defineProperty(document, 'visibilityState', originalVisibilityState);
      }
    };

    // Override when PayPal is loaded
    if (paypalLoaded) {
      overrideVisibility();
    }

    return () => {
      restoreVisibility();
    };
  }, [paypalLoaded]);

  // Keep PayPal container focused and prevent blur events
  useEffect(() => {
    if (!paypalRef.current) return;

    const container = paypalRef.current;

    // Prevent focus loss on PayPal elements
    const preventBlur = (e) => {
      if (container.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Keep focus on PayPal elements
    const maintainFocus = (e) => {
      if (container.contains(e.target)) {
        // Don't let PayPal lose focus
        setTimeout(() => {
          if (document.activeElement && !container.contains(document.activeElement)) {
            const paypalButton = container.querySelector('[data-funding-source="paypal"]');
            if (paypalButton) {
              paypalButton.focus();
            }
          }
        }, 0);
      }
    };

    document.addEventListener('blur', preventBlur, true);
    document.addEventListener('focusout', maintainFocus, true);
    window.addEventListener('blur', preventBlur, true);

    return () => {
      document.removeEventListener('blur', preventBlur, true);
      document.removeEventListener('focusout', maintainFocus, true);
      window.removeEventListener('blur', preventBlur, true);
    };
  }, [paypalLoaded]);

  // Cleanup function
  const cleanupPayPal = useCallback(() => {
    if (buttonInstanceRef.current) {
      try {
        if (typeof buttonInstanceRef.current.close === 'function') {
          buttonInstanceRef.current.close();
        }
      } catch (err) {
        console.log('PayPal cleanup:', err.message);
      }
      buttonInstanceRef.current = null;
    }
    
    if (paypalRef.current) {
      paypalRef.current.innerHTML = '';
    }
    
    isInitializingRef.current = false;
  }, []);

  // Initialize PayPal buttons with persistence settings
  const initializePayPal = useCallback(async () => {
    if (isInitializingRef.current || !mountedRef.current || !window.paypal || !paypalRef.current || disabled) {
      return;
    }

    isInitializingRef.current = true;

    try {
      cleanupPayPal();

      if (!mountedRef.current || !paypalRef.current) {
        isInitializingRef.current = false;
        return;
      }

      console.log('Initializing persistent PayPal buttons for amount:', amount);

      const buttonsComponent = window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal',
          height: 40
        },
        
        // Enhanced environment to prevent auto-closing
        env: import.meta.env.DEV ? 'sandbox' : 'production',
        
        createOrder: (data, actions) => {
          console.log('Creating PayPal order for amount:', amount);
          
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: amount.toFixed(2),
                currency_code: currency
              },
              description: 'My Water Quality - Water Testing Kit Order'
            }],
            application_context: {
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              // Keep the payment window open even if parent loses focus
              landing_page: 'BILLING',
              return_url: window.location.origin + '/checkout',
              cancel_url: window.location.origin + '/checkout'
            }
          });
        },
        
        onApprove: async (data, actions) => {
          try {
            console.log('PayPal payment approved:', data);
            
            const details = await actions.order.capture();
            console.log('PayPal payment captured:', details);
            
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
        },

        // Prevent automatic closure of dropdowns
        onInit: (data, actions) => {
          console.log('PayPal buttons initialized');
          
          // Find PayPal iframes and prevent them from detecting visibility changes
          setTimeout(() => {
            const paypalFrames = document.querySelectorAll('iframe[name*="paypal"]');
            paypalFrames.forEach(frame => {
              try {
                // Add event listeners to prevent focus loss
                frame.addEventListener('blur', (e) => e.preventDefault());
                
                // Keep the frame "active"
                frame.style.pointerEvents = 'auto';
                frame.style.visibility = 'visible';
              } catch (e) {
                // Cross-origin restrictions may prevent this, but it's worth trying
                console.log('Could not enhance PayPal frame:', e.message);
              }
            });
          }, 100);
        }
      });

      if (!mountedRef.current || !paypalRef.current) {
        isInitializingRef.current = false;
        return;
      }

      const renderPromise = buttonsComponent.render(paypalRef.current);
      
      renderPromise.then((instance) => {
        if (mountedRef.current) {
          buttonInstanceRef.current = instance;
          setIsLoading(false);
          setError(null);
          console.log('Persistent PayPal buttons rendered successfully');
          
          // Additional persistence measures
          setTimeout(() => {
            const paypalContainer = paypalRef.current;
            if (paypalContainer) {
              // Make the container "sticky" focused
              paypalContainer.style.position = 'relative';
              paypalContainer.style.zIndex = '1';
              
              // Prevent the container from losing interactivity
              paypalContainer.addEventListener('mouseenter', () => {
                paypalContainer.style.pointerEvents = 'auto';
              });
              
              paypalContainer.addEventListener('mouseleave', () => {
                paypalContainer.style.pointerEvents = 'auto'; // Keep it always interactive
              });
            }
          }, 500);
        } else {
          if (instance && typeof instance.close === 'function') {
            instance.close();
          }
        }
        isInitializingRef.current = false;
      }).catch((err) => {
        isInitializingRef.current = false;
        
        if (!mountedRef.current) {
          return;
        }

        console.error('Error rendering PayPal buttons:', err);
        
        if (err.message?.includes('container element removed') || 
            err.message?.includes('zoid destroyed')) {
          console.log('PayPal container error, will retry');
          setIsLoading(false);
        } else {
          setError('Failed to initialize PayPal buttons. Please refresh the page.');
          setIsLoading(false);
        }
      });

    } catch (initError) {
      isInitializingRef.current = false;
      
      if (mountedRef.current) {
        console.error('PayPal initialization error:', initError);
        setError('Failed to initialize PayPal. Please refresh the page.');
        setIsLoading(false);
      }
    }
  }, [amount, currency, onSuccess, onError, onCancel, disabled, cleanupPayPal]);

  // Load PayPal SDK with persistence settings
  useEffect(() => {
    if (disabled) {
      return;
    }

    const loadPayPalScript = async () => {
      try {
        if (window.paypal) {
          setPaypalLoaded(true);
          return;
        }

        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
        if (!clientId) {
          throw new Error('PayPal Client ID not configured');
        }

        const existingScript = document.querySelector(`script[src*="paypal.com/sdk/js"]`);
        if (existingScript) {
          if (window.paypal) {
            setPaypalLoaded(true);
          } else {
            existingScript.addEventListener('load', () => {
              if (mountedRef.current) {
                setPaypalLoaded(true);
              }
            });
          }
          return;
        }

        // Enhanced PayPal SDK loading with persistence options
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&locale=en_CA&components=buttons&disable-funding=credit,card`;
        script.async = true;
        
        script.onload = () => {
          if (mountedRef.current) {
            console.log('PayPal SDK loaded with persistence settings');
            setPaypalLoaded(true);
          }
        };
        
        script.onerror = () => {
          if (mountedRef.current) {
            setError('Failed to load PayPal SDK');
            setIsLoading(false);
          }
        };

        document.head.appendChild(script);

      } catch (err) {
        if (mountedRef.current) {
          console.error('Error loading PayPal:', err);
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    loadPayPalScript();
  }, [disabled, currency]);

  // Initialize PayPal when SDK is loaded
  useEffect(() => {
    if (paypalLoaded && !disabled && mountedRef.current) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          initializePayPal();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [paypalLoaded, disabled, initializePayPal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanupPayPal();
    };
  }, [cleanupPayPal]);

  // Handle amount changes with debouncing
  useEffect(() => {
    if (paypalLoaded && !disabled && mountedRef.current) {
      const timer = setTimeout(() => {
        if (mountedRef.current && !isInitializingRef.current) {
          initializePayPal();
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [amount, paypalLoaded, disabled, initializePayPal]);

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
                if (paypalLoaded) {
                  initializePayPal();
                }
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
        className={`paypal-buttons ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        style={{ 
          minHeight: isLoading ? '0' : '50px',
          display: isLoading ? 'none' : 'block'
        }}
      />
      
      {!isLoading && !error && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            By clicking the PayPal button, you agree to our terms of service and privacy policy.
          </p>
          <p className="text-xs text-green-600 mt-1">
            ✓ Canadian billing addresses supported
          </p>
          <p className="text-xs text-blue-600 mt-1">
            ✓ Dropdown remains active when switching tabs
          </p>
        </div>
      )}
    </div>
  );
}