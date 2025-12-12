import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle, Calendar, ChevronRight, X, Activity } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import AnalysisResults from '../components/AnalysisResults';

const History = () => {
  const [consultations, setConsultations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const response = await axiosClient.get('/disease/history');
        // Parse the diagnosis string if it's a JSON string
        const parsedData = (response.data || []).map(item => {
          let parsedDiagnosis = null;
          try {
            parsedDiagnosis = typeof item.diagnosis === 'string'
              ? JSON.parse(item.diagnosis)
              : item.diagnosis;
          } catch (e) {
            console.error("Failed to parse diagnosis JSON", e);
            parsedDiagnosis = { diagnosis: item.diagnosis }; // Fallback for plain text
          }
          return {
            ...item,
            diagnosisData: parsedDiagnosis
          };
        });
        setConsultations(parsedData);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="gradient-blob top-0 left-0"></div>
      <div className="gradient-blob-2"></div>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10 pt-24">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="flex justify-center items-center mb-6">
            <Clock className="w-16 h-16 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">
            Diagnosis History
          </h1>
          <p className="text-slate-400 text-lg">
            Review your past AI-powered health insights
          </p>
        </motion.header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-white/5 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white/5 rounded-3xl border border-red-500/20">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 text-lg">{error}</p>
          </div>
        ) : consultations.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
            <Clock className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
            <p className="text-xl text-slate-300 mb-2">No history found</p>
            <p className="text-slate-400">
              Your diagnosis results will be saved here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {consultations.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedConsultation(item)}
                className="group bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 cursor-pointer hover:bg-white/15 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="text-cyan-400 w-6 h-6" />
                </div>

                <div className="flex items-center gap-2 text-cyan-300 text-sm font-medium mb-4">
                  <Calendar className="w-4 h-4" />
                  {formatDate(item.created_at)}
                </div>

                <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 min-h-[3.5rem]">
                  {item.diagnosisData?.diagnosis || 'Unknown Condition'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Symptoms</span>
                    <p className="text-slate-300 text-sm mt-1 line-clamp-2">
                      {item.symptoms}
                    </p>
                  </div>

                  {item.diagnosisData?.conditions && (
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Match</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400"
                            style={{ width: `${item.diagnosisData.conditions[0]?.confidence || 0}%` }}
                          />
                        </div>
                        <span className="text-cyan-400 text-xs font-bold">
                          {item.diagnosisData.conditions[0]?.confidence}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Activity className="w-3 h-3" />
                    {item.diagnosisData?.conditions?.length || 0} conditions detected
                  </div>
                  <span className="text-cyan-400 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                    View Details
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed View Modal */}
      <AnimatePresence>
        {selectedConsultation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSelectedConsultation(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
            >
              <button
                onClick={() => setSelectedConsultation(null)}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 text-cyan-400 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-mono">{formatDate(selectedConsultation.created_at)}</span>
                </div>

                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-6 pr-12">
                  {selectedConsultation.diagnosisData?.diagnosis}
                </h2>

                <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/10">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Reported Symptoms</h3>
                  <p className="text-lg text-white">{selectedConsultation.symptoms}</p>
                </div>

                {/* Reuse the existing AnalysisResults Component */}
                {selectedConsultation.diagnosisData && (
                  <AnalysisResults data={selectedConsultation.diagnosisData} />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default History;
