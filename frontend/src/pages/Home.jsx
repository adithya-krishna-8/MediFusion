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
import 'jspdf-autotable';
import TubesBackground from '../components/TubesBackground';

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
      {/* Animated gradient blobs - REPLACED WITH TUBES */}
      <TubesBackground />

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10 pt-24">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 mt-0"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 4.6, duration: 1.0 }}
            className="flex justify-center items-center mb-0"
          >
            <HeartLogo className="w-24 h-24" />
          </motion.div>
          <h1 className="text-6xl md:text-7xl font-sans tracking-tighter font-bold text-white mb-1 -mt-4">
            MediFusion
          </h1>
          <p className="text-2xl text-slate-300 font-light -mt-5">
            Empowering Healthcare Through Intelligence
          </p>
        </motion.header>

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
                Describe The Symptoms
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

        {/* Combined Results Section */}
        {result && result.status === 'success' && !isLoading && result.conditions && (
          <div className="mt-8 animate-fade-in">
            {/* Download PDF Button - Placed above the grid */}
            <div className="flex justify-end mb-4">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
