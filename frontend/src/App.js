import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import HeartHealth from './pages/HeartHealth';
import Profile from './pages/Profile';
import HeartLibrary from './pages/HeartLibrary';
import DiseaseDetection from './components/DiseaseDetection';
import MedicineTracker from './pages/MedicineTracker';
import './App.css';

// Component to conditionally show Navbar
const AppContent = () => {
  return (
    <>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={<Dashboard />}
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/heart-health"
          element={<HeartHealth />}
        />
        <Route
          path="/heart-library"
          element={
            <ProtectedRoute>
              <HeartLibrary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/predict"
          element={
            <ProtectedRoute>
              <DiseaseDetection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medicines"
          element={
            <ProtectedRoute>
              <MedicineTracker />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
