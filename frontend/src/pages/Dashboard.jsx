import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Paperclip, X, Download, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import EKGAnimation from '../components/EKGAnimation';
import HeartLogo from '../components/HeartLogo';
import AnalysisResults from '../components/AnalysisResults';
import DoctorFinder from '../components/DoctorFinder';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import AnimatedTitle from '../components/AnimatedTitle';

const Dashboard = () => {
  const { currentUser, login, isGuestMode, enterGuestMode } = useAuth();
  const navigate = useNavigate();

  // Auth Form State
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState('patient'); // 'patient' or 'doctor'
  const [authFormData, setAuthFormData] = useState({
    name: '',
    age: '',
    hospitalName: '',
    certifications: '',
    email: '',
    password: '',
  });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [symptomsText, setSymptomsText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const pollingIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleAuthChange = (e) => {
    setAuthFormData({
      ...authFormData,
      [e.target.name]: e.target.value,
    });
    setAuthError('');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (isLogin) {
        // Login flow
        const loginData = new URLSearchParams();
        loginData.append('username', authFormData.email);
        loginData.append('password', authFormData.password);

        const { data } = await axiosClient.post('/login', loginData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        localStorage.setItem('token', data.access_token);
        login(data.access_token);
        // No need to navigate, state update will re-render Dashboard with functionality
      } else {
        // Sign Up flow
        const signupPayload = {
          email: authFormData.email,
          password: authFormData.password,
          full_name: authFormData.name || null,
          role: userType,
        };

        if (userType === 'patient') {
          signupPayload.age = authFormData.age ? parseInt(authFormData.age) : null;
        } else {
          signupPayload.hospital_name = authFormData.hospitalName;
          signupPayload.certifications = authFormData.certifications;
        }

        const { data } = await axiosClient.post('/signup', signupPayload);

        localStorage.setItem('token', data.access_token);
        login(data.access_token);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      let errorMessage = 'An error occurred';

      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map(e => e.msg).join(', ');
      } else if (typeof detail === 'object' && detail !== null) {
        errorMessage = detail.msg || detail.message || JSON.stringify(detail);
      } else {
        errorMessage = err.message || (isLogin ? 'Login failed' : 'Sign up failed');
      }
      setAuthError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (images or PDFs)
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (validTypes.includes(file.type)) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select an image (JPEG, PNG, GIF, WebP) or PDF file');
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generatePDF = () => {
    if (!result || result.status !== 'success') return;

    const doc = new jsPDF();

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('MediFusion', 20, 20);

    // Date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Generated: ${currentDate}`, 20, 30);

    let yPosition = 45;

    // Diagnosis
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Diagnosis', 20, yPosition);
    yPosition += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(result.diagnosis || 'Unable to determine', 20, yPosition);
    yPosition += 15;

    // Recommended Specialist
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Specialist', 20, yPosition);
    yPosition += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(result.consult_doctor || 'General Practitioner', 20, yPosition);
    yPosition += 15;

    // Recommended Tests
    if (result.recommended_tests && result.recommended_tests.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Recommended Medical Tests', 20, yPosition);
      yPosition += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      result.recommended_tests.forEach((test) => {
        doc.text(`• ${test}`, 25, yPosition);
        yPosition += 7;
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
      });
      yPosition += 5;
    }

    // Tips
    if (result.tips && result.tips.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Tips', 20, yPosition);
      yPosition += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      result.tips.forEach((tip) => {
        doc.text(`• ${tip}`, 25, yPosition);
        yPosition += 7;
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
      });
      yPosition += 5;
    }

    // Prevention
    if (result.prevention && result.prevention.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Prevention', 20, yPosition);
      yPosition += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      result.prevention.forEach((item) => {
        doc.text(`• ${item}`, 25, yPosition);
        yPosition += 7;
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
      });
    }

    // Save the PDF
    doc.save('MediFusion_Report.pdf');
  };

  const getErrorMessage = (err) => {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(e => e.msg).join(', ');
    if (typeof detail === 'object' && detail !== null) return detail.msg || detail.message || JSON.stringify(detail);
    return err.response?.data?.message || err.message || 'An error occurred';
  };

  // Load persistent result on mount
  useEffect(() => {
    const savedResult = localStorage.getItem('diagnosisResult');
    if (savedResult) {
      try {
        setResult(JSON.parse(savedResult));
      } catch (e) {
        console.error('Failed to parse saved diagnosis', e);
        localStorage.removeItem('diagnosisResult');
      }
    }
  }, []);

  const handleAnalyze = async () => {
    if (!symptomsText.trim()) {
      setError('Please enter at least one symptom');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const symptomsList = symptomsText
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Prepare JSON data (backend expects { text: string })
      const requestData = {
        text: symptomsList.join(', ')
      };

      // Submit symptoms using axiosClient
      // Now simpler: The backend returns the result immediately (Simplified Mode)
      const response = await axiosClient.post('/disease/predict', requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.status === 'SUCCESS') {
        const newResult = response.data.result;
        setResult(newResult);
        localStorage.setItem('diagnosisResult', JSON.stringify(newResult));
      } else {
        setError(response.data.error || 'An error occurred during analysis');
      }

      setIsLoading(false);

    } catch (err) {
      console.error('Analysis error:', err);
      setIsLoading(false);
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="gradient-blob top-0 left-0"></div>
      <div className="gradient-blob-2"></div>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10 pt-32" style={{ paddingTop: '120px' }}>
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6 mt-0"
        >
          <div className="flex justify-center items-center mb-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 4.6, duration: 1.0 }}
            >
              <HeartLogo className="w-24 h-24 mr-4" />
            </motion.div>
          </div>
          <div className="mb-2 -mt-4">
            <AnimatedTitle />
          </div>
          <p className="text-2xl text-slate-300 font-light mb-8 -mt-5">
            Empowering Healthcare Through Intelligence
          </p>

          {/* Landing Page Content (Unauthenticated) */}
          {!currentUser && !isGuestMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              <p className={`max-w-3xl mx-auto mb-2 ${showAuthForm ? 'text-cyan-400 text-xl font-bold' : 'text-2xl text-cyan-300 font-medium'}`}>
                {showAuthForm
                  ? 'Enter your details below to access your personalized dashboard.'
                  : 'Access advanced AI-powered disease prediction, health tracking, and personalized medical insights.'
                }
              </p>
              <h3 className="text-slate-400 text-lg font-normal">
                {!showAuthForm && 'Sign In to get started'}
              </h3>

              {!showAuthForm ? (
                <button
                  onClick={() => setShowAuthForm(true)}
                  className="bg-white text-slate-950 font-bold text-lg px-8 py-3 rounded-full hover:bg-cyan-50 transition-colors shadow-lg shadow-white/10"
                >
                  Sign In
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-6"
                >
                  {/* User Type Toggle (Detailed View) */}
                  <div className="flex mb-4 justify-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${userType === 'patient' ? 'border-cyan-400' : 'border-slate-500'}`}>
                        {userType === 'patient' && <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />}
                      </div>
                      <input
                        type="radio"
                        name="userType"
                        value="patient"
                        checked={userType === 'patient'}
                        onChange={() => setUserType('patient')}
                        className="hidden"
                      />
                      <span className={`text-sm font-medium ${userType === 'patient' ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>Patient</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${userType === 'doctor' ? 'border-cyan-400' : 'border-slate-500'}`}>
                        {userType === 'doctor' && <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />}
                      </div>
                      <input
                        type="radio"
                        name="userType"
                        value="doctor"
                        checked={userType === 'doctor'}
                        onChange={() => setUserType('doctor')}
                        className="hidden"
                      />
                      <span className={`text-sm font-medium ${userType === 'doctor' ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>Doctor</span>
                    </label>
                  </div>

                  {/* Toggle Buttons (Login/Signup) */}
                  <div className="flex mb-3 bg-slate-900/50 rounded-2xl p-1">
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

                  <form onSubmit={handleAuthSubmit} className="space-y-3 text-left">
                    {!isLogin && (
                      <>
                        <div>
                          <input
                            type="text"
                            name="name"
                            value={authFormData.name}
                            onChange={handleAuthChange}
                            className="w-full px-4 py-2 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                            placeholder={userType === 'doctor' ? "Dr. Full Name" : "Your name"}
                          />
                        </div>

                        {userType === 'patient' ? (
                          <div>
                            <input
                              type="number"
                              name="age"
                              value={authFormData.age}
                              onChange={handleAuthChange}
                              className="w-full px-4 py-2 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                              placeholder="Your age"
                            />
                          </div>
                        ) : (
                          <>
                            <div>
                              <input
                                type="text"
                                name="hospitalName"
                                value={authFormData.hospitalName}
                                onChange={handleAuthChange}
                                className="w-full px-4 py-2 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                                placeholder="Hospital Name"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                name="certifications"
                                value={authFormData.certifications}
                                onChange={handleAuthChange}
                                className="w-full px-4 py-2 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                                placeholder="Certifications (e.g. MBBS, MD)"
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}

                    <div>
                      <input
                        type="email"
                        name="email"
                        value={authFormData.email}
                        onChange={handleAuthChange}
                        required
                        className="w-full px-4 py-3 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                        placeholder="Email address"
                      />
                    </div>

                    <div>
                      <input
                        type="password"
                        name="password"
                        value={authFormData.password}
                        onChange={handleAuthChange}
                        required
                        className="w-full px-4 py-3 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                        placeholder="Password"
                      />
                    </div>

                    {authError && (
                      <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-xl text-red-400 text-sm">
                        {authError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-cyan-500/50 transition-all duration-200 disabled:opacity-50"
                    >
                      {authLoading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
                    </button>

                    <button
                      type="button"
                      onClick={() => enterGuestMode()}
                      className="w-full text-slate-400 hover:text-white text-sm mt-4 hover:underline"
                    >
                      Continue without login
                    </button>
                  </form>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.header>

        {/* APP FUNCTIONALITY (Authenticated or Guest) */}
        {(currentUser || isGuestMode) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >

            {/* Input Area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-5 mb-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Col: Symptoms Input */}
                <div>
                  <label htmlFor="symptoms" className="block text-lg font-semibold text-white mb-2">
                    Describe Your Symptoms
                  </label>
                  <textarea
                    id="symptoms"
                    value={symptomsText}
                    onChange={(e) => setSymptomsText(e.target.value)}
                    placeholder="e.g., Headache, Nausea, Fever..."
                    className="w-full h-32 p-4 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50 resize-none text-lg border border-white/10"
                    disabled={isLoading}
                  />
                </div>

                {/* Right Col: File Upload */}
                <div>
                  <label className="block text-lg font-semibold text-white mb-2">
                    Upload Medical Report (Optional)
                  </label>
                  <div
                    className={`relative w-full h-32 rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center cursor-pointer
                      ${selectedFile ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-600 hover:border-cyan-400 bg-slate-900/30 hover:bg-slate-900/50'}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {!selectedFile ? (
                      <>
                        <Paperclip className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-400 font-medium">Click to upload report scan</span>
                        <span className="text-xs text-slate-500 mt-1">(Images or PDF)</span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center p-4 w-full">
                        <span className="text-cyan-300 font-medium truncate max-w-full px-4">{selectedFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                          className="mt-2 text-red-400 hover:text-red-300 text-sm font-bold flex items-center gap-1 bg-red-500/10 px-3 py-1 rounded-full"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Analyze Button */}
            <div className="text-center mb-8">
              <motion.button
                onClick={handleAnalyze}
                disabled={isLoading || !symptomsText.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-4 px-12 rounded-2xl text-lg shadow-lg shadow-cyan-500/50 transition-all duration-200 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Analyzing...' : 'Analyze Symptoms'}
              </motion.button>
            </div>

            {/* Loading State - EKG Animation */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl px-8 py-2 mb-8"
              >
                <EKGAnimation />
              </motion.div>
            )}

            {/* Combined Results Section */}
            {result && result.status === 'success' && !isLoading && result.conditions && (
              <div className="animate-fade-in bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-6">

                {/* Unified Header */}
                <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-4">
                  <h2 className="text-3xl font-serif font-bold text-white">Analysis Report</h2>
                  <button
                    onClick={generatePDF}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-xl hover:bg-white/20 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-200"
                    title="Download PDF Report"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Download PDF</span>
                  </button>
                </div>

                {/* Side-by-Side Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full">
                  {/* Left Column: Analysis Results */}
                  <div className="w-full">
                    <AnalysisResults
                      data={{
                        diagnosis_summary: result.diagnosis_summary || '',
                        detailed_diagnosis: result.detailed_diagnosis || '',
                        conditions: result.conditions,
                        recommended_specialist: result.recommended_specialist || result.consult_doctor || 'General Practitioner',
                        precautions: result.precautions || [],
                        lifestyle_tips: result.lifestyle_tips || []
                      }}
                    />
                  </div>

                  {/* Right Column: Doctor Finder */}
                  <div className="w-full">
                    <DoctorFinder
                      diagnosisData={{
                        recommended_specialist: result.recommended_specialist || result.consult_doctor || 'General Practitioner'
                      }}
                    />
                  </div>
                </div>

                {/* Footer Section: Prevention & Tips */}
                <div className="mt-8 pt-6 border-t border-white/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Prevention */}
                    {result.prevention && result.prevention.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-slate-300 mb-3">Prevention</h3>
                        <ul className="list-disc list-inside space-y-2 text-slate-300">
                          {result.prevention.map((item, index) => (
                            <li key={index} className="leading-relaxed">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tips */}
                    {result.tips && result.tips.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-slate-300 mb-3">Health Tips</h3>
                        <ul className="list-disc list-inside space-y-2 text-slate-300">
                          {result.tips.map((item, index) => (
                            <li key={index} className="leading-relaxed">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
