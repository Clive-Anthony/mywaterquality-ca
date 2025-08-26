// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storeReturnPath } from '../utils/returnPath';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    console.log('No authenticated user found, storing return path and redirecting to login');
    
    // Store the full path including query parameters and hash
    const returnPath = location.pathname + location.search + location.hash;
    storeReturnPath(returnPath);
    
    return <Navigate to="/login" replace />;
  }
  
  // Render children if authenticated
  return children;
}