import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertCircle } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const History = () => {
  const [consultations, setConsultations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const response = await axiosClient.get('/disease/history');
        setConsultations(response.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching history:', err);
        setError(err.response?.data?.detail || err.message || 'Failed to load history');
        setConsultations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="gradient-blob top-0 left-0"></div>
      <div className="gradient-blob-2"></div>
      
      <div className="container mx-auto px-4 py-8 max-w-5xl relative z-10 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-12"
        >
          <div className="flex justify-center items-center mb-6">
            <Clock className="w-16 h-16 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4 text-center">
            Diagnosis History
          </h1>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-slate-300">Loading your history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400">{error}</p>
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-lg text-slate-300 mb-2">No diagnosis history yet</p>
              <p className="text-slate-400">
                Your past diagnosis records will appear here once you start using the symptom analysis feature.
              </p>
            </div>
          ) : (
            <div className="space-y-4 mt-8">
              {consultations.map((consultation) => (
                <motion.div
                  key={consultation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Symptoms
                      </h3>
                      <p className="text-slate-300">{consultation.symptoms}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      consultation.diagnosis === 'Pending' 
                        ? 'bg-yellow-500/20 text-yellow-400' 
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {consultation.diagnosis}
                    </span>
                  </div>
                  {consultation.created_at && (
                    <p className="text-sm text-slate-400">
                      {new Date(consultation.created_at).toLocaleString()}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default History;
