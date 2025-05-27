// src/components/CartClearingTest.jsx - TEST COMPONENT FOR CART CLEARING
// Add this temporarily to test cart clearing functionality

import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { clearCartComprehensive, clearCartDirect } from '../lib/cartClient';

export default function CartClearingTest() {
  const { user } = useAuth();
  const { cartItems, cartSummary, clearCart, forceRefreshCart } = useCart();
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (method, success, details) => {
    const result = {
      timestamp: new Date().toISOString(),
      method,
      success,
      details
    };
    setTestResults(prev => [result, ...prev].slice(0, 10)); // Keep last 10 results
  };

  const testContextClearCart = async () => {
    console.log('🧪 Testing Cart Context clearCart...');
    try {
      const result = await clearCart();
      addTestResult('Context clearCart', result.success, result);
      console.log('✅ Context clearCart result:', result);
    } catch (error) {
      addTestResult('Context clearCart', false, { error: error.message });
      console.error('❌ Context clearCart error:', error);
    }
  };

  const testComprehensiveClearCart = async () => {
    console.log('🧪 Testing Comprehensive clearCart...');
    try {
      const result = await clearCartComprehensive();
      addTestResult('Comprehensive clearCart', result.success, result);
      console.log('✅ Comprehensive clearCart result:', result);
    } catch (error) {
      addTestResult('Comprehensive clearCart', false, { error: error.message });
      console.error('❌ Comprehensive clearCart error:', error);
    }
  };

  const testDirectClearCart = async () => {
    console.log('🧪 Testing Direct clearCart...');
    try {
      const result = await clearCartDirect();
      addTestResult('Direct clearCart', result.success, result);
      console.log('✅ Direct clearCart result:', result);
    } catch (error) {
      addTestResult('Direct clearCart', false, { error: error.message });
      console.error('❌ Direct clearCart error:', error);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    console.log('🚀 Running all cart clearing tests...');
    
    // Wait between tests to avoid race conditions
    await testContextClearCart();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testComprehensiveClearCart();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testDirectClearCart();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Refresh cart state after tests
    await forceRefreshCart();
    
    setIsRunning(false);
    console.log('✅ All cart clearing tests completed');
  };

  if (!user) {
    return (
      <div className="fixed bottom-4 left-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded max-w-sm">
        <p className="font-bold">Cart Clearing Test</p>
        <p className="text-sm">Please log in to test cart clearing</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-300 shadow-lg rounded-lg p-4 max-w-md max-h-96 overflow-y-auto z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Cart Clearing Test</h3>
        <button 
          onClick={() => document.getElementById('cart-test').style.display = 'none'}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      
      {/* Cart Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <h4 className="font-semibold text-sm mb-2">Current Cart Status</h4>
        <div className="text-xs space-y-1">
          <div>Items: {cartSummary.totalItems}</div>
          <div>Total: ${cartSummary.totalPrice.toFixed(2)}</div>
          <div>Cart Items: {cartItems.length}</div>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="space-y-2 mb-4">
        <button
          onClick={testContextClearCart}
          disabled={isRunning}
          className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          Test Context Clear
        </button>
        
        <button
          onClick={testComprehensiveClearCart}
          disabled={isRunning}
          className="w-full bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50"
        >
          Test Comprehensive Clear
        </button>
        
        <button
          onClick={testDirectClearCart}
          disabled={isRunning}
          className="w-full bg-orange-500 text-white px-3 py-2 rounded text-sm hover:bg-orange-600 disabled:opacity-50"
        >
          Test Direct Clear
        </button>
        
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="w-full bg-purple-500 text-white px-3 py-2 rounded text-sm hover:bg-purple-600 disabled:opacity-50"
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>
        
        <button
          onClick={forceRefreshCart}
          disabled={isRunning}
          className="w-full bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600 disabled:opacity-50"
        >
          Refresh Cart State
        </button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-gray-50 p-3 rounded text-xs max-h-48 overflow-y-auto">
          <h4 className="font-semibold mb-2">Test Results</h4>
          {testResults.map((result, index) => (
            <div key={index} className={`mb-2 p-2 rounded ${
              result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className="font-semibold">
                {result.success ? '✅' : '❌'} {result.method}
              </div>
              <div className="text-xs opacity-75">
                {new Date(result.timestamp).toLocaleTimeString()}
              </div>
              {result.details && (
                <details className="mt-1">
                  <summary className="cursor-pointer">Details</summary>
                  <pre className="text-xs mt-1 bg-white p-1 rounded border overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}