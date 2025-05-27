// netlify/functions/test-orders-setup.js
// Test function to verify orders database setup
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

    // Test 1: Check if orders table exists
    console.log('Testing orders table...');
    try {
      const { data: ordersTest, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .limit(1);
      
      testResults.tests.ordersTable = {
        exists: !ordersError,
        error: ordersError?.message,
        code: ordersError?.code
      };
    } catch (e) {
      testResults.tests.ordersTable = {
        exists: false,
        error: e.message,
        exception: true
      };
    }

    // Test 2: Check if order_items table exists
    console.log('Testing order_items table...');
    try {
      const { data: itemsTest, error: itemsError } = await supabase
        .from('order_items')
        .select('order_item_id')
        .limit(1);
      
      testResults.tests.orderItemsTable = {
        exists: !itemsError,
        error: itemsError?.message,
        code: itemsError?.code
      };
    } catch (e) {
      testResults.tests.orderItemsTable = {
        exists: false,
        error: e.message,
        exception: true
      };
    }

    // Test 3: Check if test_kits table exists (referenced by order_items)
    console.log('Testing test_kits table...');
    try {
      const { data: testKitsTest, error: testKitsError } = await supabase
        .from('test_kits')
        .select('id')
        .limit(1);
      
      testResults.tests.testKitsTable = {
        exists: !testKitsError,
        error: testKitsError?.message,
        code: testKitsError?.code,
        hasData: testKitsTest && testKitsTest.length > 0
      };
    } catch (e) {
      testResults.tests.testKitsTable = {
        exists: false,
        error: e.message,
        exception: true
      };
    }

    // Test 4: Try to get a list of users (to verify auth access)
    console.log('Testing auth access...');
    try {
      const { data: usersTest, error: usersError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });
      
      testResults.tests.authAccess = {
        working: !usersError,
        error: usersError?.message,
        hasUsers: usersTest?.users && usersTest.users.length > 0
      };
    } catch (e) {
      testResults.tests.authAccess = {
        working: false,
        error: e.message,
        exception: true
      };
    }

    // Test 5: Try a test order insert (with rollback)
    if (testResults.tests.ordersTable.exists && testResults.tests.orderItemsTable.exists) {
      console.log('Testing order creation (dry run)...');
      try {
        // Use a test user ID - in real scenario this would come from auth
        const testUserId = '00000000-0000-0000-0000-000000000000';
        
        const testOrderData = {
          user_id: testUserId,
          subtotal: 100.00,
          shipping_cost: 0.00,
          tax_amount: 13.00,
          total_amount: 113.00,
          shipping_address: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            address: '123 Test St',
            city: 'Test City',
            province: 'ON',
            postalCode: 'K1A 0A6',
            country: 'Canada'
          },
          billing_address: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            address: '123 Test St',
            city: 'Test City',
            province: 'ON',
            postalCode: 'K1A 0A6',
            country: 'Canada'
          },
          payment_method: 'test',
          status: 'pending',
          payment_status: 'pending',
          fulfillment_status: 'unfulfilled'
        };

        // This will fail if the user doesn't exist, but that's expected
        const { data: testOrder, error: testOrderError } = await supabase
          .from('orders')
          .insert([testOrderData])
          .select()
          .single();

        if (testOrderError) {
          testResults.tests.orderCreation = {
            canCreate: false,
            error: testOrderError.message,
            code: testOrderError.code,
            hint: testOrderError.hint,
            details: testOrderError.details
          };
        } else {
          // Clean up test order
          await supabase.from('orders').delete().eq('id', testOrder.id);
          
          testResults.tests.orderCreation = {
            canCreate: true,
            message: 'Test order creation successful (cleaned up)'
          };
        }
      } catch (e) {
        testResults.tests.orderCreation = {
          canCreate: false,
          error: e.message,
          exception: true
        };
      }
    }

    // Summary
    const allTestsPassed = Object.values(testResults.tests).every(test => 
      (test.exists !== false) && (test.working !== false) && (test.canCreate !== false)
    );

    testResults.summary = {
      allTestsPassed,
      readyForOrders: testResults.tests.ordersTable?.exists && 
                     testResults.tests.orderItemsTable?.exists &&
                     testResults.tests.testKitsTable?.exists,
      recommendations: []
    };

    if (!testResults.tests.ordersTable?.exists) {
      testResults.summary.recommendations.push('Create orders table using the provided SQL schema');
    }
    if (!testResults.tests.orderItemsTable?.exists) {
      testResults.summary.recommendations.push('Create order_items table using the provided SQL schema');
    }
    if (!testResults.tests.testKitsTable?.exists) {
      testResults.summary.recommendations.push('Ensure test_kits table exists with some sample data');
    }
    if (!testResults.tests.authAccess?.working) {
      testResults.summary.recommendations.push('Check Supabase service key permissions');
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