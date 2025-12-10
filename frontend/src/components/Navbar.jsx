import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HeartLogo from './HeartLogo';

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    // Remove the access_token from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('token'); // Also remove old token if exists
    logout();
    // Redirect the user to /login
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-2xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Brand */}
          <Link to="/" className="flex items-center gap-2">
            <HeartLogo className="w-8 h-8" />
            <h1 className="text-2xl font-serif font-bold text-white">
              MediFusion
            </h1>
          </Link>

          {/* Right: Navigation Links */}
          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="flex items-center space-x-3 md:space-x-6">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/"
                    className="text-slate-300 hover:text-white font-medium transition-all text-sm md:text-base hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                  >
                    Home
                  </Link>
                  <Link
                    to="/history"
                    className="text-slate-300 hover:text-white font-medium transition-all text-sm md:text-base hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                  >
                    History
                  </Link>
                  <Link
                    to="/heart-health"
                    className="text-slate-300 hover:text-white font-medium transition-all text-sm md:text-base hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                  >
                    Heart Health
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-red-400 hover:text-red-300 font-medium transition-all text-sm md:text-base hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="text-slate-300 hover:text-white font-medium transition-all text-sm md:text-base hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
