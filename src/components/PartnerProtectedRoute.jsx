
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Protected route wrapper for partner portal access
 * Checks if user has partner associations
 */
export default function PartnerProtectedRoute({ children }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [hasPartnerAccess, setHasPartnerAccess] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkPartnerAccess = async () => {
      if (!user) {
        setHasPartnerAccess(false);
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('get_user_partner_ids', { user_uuid: user.id });

        if (error) {
          console.error('Error checking partner access:', error);
          setHasPartnerAccess(false);
        } else {
          setHasPartnerAccess(data && data.length > 0);
        }
      } catch (error) {
        console.error('Exception checking partner access:', error);
        setHasPartnerAccess(false);
      } finally {
        setChecking(false);
      }
    };

    if (!authLoading) {
      checkPartnerAccess();
    }
  }, [user, authLoading]);

  // Show loading spinner while checking auth or partner access
  if (authLoading || checking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to dashboard if no partner access
  if (!hasPartnerAccess) {
    return (
      <Navigate 
        to="/dashboard" 
        state={{ 
          error: 'You do not have access to the partner portal' 
        }} 
        replace 
      />
    );
  }

  // Render children if authenticated and has partner access
  return children;
}