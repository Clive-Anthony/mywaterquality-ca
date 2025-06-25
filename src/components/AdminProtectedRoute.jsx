// src/components/AdminProtectedRoute.jsx - Route protection for admin users
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AdminProtectedRoute({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch user role when user is available
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRoleLoading(false);
        return;
      }

      try {
        setRoleLoading(true);
        setError(null);

        // Call the get_user_role function to get user's role
        const { data, error } = await supabase.rpc('get_user_role', {
          user_uuid: user.id
        });

        if (error) {
          throw error;
        }

        console.log('User role fetched:', data);
        setUserRole(data);
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError(err.message);
        setUserRole('user'); // Default to regular user on error
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);
  
  // Show loading spinner while checking auth status and role
  if (authLoading || roleLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying permissions...</p>
        </div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    console.log('No authenticated user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <svg className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Permission Error</h2>
          <p className="text-gray-600 mb-4">Unable to verify your permissions.</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }
  
  // Redirect to dashboard if user doesn't have admin role
    // Wait for role to be loaded before making redirect decision
    if (!roleLoading && userRole && userRole !== 'admin' && userRole !== 'super_admin') {
        console.log('User does not have admin role, redirecting to dashboard. User role:', userRole);
        return <Navigate to="/dashboard" replace />;
    }
    
    // Don't redirect if we're still loading the role or if role is null (still loading)
    if (!roleLoading && userRole === null) {
        // Role fetch completed but returned null - this might be an error case
        console.log('Role fetch completed but no role found, treating as regular user');
        return <Navigate to="/dashboard" replace />;
    }
  
  // Render children if user has admin role
  return children;
}