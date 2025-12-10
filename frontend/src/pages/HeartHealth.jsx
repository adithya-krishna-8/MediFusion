import React from 'react';
import { motion } from 'framer-motion';
import HeartLogo from '../components/HeartLogo';
import { Activity, Heart, Shield, AlertTriangle } from 'lucide-react';

const HeartHealth = () => {
    const conditions = [
        {
            name: 'Coronary Artery Disease (CAD)',
            cause: 'Buildup of plaque in the arteries supplying blood to the heart.',
            symptoms: 'Chest pain (angina), shortness of breath, fatigue.',
            precautions: ['Quit smoking', 'Manage stress', 'Monitor blood pressure'],
            tips: ['Eat a heart-healthy diet', 'Exercise regularly', 'Limit alcohol intake'],
            color: 'from-red-500 to-orange-500'
        },
        {
            name: 'Hypertension (High Blood Pressure)',
            cause: 'High pressure in the arteries, forcing the heart to work harder.',
            symptoms: 'Often no symptoms ("Silent Killer"), headaches, nosebleeds.',
            precautions: ['Limit salt intake', 'Maintain healthy weight', 'Take prescribed meds'],
            tips: ['Regular checkups', 'Manage stress', 'Limit caffeine'],
            color: 'from-blue-500 to-cyan-500'
        },
        {
            name: 'Arrhythmia',
            cause: 'Problems with the heart\'s electrical system causing irregular beats.',
            symptoms: 'Palpitations, dizziness, fainting, chest fluttering.',
            precautions: ['Avoid stimulants', 'Manage stress', 'Monitor pulse'],
            tips: ['Limit caffeine/alcohol', 'Stay hydrated', 'Sleep well'],
            color: 'from-purple-500 to-pink-500'
        },
        {
            name: 'Heart Failure',
            cause: 'Heart cannot pump enough blood to meet the body\'s needs.',
            symptoms: 'Shortness of breath, fatigue, swollen legs/ankles.',
            precautions: ['Limit fluid intake', 'Weigh yourself daily', 'Low-salt diet'],
            tips: ['Consistent medication', 'Flu shots', 'Moderate activity'],
            color: 'from-emerald-500 to-green-500'
        },
        {
            name: 'Cardiomyopathy',
            cause: 'Disease of the heart muscle, making it harder to pump blood.',
            symptoms: 'Breathlessness, bloating, fatigue, rapid heartbeat.',
            precautions: ['Avoid alcohol', 'Healthy diet', 'Regular exercise'],
            tips: ['Family screening', 'Stress management', 'Rest when needed'],
            color: 'from-yellow-500 to-amber-500'
        },
        {
            name: 'Heart Valve Disease',
            cause: 'One or more heart valves do not work properly (leak or narrow).',
            symptoms: 'Whooshing sound (murmur), chest pain, fatigue.',
            precautions: ['Dental hygiene (prevent infection)', 'Regular echo tests'],
            tips: ['Healthy weight', 'Quit smoking', 'Listen to your body'],
            color: 'from-indigo-500 to-violet-500'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden pt-24 pb-12">
            {/* Background Blobs */}
            <div className="gradient-blob top-0 left-0 opacity-30"></div>
            <div className="gradient-blob-2 bottom-0 right-0 opacity-30"></div>

            <div className="container mx-auto px-4 relative z-10 max-w-6xl">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <div className="flex justify-center items-center mb-4">
                        <HeartLogo className="w-16 h-16" />
                    </div>
                    <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-4">
                        Heart Health Guide
                    </h1>
                    <p className="text-xl text-slate-300 font-light max-w-2xl mx-auto">
                        Understanding the most common heart conditions to protect your most vital organ.
                    </p>
                </motion.header>

                {/* Grid of Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {conditions.map((condition, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:bg-white/10 transition-all duration-300 group"
                        >
                            {/* Card Header */}
                            <div className={`h-2 w-20 rounded-full bg-gradient-to-r ${condition.color} mb-6`}></div>

                            <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                                {condition.name}
                            </h2>

                            {/* Cause Section */}
                            <div className="mb-6">
                                <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-white/20 pl-4 italic">
                                    "{condition.cause}"
                                </p>
                            </div>

                            {/* Symptoms */}
                            <div className="mb-6 flex items-start gap-3">
                                <Activity className="w-5 h-5 text-red-400 mt-1 shrink-0" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">Symptoms</h3>
                                    <p className="text-slate-400 text-sm">{condition.symptoms}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
                                {/* Precautions */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                                        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Precautions</h3>
                                    </div>
                                    <ul className="space-y-2">
                                        {condition.precautions.map((item, i) => (
                                            <li key={i} className="text-xs text-slate-400 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400/50"></span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Tips */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Shield className="w-4 h-4 text-emerald-400" />
                                        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Healthy Tips</h3>
                                    </div>
                                    <ul className="space-y-2">
                                        {condition.tips.map((item, i) => (
                                            <li key={i} className="text-xs text-slate-400 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50"></span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer Note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-center mt-16 text-slate-500 text-sm"
                >
                    <p>Information is for educational purposes only. Always consult a medical professional.</p>
                </motion.div>
            </div>
        </div>
    );
};

export default HeartHealth;
