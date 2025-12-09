import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';
import HeartLogo from '../components/HeartLogo';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login flow - Backend expects OAuth2 Password Request Form (x-www-form-urlencoded)
        const loginFormData = new URLSearchParams();
        loginFormData.append('username', formData.email);
        loginFormData.append('password', formData.password);

        const { data } = await axiosClient.post('/login', loginFormData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // Store the JWT
        localStorage.setItem('token', data.access_token);
        login(data.access_token);
        navigate('/');
      } else {
        // Sign Up flow
        const { data } = await axiosClient.post('/signup', {
          email: formData.email,
          password: formData.password,
          full_name: formData.name || null,
          age: formData.age ? parseInt(formData.age) : null,
        });

        // Store the JWT
        localStorage.setItem('token', data.access_token);
        login(data.access_token);
        navigate('/');
      }
    } catch (err) {
      // Enhanced error handling for 422 (Validation) and 500 errors
      const detail = err.response?.data?.detail;
      let errorMessage = 'An error occurred';

      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        // Handle Pydantic validation error list
        errorMessage = detail.map(e => e.msg).join(', ');
      } else if (typeof detail === 'object' && detail !== null) {
        // Handle generic object error
        errorMessage = detail.msg || detail.message || JSON.stringify(detail);
      } else {
        errorMessage = err.message || (isLogin ? 'Login failed' : 'Sign up failed');
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="gradient-blob top-0 left-0"></div>
      <div className="gradient-blob-2"></div>

      <div className="w-full max-w-md flex flex-col items-center space-y-8 relative z-10">
        {/* Branding - Above the card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="flex justify-center items-center mb-6">
            <HeartLogo className="w-20 h-20" />
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-4">
            MediFusion
          </h1>
          <p className="text-2xl font-semibold text-slate-300">
            Empowering Healthcare Through Intelligence
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8">
            {/* Toggle Buttons */}
            <div className="flex mb-6 bg-slate-900/50 rounded-2xl p-1">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all ${isLogin
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50'
                  : 'text-slate-300 hover:text-white'
                  }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all ${!isLogin
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50'
                  : 'text-slate-300 hover:text-white'
                  }`}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-slate-300 font-medium mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                      placeholder="Your age"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-500/20 border border-red-500/50 p-3 rounded-xl text-red-400 text-sm backdrop-blur-sm"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-cyan-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
