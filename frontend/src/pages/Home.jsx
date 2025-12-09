import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Paperclip, X, Download, AlertCircle } from 'lucide-react';
import { submitSymptoms, pollResult } from '../api';
import EKGAnimation from '../components/EKGAnimation';
import HeartLogo from '../components/HeartLogo';
import AnalysisResults from '../components/AnalysisResults';
import DoctorFinder from '../components/DoctorFinder';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Home = () => {
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

      const taskId = await submitSymptoms(symptomsList, selectedFile);

      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await pollResult(taskId);

          if (response.status === 'ready') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setIsLoading(false);
            setResult(response.result);
          } else if (response.status === 'error') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setIsLoading(false);
            setError(response.error || 'An error occurred during analysis');
          }
        } catch (err) {
          console.error('Error polling result:', err);
        }
      }, 2000);
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.message || err.message || 'Failed to submit symptoms');
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="gradient-blob top-0 left-0"></div>
      <div className="gradient-blob-2"></div>
      
      <div className="container mx-auto px-4 py-8 max-w-5xl relative z-10 pt-24">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 mt-8"
        >
          <div className="flex justify-center items-center mb-4">
            <HeartLogo className="w-16 h-16" />
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-3">
            MediFusion
          </h1>
          <p className="text-lg text-slate-300 font-light">
            Empowering Healthcare Through Intelligence
          </p>
        </motion.header>

        {/* Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 mb-6"
        >
          <label htmlFor="symptoms" className="block text-lg font-semibold text-white mb-4">
            Enter Your Symptoms
          </label>
          <div className="relative">
            <textarea
              id="symptoms"
              value={symptomsText}
              onChange={(e) => setSymptomsText(e.target.value)}
              placeholder="e.g., Headache, Nausea, Fever"
              className="w-full h-40 p-5 pr-12 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50 resize-none text-lg"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="absolute bottom-3 right-3 p-2 text-white hover:text-cyan-400 transition-colors disabled:opacity-50 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] hover:drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          {selectedFile && (
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-lg text-sm font-medium border border-cyan-500/30">
                {selectedFile.name}
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="hover:text-cyan-100"
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            </div>
          )}
          <p className="text-sm text-slate-400 mt-3">
            Separate multiple symptoms with commas. You can optionally attach an image or PDF.
          </p>
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

        {/* Analysis Results Component */}
        {result && result.status === 'success' && !isLoading && result.conditions && (
          <>
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
            
            {/* Doctor Finder Component */}
            <DoctorFinder 
              diagnosisData={{
                recommended_specialist: result.recommended_specialist || result.consult_doctor || 'General Practitioner'
              }}
            />
          </>
        )}

        {/* Loading State - EKG Animation */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8"
          >
            <EKGAnimation />
          </motion.div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 mb-6 backdrop-blur-sm"
          >
            <p className="text-red-300 font-semibold">Error: {error}</p>
          </motion.div>
        )}

        {/* Result Card */}
        {result && result.status === 'success' && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 mt-6 relative"
          >
            {/* Download PDF Button - Top Right */}
            <div className="absolute top-6 right-6">
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-xl hover:bg-white/20 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-200"
                title="Download PDF Report"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Download PDF</span>
              </button>
            </div>
            
            <h2 className="text-3xl font-serif font-bold text-white mb-6 pr-32">
              Analysis Results
            </h2>

            {/* Diagnosis - Highlighted Section */}
            <div className="mb-8 pb-8 border-b border-white/20">
              <div className="bg-gradient-to-r from-red-500/20 to-transparent border-l-4 border-red-500 rounded-r-2xl p-6 -ml-8 pl-6">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-red-300">
                    Most Probable Condition
                  </span>
                </div>
                <p className="text-4xl font-serif font-bold text-white flex items-center gap-3">
                  {result.diagnosis}
                </p>
                {result.diagnosis_summary && (
                  <p className="text-slate-300 mt-3 text-lg">
                    {result.diagnosis_summary}
                  </p>
                )}
              </div>
            </div>

            {/* All Conditions with Confidence Scores */}
            {result.conditions && result.conditions.length > 0 && (
              <div className="mb-8 pb-8 border-b border-white/20">
                <h3 className="text-lg font-semibold text-slate-300 mb-4">
                  Possible Conditions
                </h3>
                <div className="space-y-4">
                  {result.conditions.map((condition, index) => {
                    const severityColors = {
                      high: 'border-red-500/50 bg-red-500/10',
                      medium: 'border-yellow-500/50 bg-yellow-500/10',
                      low: 'border-green-500/50 bg-green-500/10'
                    };
                    const severityTextColors = {
                      high: 'text-red-300',
                      medium: 'text-yellow-300',
                      low: 'text-green-300'
                    };
                    const severityBg = severityColors[condition.severity] || severityColors.medium;
                    const severityText = severityTextColors[condition.severity] || severityTextColors.medium;
                    
                    return (
                      <div
                        key={index}
                        className={`border-l-4 rounded-r-xl p-4 ${severityBg}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-xl font-bold text-white">
                            {condition.name}
                          </h4>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${severityText} bg-black/20`}>
                              {condition.severity?.toUpperCase() || 'MEDIUM'}
                            </span>
                            <span className="text-lg font-bold text-white">
                              {condition.confidence}%
                            </span>
                          </div>
                        </div>
                        {condition.reasoning && (
                          <p className="text-slate-300 text-sm leading-relaxed">
                            {condition.reasoning}
                          </p>
                        )}
                        {/* Confidence Bar */}
                        <div className="mt-3 h-2 bg-black/20 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              condition.confidence >= 70 ? 'bg-red-500' :
                              condition.confidence >= 40 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${condition.confidence}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Doctor to Consult */}
            <div className="mb-6 pb-6 border-b border-white/20">
              <h3 className="text-lg font-semibold text-slate-300 mb-3">
                Recommended Specialist
              </h3>
              <span className="inline-block bg-cyan-500/20 text-cyan-300 px-6 py-3 rounded-2xl font-semibold text-lg border border-cyan-500/30">
                {result.consult_doctor}
              </span>
            </div>

            {/* Recommended Tests */}
            {result.recommended_tests && result.recommended_tests.length > 0 && (
              <div className="mb-6 pb-6 border-b border-white/20">
                <div className="flex items-center mb-3">
                  <ClipboardList className="w-5 h-5 text-cyan-400 mr-2" />
                  <h3 className="text-lg font-semibold text-slate-300">
                    Recommended Medical Tests
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.recommended_tests.map((test, index) => (
                    <span
                      key={index}
                      className="inline-block bg-cyan-500/20 text-cyan-300 px-4 py-2 rounded-xl text-sm font-medium border border-cyan-500/30"
                    >
                      {test}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {result.tips && result.tips.length > 0 && (
              <div className="mb-6 pb-6 border-b border-white/20">
                <h3 className="text-lg font-semibold text-slate-300 mb-3">Tips</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                  {result.tips.map((tip, index) => (
                    <li key={index} className="leading-relaxed">{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prevention */}
            {result.prevention && result.prevention.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-300 mb-3">Prevention</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                  {result.prevention.map((item, index) => (
                    <li key={index} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Home;
