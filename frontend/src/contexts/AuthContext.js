import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isGuestMode, setIsGuestMode] = useState(false);

  useEffect(() => {
    // Check if user is logged in on page load
    const token = localStorage.getItem('token');
    if (token) {
      setCurrentUser({ token });
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    localStorage.setItem('token', token);
    setCurrentUser({ token });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setIsGuestMode(false); // Reset guest mode on logout
  };

  const enterGuestMode = () => setIsGuestMode(true);
  const exitGuestMode = () => setIsGuestMode(false);

  const value = {
    currentUser,
    login,
    logout,
    isGuestMode,
    enterGuestMode,
    exitGuestMode
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};