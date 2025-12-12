import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if access_token exists in localStorage
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  // If NO token exists, redirect to /
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If token exists, render the protected page
  return children;
};

export default ProtectedRoute;

