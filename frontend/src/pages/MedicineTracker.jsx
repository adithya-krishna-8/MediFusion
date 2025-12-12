import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Clock, Calendar, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const MedicineTracker = () => {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        dosage: '',
        frequency: 'Daily',
        reminder_time: ''
    });

    useEffect(() => {
        fetchMedicines();
    }, []);

    const fetchMedicines = async () => {
        try {
            const { data } = await axiosClient.get('/medicines');
            setMedicines(data);
        } catch (error) {
            console.error("Error fetching medicines:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMedicine = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axiosClient.post('/medicines', formData);
            setMedicines([...medicines, data]);
            setShowModal(false);
            setFormData({ name: '', dosage: '', frequency: 'Daily', reminder_time: '' });
        } catch (error) {
            console.error("Error adding medicine:", error);
            alert("Failed to add medicine");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this medicine?")) return;
        try {
            await axiosClient.delete(`/medicines/${id}`);
            setMedicines(medicines.filter(m => m.id !== id));
        } catch (error) {
            console.error("Error deleting medicine:", error);
        }
    };

    // Color palette for cards to make them distinct
    const colors = [
        'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
        'from-purple-500/20 to-pink-500/20 border-purple-500/30',
        'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
        'from-orange-500/20 to-red-500/20 border-orange-500/30',
    ];

    if (loading) return <div className="text-white text-center mt-32">Loading Tracker...</div>;

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-12 relative overflow-hidden pt-64" style={{ paddingTop: '142px' }}>
            <div className="gradient-blob top-0 right-0 opacity-20"></div>
            <div className="container mx-auto max-w-6xl relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-2">Medicine Tracker</h1>
                        <p className="text-slate-400">Keep track of your daily prescriptions and supplements</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
                    >
                        <Plus size={20} /> Add Medicine
                    </button>
                </div>

                {/* Grid */}
                {medicines.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                        <Pill className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl text-slate-300 font-bold mb-2">No Medicines Added</h3>
                        <p className="text-slate-500">Click "Add Medicine" to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {medicines.map((medicine, index) => (
                                <motion.div
                                    key={medicine.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`bg-gradient-to-br ${colors[index % colors.length]} border backdrop-blur-md p-6 rounded-3xl relative group`}
                                >
                                    <button
                                        onClick={() => handleDelete(medicine.id)}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>

                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-white/10 p-3 rounded-full">
                                            <Pill className="text-white w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{medicine.name}</h3>
                                            <p className="text-slate-300 text-sm">{medicine.dosage}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
                                        <div className="flex items-center gap-3 text-slate-300 text-sm">
                                            <Clock size={16} className="text-blue-400" />
                                            <span>Takes at <span className="text-white font-bold">{medicine.reminder_time}</span></span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-300 text-sm">
                                            <Calendar size={16} className="text-emerald-400" />
                                            <span>Frequency: <span className="text-white font-bold">{medicine.frequency}</span></span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-2">
                                        <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-wider bg-green-500/10 py-1 px-3 rounded-full w-fit">
                                            <CheckCircle2 size={12} /> Active
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Add Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
                        >
                            <h2 className="text-2xl font-bold text-white mb-6">Add New Medicine</h2>
                            <form onSubmit={handleAddMedicine} className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-400 block mb-1">Medicine Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Paracetamol"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 block mb-1">Dosage</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. 500mg"
                                        value={formData.dosage}
                                        onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-slate-400 block mb-1">Frequency</label>
                                        <select
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                            value={formData.frequency}
                                            onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                        >
                                            <option className="bg-slate-900">Daily</option>
                                            <option className="bg-slate-900">Twice Daily</option>
                                            <option className="bg-slate-900">Weekly</option>
                                            <option className="bg-slate-900">As Needed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-400 block mb-1">Time</label>
                                        <input
                                            type="time"
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.reminder_time}
                                            onChange={e => setFormData({ ...formData, reminder_time: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl transition-all"
                                    >
                                        Add Medicine
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MedicineTracker;
