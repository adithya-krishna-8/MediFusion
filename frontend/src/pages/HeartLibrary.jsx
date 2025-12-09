import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Activity, AlertCircle } from 'lucide-react';

const HeartLibrary = () => {
  const conditions = [
    {
      name: 'Hypertension',
      icon: Activity,
      symptoms: [
        'High blood pressure readings',
        'Headaches',
        'Shortness of breath',
        'Dizziness',
        'Chest pain',
      ],
      prevention: [
        'Maintain a healthy weight',
        'Exercise regularly',
        'Reduce sodium intake',
        'Limit alcohol consumption',
        'Manage stress effectively',
      ],
    },
    {
      name: 'Cardiac Arrest',
      icon: AlertCircle,
      symptoms: [
        'Sudden loss of consciousness',
        'No pulse or breathing',
        'Chest pain before collapse',
        'Dizziness or weakness',
      ],
      prevention: [
        'Regular cardiovascular checkups',
        'Manage underlying heart conditions',
        'Avoid smoking and excessive alcohol',
        'Maintain healthy lifestyle',
        'Learn CPR techniques',
      ],
    },
    {
      name: 'Arrhythmia',
      icon: Activity,
      symptoms: [
        'Irregular heartbeat',
        'Palpitations',
        'Dizziness or lightheadedness',
        'Shortness of breath',
        'Chest discomfort',
      ],
      prevention: [
        'Limit caffeine and alcohol',
        'Avoid smoking',
        'Manage stress',
        'Maintain healthy weight',
        'Regular exercise',
      ],
    },
    {
      name: 'Coronary Artery Disease (CAD)',
      icon: Heart,
      symptoms: [
        'Chest pain (angina)',
        'Shortness of breath',
        'Fatigue',
        'Heart attack symptoms',
        'Nausea or sweating',
      ],
      prevention: [
        'Quit smoking',
        'Control blood pressure and cholesterol',
        'Eat heart-healthy diet',
        'Exercise regularly',
        'Manage diabetes',
      ],
    },
    {
      name: 'Heart Failure',
      icon: Heart,
      symptoms: [
        'Shortness of breath',
        'Fatigue and weakness',
        'Swelling in legs and ankles',
        'Rapid or irregular heartbeat',
        'Persistent cough',
      ],
      prevention: [
        'Control high blood pressure',
        'Manage diabetes',
        'Maintain healthy weight',
        'Limit salt intake',
        'Regular medical checkups',
      ],
    },
    {
      name: 'Atrial Fibrillation',
      icon: Activity,
      symptoms: [
        'Irregular and rapid heartbeat',
        'Heart palpitations',
        'Fatigue',
        'Shortness of breath',
        'Dizziness',
      ],
      prevention: [
        'Control blood pressure',
        'Limit alcohol and caffeine',
        'Maintain healthy weight',
        'Manage stress',
        'Regular exercise',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="gradient-blob top-0 left-0"></div>
      <div className="gradient-blob-2"></div>
      
      <div className="container mx-auto px-4 py-12 max-w-7xl relative z-10 pt-24">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">
            Common Heart Conditions
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Educational information about major heart conditions, their symptoms, and prevention strategies
          </p>
        </motion.header>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conditions.map((condition, index) => {
            const IconComponent = condition.icon;
            return (
              <motion.div
                key={condition.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-6 hover:shadow-cyan-500/20 transition-shadow"
              >
                {/* Card Header */}
                <div className="flex items-center mb-4 pb-4 border-b border-white/20">
                  <div className="bg-cyan-500/20 p-3 rounded-2xl mr-4 border border-cyan-500/30">
                    <IconComponent className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h2 className="text-xl font-serif font-bold text-white">
                    {condition.name}
                  </h2>
                </div>

                {/* Symptoms Section */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                    Symptoms
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
                    {condition.symptoms.map((symptom, idx) => (
                      <li key={idx}>{symptom}</li>
                    ))}
                  </ul>
                </div>

                {/* Prevention Section */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                    Prevention Tips
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
                    {condition.prevention.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeartLibrary;

