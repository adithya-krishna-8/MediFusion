import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { submitSymptoms, checkResult } from '../services/diseaseService';

const DiseaseDetection = () => {
  const [symptomsText, setSymptomsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleAnalyze = async () => {
    if (!symptomsText.trim()) {
      setError('Please enter at least one symptom');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setTaskId(null);

    try {
      // Submit symptoms
      const response = await submitSymptoms(symptomsText);
      const newTaskId = response.task_id;
      setTaskId(newTaskId);

      // Start polling for results
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const resultResponse = await checkResult(newTaskId);

          if (resultResponse.status === 'SUCCESS') {
            // Clear interval and stop polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setIsLoading(false);
            setResult(resultResponse.result);
          } else if (resultResponse.status === 'FAILURE') {
            // Clear interval on failure
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setIsLoading(false);
            setError('Task failed. Please try again.');
          }
          // If status is 'PENDING' or 'Processing', keep waiting
        } catch (err) {
          console.error('Error checking result:', err);
        }
      }, 2000);
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.detail || err.message || 'Failed to submit symptoms');
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="gradient-blob top-0 left-0"></div>
      <div className="gradient-blob-2"></div>

      <div className="w-full max-w-2xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8"
        >
          {/* Title */}
          <h1 className="text-4xl font-serif font-bold text-white mb-6 text-center">
            AI Disease Detector
          </h1>

          {/* Input Area */}
          <div className="mb-6">
            <label htmlFor="symptoms" className="block text-lg font-semibold text-white mb-4">
              Enter Your Symptoms
            </label>
            <textarea
              id="symptoms"
              value={symptomsText}
              onChange={(e) => setSymptomsText(e.target.value)}
              placeholder="e.g., Headache, Nausea, Fever, Fatigue..."
              className="w-full h-40 p-5 rounded-2xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50 resize-none text-lg"
              disabled={isLoading}
            />
          </div>

          {/* Analyze Button */}
          <div className="text-center mb-6">
            <motion.button
              onClick={handleAnalyze}
              disabled={isLoading || !symptomsText.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 text-white font-bold py-4 px-12 rounded-2xl text-lg shadow-lg transition-all duration-200 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Symptoms'}
            </motion.button>
          </div>

          {/* Loading State */}
          {isLoading && taskId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-cyan-500/20 border border-cyan-500/50 rounded-2xl p-6 text-center"
            >
              <p className="text-cyan-300 font-semibold">
                Processing... Task ID: {taskId}
              </p>
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

          {/* Result Display */}
          {result && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-green-500/20 border border-green-500/50 rounded-2xl p-6 mt-6"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Analysis Result</h2>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <p className="text-white text-lg font-mono">{result}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DiseaseDetection;
