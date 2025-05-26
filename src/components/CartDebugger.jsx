// Cart Debug Component - Add this temporarily to diagnose the issue
// src/components/CartDebugger.jsx

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function CartDebugger() {
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    if (!user) {
      setResults({ error: 'No user logged in' });
      return;
    }

    setLoading(true);
    const diagnostics = {
      user: {
        id: user.id,
        email: user.email,
        authenticated: !!user
      },
      tests: {}
    };

    try {
      // Test 1: Check if we can query carts table directly
      console.log('Testing direct carts query...');
      try {
        const { data: cartsData, error: cartsError } = await supabase
          .from('carts')
          .select('*')
          .eq('user_id', user.id);
        
        diagnostics.tests.directCartsQuery = {
          success: !cartsError,
          error: cartsError?.message,
          data: cartsData,
          count: cartsData?.length || 0
        };
      } catch (e) {
        diagnostics.tests.directCartsQuery = {
          success: false,
          error: e.message,
          exception: true
        };
      }

      // Test 2: Check if we can query cart_items table directly
      console.log('Testing direct cart_items query...');
      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from('cart_items')
          .select('*')
          .limit(5);
        
        diagnostics.tests.directCartItemsQuery = {
          success: !itemsError,
          error: itemsError?.message,
          data: itemsData,
          count: itemsData?.length || 0
        };
      } catch (e) {
        diagnostics.tests.directCartItemsQuery = {
          success: false,
          error: e.message,
          exception: true
        };
      }

      // Test 3: Try to create a cart
      console.log('Testing cart creation...');
      try {
        const { data: createData, error: createError } = await supabase
          .from('carts')
          .insert([{ user_id: user.id }])
          .select();
        
        diagnostics.tests.cartCreation = {
          success: !createError,
          error: createError?.message,
          data: createData
        };
      } catch (e) {
        diagnostics.tests.cartCreation = {
          success: false,
          error: e.message,
          exception: true
        };
      }

      // Test 4: Check session
      console.log('Testing session...');
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        diagnostics.tests.session = {
          success: !sessionError,
          error: sessionError?.message,
          hasSession: !!sessionData?.session,
          accessToken: sessionData?.session?.access_token ? 'present' : 'missing'
        };
      } catch (e) {
        diagnostics.tests.session = {
          success: false,
          error: e.message,
          exception: true
        };
      }

      // Test 5: Check RLS policies from client side
      console.log('Testing policy check...');
      try {
        const { data: policyData, error: policyError } = await supabase
          .rpc('check_cart_access', { test_user_id: user.id })
          .single();
        
        diagnostics.tests.policyCheck = {
          success: !policyError,
          error: policyError?.message,
          data: policyData
        };
      } catch (e) {
        diagnostics.tests.policyCheck = {
          success: false,
          error: e.message,
          exception: true,
          note: 'RPC function may not exist - this is expected'
        };
      }

      setResults(diagnostics);
    } catch (error) {
      setResults({
        error: 'General diagnostic error: ' + error.message,
        user: diagnostics.user
      });
    } finally {
      setLoading(false);
    }
  };

  const testSpecificQueries = async () => {
    if (!user) return;

    setLoading(true);
    const tests = {};

    // Test the exact queries that are failing
    const failingQueries = [
      {
        name: 'getOrCreateUserCart',
        query: () => supabase
          .from('carts')
          .select('*')
          .eq('user_id', user.id)
          .single()
      },
      {
        name: 'getCartItems',
        query: () => supabase
          .from('cart_items')
          .select(`
            *,
            test_kits (
              id,
              name,
              description,
              price,
              quantity
            )
          `)
          .limit(1)
      }
    ];

    for (const test of failingQueries) {
      try {
        console.log(`Running ${test.name}...`);
        const { data, error } = await test.query();
        tests[test.name] = {
          success: !error,
          error: error?.message,
          errorCode: error?.code,
          errorDetails: error?.details,
          data: data
        };
      } catch (e) {
        tests[test.name] = {
          success: false,
          error: e.message,
          exception: true
        };
      }
    }

    setResults(prev => ({ ...prev, specificTests: tests }));
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-sm">
        <p className="font-bold">Cart Debugger</p>
        <p className="text-sm">Please log in to run diagnostics</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 shadow-lg rounded-lg p-4 max-w-md max-h-96 overflow-y-auto z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Cart Debugger</h3>
        <button 
          onClick={() => setResults(null)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Run Full Diagnostics'}
        </button>
        
        <button
          onClick={testSpecificQueries}
          disabled={loading}
          className="w-full bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Specific Queries'}
        </button>
      </div>

      {results && (
        <div className="bg-gray-50 p-3 rounded text-xs">
          <pre className="whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}