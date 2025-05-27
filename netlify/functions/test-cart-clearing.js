// netlify/functions/test-cart-clearing.js
// Test function to verify the cart clearing RPC function works
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Check environment variables
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Missing Supabase environment variables',
          details: {
            hasUrl: !!process.env.VITE_SUPABASE_URL,
            hasServiceKey: !!process.env.VITE_SUPABASE_SERVICE_KEY
          }
        })
      };
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_KEY
    );

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Check if RPC function exists by calling it with a non-existent user
    console.log('Testing RPC function existence...');
    try {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('delete_user_cart_items', { target_user_id: fakeUserId });
      
      testResults.tests.rpcFunctionExists = {
        exists: !rpcError,
        error: rpcError?.message,
        result: rpcResult,
        note: 'Called with fake user ID - should return 0 deleted items'
      };
    } catch (e) {
      testResults.tests.rpcFunctionExists = {
        exists: false,
        error: e.message,
        exception: true
      };
    }

    // Test 2: Check carts table structure
    console.log('Testing carts table...');
    try {
      const { data: cartsTest, error: cartsError } = await supabase
        .from('carts')
        .select('cart_id, user_id, created_at')
        .limit(1);
      
      testResults.tests.cartsTable = {
        accessible: !cartsError,
        error: cartsError?.message,
        hasData: cartsTest && cartsTest.length > 0
      };
    } catch (e) {
      testResults.tests.cartsTable = {
        accessible: false,
        error: e.message,
        exception: true
      };
    }

    // Test 3: Check cart_items table structure
    console.log('Testing cart_items table...');
    try {
      const { data: itemsTest, error: itemsError } = await supabase
        .from('cart_items')
        .select('item_id, cart_id, test_kit_id, quantity')
        .limit(1);
      
      testResults.tests.cartItemsTable = {
        accessible: !itemsError,
        error: itemsError?.message,
        hasData: itemsTest && itemsTest.length > 0
      };
    } catch (e) {
      testResults.tests.cartItemsTable = {
        accessible: false,
        error: e.message,
        exception: true
      };
    }

    // Test 4: If we have a real user ID from auth header, test with real data
    const authHeader = event.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        
        if (!userError && userData?.user) {
          console.log('Testing with real user...');
          
          // First, check if user has any cart items
          const { data: userCarts, error: userCartsError } = await supabase
            .from('carts')
            .select(`
              cart_id,
              cart_items (
                item_id,
                test_kit_id,
                quantity
              )
            `)
            .eq('user_id', userData.user.id);
          
          const totalItems = userCarts?.reduce((sum, cart) => {
            return sum + (cart.cart_items?.length || 0);
          }, 0) || 0;
          
          testResults.tests.realUserTest = {
            userId: userData.user.id,
            email: userData.user.email,
            cartsFound: userCarts?.length || 0,
            totalItemsBeforeTest: totalItems,
            note: 'This shows current user cart state - RPC function not called to preserve data'
          };
        }
      } catch (e) {
        testResults.tests.realUserTest = {
          error: e.message,
          note: 'Failed to test with real user'
        };
      }
    } else {
      testResults.tests.realUserTest = {
        skipped: true,
        note: 'No auth token provided - add "Authorization: Bearer <token>" header to test with real user'
      };
    }

    // Summary
    const rpcWorks = testResults.tests.rpcFunctionExists?.exists;
    const tablesAccessible = testResults.tests.cartsTable?.accessible && 
                           testResults.tests.cartItemsTable?.accessible;

    testResults.summary = {
      rpcFunctionWorks: rpcWorks,
      tablesAccessible: tablesAccessible,
      readyForCartClearing: rpcWorks && tablesAccessible,
      recommendations: []
    };

    if (!rpcWorks) {
      testResults.summary.recommendations.push(
        'RPC function "delete_user_cart_items" needs to be created in Supabase'
      );
    }
    
    if (!tablesAccessible) {
      testResults.summary.recommendations.push(
        'Check table permissions and structure for carts and cart_items tables'
      );
    }

    if (rpcWorks && tablesAccessible) {
      testResults.summary.recommendations.push(
        'Cart clearing should work! RPC function and tables are accessible.'
      );
    }

    console.log('Test results:', JSON.stringify(testResults, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(testResults, null, 2)
    };

  } catch (error) {
    console.error('Test function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test function failed',
        message: error.message,
        stack: error.stack
      }, null, 2)
    };
  }
};