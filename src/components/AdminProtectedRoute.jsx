// src/components/AdminProtectedRoute.jsx - Route protection for admin users
import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { storeReturnPath } from '../utils/returnPath';

export default function AdminProtectedRoute({ children }) {
  const { user, loading: authLoading, isReady } = useAuth();
  const location = useLocation(); // ✅ Always call this at the top level
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleFetchAttempted, setRoleFetchAttempted] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch user role when user is available and auth is ready
  // Fetch user role when user is available and auth is ready
useEffect(() => {
  const fetchUserRole = async () => {
    // If auth is ready but there's no user, we don't need to fetch role
    if (isReady && !user) {
      setRoleLoading(false);
      setRoleFetchAttempted(true);
      return;
    }

    // Wait for auth to be ready and user to be available
    if (!isReady || !user) {
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
      setRoleFetchAttempted(true);
    } catch (err) {
      console.error('Error fetching user role:', err);
      setError(err.message);
      setUserRole('user'); // Default to regular user on error
      setRoleFetchAttempted(true);
    } finally {
      setRoleLoading(false);
    }
  };

  fetchUserRole();
}, [user, isReady]); // ✅ Fixed: include 'user' since we reference it in the effect

  // Reset state when user changes (including sign out)
  useEffect(() => {
    if (isReady && !user) {
      // User signed out, reset all state
      setUserRole(null);
      setRoleLoading(false);
      setRoleFetchAttempted(true);
      setError(null);
    }
  }, [user, isReady]);
  
  // Show loading spinner while checking auth status and role
  if (authLoading || !isReady || (user && (roleLoading || !roleFetchAttempted))) {
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
    console.log('No authenticated user found, storing return path and redirecting to login');
    
    // Store the admin path for return after login
    const returnPath = location.pathname + location.search + location.hash;
    storeReturnPath(returnPath);
    
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
  
  // Only make redirect decisions AFTER we've attempted to fetch the role
  if (roleFetchAttempted) {
    // Redirect to dashboard if user doesn't have admin role
    if (userRole && userRole !== 'admin' && userRole !== 'super_admin') {
      console.log('User does not have admin role, redirecting to dashboard. User role:', userRole);
      return <Navigate to="/dashboard" replace />;
    }
    
    // If role is null after fetch attempt, assume not admin
    if (userRole === null) {
      console.log('Role fetch completed but no role found, treating as regular user');
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  // Render children if user has admin role
  return children;
}