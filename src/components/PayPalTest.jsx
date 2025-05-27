// src/components/PayPalTest.jsx - TEST COMPONENT
import { useState } from 'react';
import PayPalPayment from './PayPalPayment';

export default function PayPalTest() {
  const [testAmount, setTestAmount] = useState(25.99);
  const [paymentResult, setPaymentResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentSuccess = (paymentDetails) => {
    console.log('✅ Payment Success:', paymentDetails);
    setPaymentResult({
      type: 'success',
      message: 'Payment completed successfully!',
      details: paymentDetails
    });
    setIsProcessing(false);
  };

  const handlePaymentError = (error) => {
    console.error('❌ Payment Error:', error);
    setPaymentResult({
      type: 'error',
      message: `Payment failed: ${error.message}`,
      details: error
    });
    setIsProcessing(false);
  };

  const handlePaymentCancel = (data) => {
    console.log('🚫 Payment Cancelled:', data);
    setPaymentResult({
      type: 'cancel',
      message: 'Payment was cancelled by user',
      details: data
    });
    setIsProcessing(false);
  };

  const resetTest = () => {
    setPaymentResult(null);
    setIsProcessing(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        PayPal Integration Test
      </h2>

      {/* Test Amount Input */}
      <div className="mb-6">
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Test Amount (CAD)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-sm">$</span>
          </div>
          <input
            type="number"
            id="amount"
            step="0.01"
            min="0.01"
            max="1000"
            value={testAmount}
            onChange={(e) => setTestAmount(parseFloat(e.target.value) || 0)}
            className="block w-full pl-7 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="25.99"
          />
        </div>
      </div>

      {/* Environment Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Environment Info</h3>
        <div className="space-y-1 text-xs text-gray-600">
          <div>Mode: <span className="font-mono">{import.meta.env.MODE}</span></div>
          <div>
            PayPal Client ID: 
            <span className="font-mono ml-1">
              {import.meta.env.VITE_PAYPAL_CLIENT_ID 
                ? `${import.meta.env.VITE_PAYPAL_CLIENT_ID.substring(0, 8)}...`
                : 'Not configured'
              }
            </span>
          </div>
          <div>Environment: <span className="font-mono">{import.meta.env.DEV ? 'Development' : 'Production'}</span></div>
        </div>
      </div>

      {/* Payment Result */}
      {paymentResult && (
        <div className={`mb-6 p-4 rounded-lg ${
          paymentResult.type === 'success' ? 'bg-green-50 border border-green-200' :
          paymentResult.type === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {paymentResult.type === 'success' && (
                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {paymentResult.type === 'error' && (
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {paymentResult.type === 'cancel' && (
                <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${
                paymentResult.type === 'success' ? 'text-green-800' :
                paymentResult.type === 'error' ? 'text-red-800' :
                'text-yellow-800'
              }`}>
                {paymentResult.message}
              </h3>
              {paymentResult.details && (
                <div className="mt-2">
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium">View Details</summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
                      {JSON.stringify(paymentResult.details, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={resetTest}
              className="text-sm font-medium underline hover:no-underline"
            >
              Reset Test
            </button>
          </div>
        </div>
      )}

      {/* PayPal Payment Component */}
      {!paymentResult && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Test Payment: ${testAmount.toFixed(2)} CAD
          </h3>
          <PayPalPayment
            amount={testAmount}
            currency="CAD"
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
            disabled={isProcessing}
          />
        </div>
      )}

      {/* Test Instructions */}
      <div className="text-xs text-gray-500 space-y-2">
        <p><strong>Test Instructions:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Click the PayPal button above</li>
          <li>Use sandbox account or test card numbers</li>
          <li>Complete the payment flow</li>
          <li>Check console for detailed logs</li>
        </ul>
        <p className="mt-3"><strong>Sandbox Test Account:</strong></p>
        <p>Email: sb-buyer@personal.example.com</p>
        <p>Password: testpassword</p>
      </div>
    </div>
  );
}