import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Activity, Ruler, Weight, Droplet, Save, Edit2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [history, setHistory] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        age: '',
        height: '',
        weight: '',
        blood_type: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
        fetchHistory();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data } = await axiosClient.get('/me');
            setUser(data);
            setFormData({
                full_name: data.full_name || '',
                age: data.age || '',
                height: data.height || '',
                weight: data.weight || '',
                blood_type: data.blood_type || ''
            });
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const { data } = await axiosClient.get('/disease/history');
            setHistory(data.slice(0, 3)); // Top 3 recent
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    };

    const handleUpdate = async () => {
        try {
            // Clean up data (convert empty strings to null if needed for backend, but backend handles Optional)
            const payload = { ...formData };
            if (payload.age) payload.age = parseInt(payload.age); // Ensure int

            const { data } = await axiosClient.put('/me', payload);
            setUser(data);
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        }
    };

    const calculateBMI = (h, w) => {
        if (!h || !w) return null;
        // Assume h is string "180", w is "75" (user enters numbers)
        const heightM = parseFloat(h) / 100;
        const weightKg = parseFloat(w);
        if (isNaN(heightM) || isNaN(weightKg) || heightM === 0) return null;
        return (weightKg / (heightM * heightM)).toFixed(1);
    };

    const bmi = calculateBMI(formData.height, formData.weight);

    const getBMIStatus = (val) => {
        if (!val) return { text: '-', color: 'text-slate-500' };
        if (val < 18.5) return { text: 'Underweight', color: 'text-blue-400' };
        if (val < 25) return { text: 'Healthy', color: 'text-green-400' };
        if (val < 30) return { text: 'Overweight', color: 'text-yellow-400' };
        return { text: 'Obese', color: 'text-red-400' };
    };

    const bmiStatus = getBMIStatus(bmi);

    if (loading) return <div className="text-white text-center mt-20">Loading Profile...</div>;

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-12 relative overflow-hidden pt-24">
            {/* Background */}
            <div className="gradient-blob top-0 right-0 opacity-20"></div>

            <div className="container mx-auto max-w-5xl relative z-10">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Dashboard</h1>
                        <p className="text-slate-400">Manage your personal health profile</p>
                    </div>
                    <button
                        onClick={() => isEditing ? handleUpdate() : setIsEditing(true)}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${isEditing
                                ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/20'
                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                            }`}
                    >
                        {isEditing ? <Save size={18} /> : <Edit2 size={18} />}
                        {isEditing ? 'Save Changes' : 'Edit Profile'}
                    </button>
                </div>

                {/* PROFILE CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

                    {/* 1. General Info */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
                        <h3 className="text-blue-300 font-bold mb-4 flex items-center gap-2">
                            <User size={18} /> Personal Info
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 uppercase">Full Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                ) : (
                                    <p className="text-white font-medium">{user.full_name || 'Not set'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase">Email</label>
                                <p className="text-slate-300 truncate">{user.email}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Age</label>
                                    {isEditing ? (
                                        <input type="number" className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
                                    ) : (<p className="text-white">{user.age || '-'}</p>)}
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Blood Type</label>
                                    {isEditing ? (
                                        <input type="text" className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={formData.blood_type} onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })} placeholder="O+" />
                                    ) : (<p className="text-white">{user.blood_type || '-'}</p>)}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* 2. Physical Stats */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
                        <h3 className="text-emerald-300 font-bold mb-4 flex items-center gap-2">
                            <Activity size={18} /> Vitals
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 uppercase flex items-center gap-1"><Ruler size={12} /> Height (cm)</label>
                                {isEditing ? (
                                    <input type="number" className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} placeholder="e.g. 175" />
                                ) : (<p className="text-2xl font-light text-white">{user.height || '-'}<span className="text-sm text-slate-500 ml-1">cm</span></p>)}
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase flex items-center gap-1"><Weight size={12} /> Weight (kg)</label>
                                {isEditing ? (
                                    <input type="number" className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} placeholder="e.g. 70" />
                                ) : (<p className="text-2xl font-light text-white">{user.weight || '-'}<span className="text-sm text-slate-500 ml-1">kg</span></p>)}
                            </div>
                        </div>
                    </motion.div>

                    {/* 3. BMI Result */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
                        <h3 className="text-slate-400 font-bold mb-2">BMI Score</h3>
                        {bmi ? (
                            <>
                                <div className={`text-5xl font-bold mb-2 ${bmiStatus.color}`}>{bmi}</div>
                                <div className={`text-sm uppercase tracking-widest font-bold ${bmiStatus.color} bg-white/5 px-3 py-1 rounded-full`}>
                                    {bmiStatus.text}
                                </div>
                            </>
                        ) : (
                            <p className="text-slate-500 text-sm">Add Height & Weight to calculate BMI</p>
                        )}
                    </motion.div>

                </div>

                {/* RECENT ACTIVITY */}
                <h2 className="text-xl font-bold text-white mb-4">Recent Health Checks</h2>
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
                    {history.length > 0 ? (
                        <div className="divide-y divide-white/10">
                            {history.map((item, idx) => (
                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                    <div>
                                        <p className="text-white font-medium truncate max-w-md">{item.symptoms}</p>
                                        <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs border border-blue-500/30">
                                        {item.diagnosis ? 'Analyzed' : 'Pending'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-500">
                            No recent activity found.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Profile;
