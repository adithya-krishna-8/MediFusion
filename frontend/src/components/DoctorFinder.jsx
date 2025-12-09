import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Search, Star, Calendar } from 'lucide-react';
import { doctors } from '../data/doctors';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DoctorFinder = ({ diagnosisData }) => {
  const [searchPincode, setSearchPincode] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const mapRef = useRef(null);

  // Extract specialty from diagnosis data
  const recommendedSpecialist = diagnosisData?.recommended_specialist || 
                                diagnosisData?.consult_doctor || 
                                'General Physician';

  // Normalize specialty names for matching
  const normalizeSpecialty = (specialty) => {
    if (!specialty) return '';
    const lower = specialty.toLowerCase();
    if (lower.includes('cardio')) return 'Cardiologist';
    if (lower.includes('dermato') || lower.includes('skin')) return 'Dermatologist';
    if (lower.includes('general') || lower.includes('physician')) return 'General Physician';
    return specialty;
  };

  const targetSpecialty = normalizeSpecialty(recommendedSpecialist);

  useEffect(() => {
    // Filter doctors by specialty
    let filtered = doctors.filter(doctor => 
      doctor.specialty.toLowerCase() === targetSpecialty.toLowerCase()
    );

    // Further filter by pincode if provided
    if (searchPincode.trim()) {
      filtered = filtered.filter(doctor => 
        doctor.pincode === searchPincode.trim()
      );
    }

    setFilteredDoctors(filtered);
    
    // If no doctors found with pincode, show all matching specialty
    if (filtered.length === 0 && searchPincode.trim()) {
      const specialtyFiltered = doctors.filter(doctor => 
        doctor.specialty.toLowerCase() === targetSpecialty.toLowerCase()
      );
      setFilteredDoctors(specialtyFiltered);
    }
  }, [targetSpecialty, searchPincode]);

  // Set initial filtered doctors on mount
  useEffect(() => {
    const initialFiltered = doctors.filter(doctor => 
      doctor.specialty.toLowerCase() === targetSpecialty.toLowerCase()
    );
    setFilteredDoctors(initialFiltered);
  }, [targetSpecialty]);

  const handleMarkerClick = (doctor) => {
    setSelectedDoctor(doctor.id);
    // Scroll to the doctor card
    const element = document.getElementById(`doctor-${doctor.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleBookAppointment = (doctor) => {
    alert(`Booking appointment with ${doctor.name} at ${doctor.hospital}`);
    // In a real app, this would navigate to a booking page or open a modal
  };

  // Calculate center of map based on filtered doctors
  const getMapCenter = () => {
    if (filteredDoctors.length === 0) {
      return [17.3850, 78.4867]; // Default Hyderabad center
    }
    const avgLat = filteredDoctors.reduce((sum, doc) => sum + doc.location.lat, 0) / filteredDoctors.length;
    const avgLng = filteredDoctors.reduce((sum, doc) => sum + doc.location.lng, 0) / filteredDoctors.length;
    return [avgLat, avgLng];
  };

  if (!diagnosisData) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-8">
      <h2 className="text-2xl font-bold text-white mb-4">Find a Doctor</h2>
      <p className="text-gray-400 mb-6">
        Recommended Specialist: <span className="text-cyan-400 font-semibold">{recommendedSpecialist}</span>
      </p>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by Pincode (e.g., 500032)"
            value={searchPincode}
            onChange={(e) => setSearchPincode(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
        {filteredDoctors.length === 0 && searchPincode && (
          <p className="text-yellow-400 text-sm mt-2">
            No doctors found for this pincode. Showing all {targetSpecialty} doctors.
          </p>
        )}
      </div>

      {/* Split View: List + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Doctor Cards List */}
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {filteredDoctors.length === 0 ? (
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 text-center">
              <p className="text-gray-400">No doctors found matching your criteria.</p>
            </div>
          ) : (
            filteredDoctors.map((doctor) => (
              <div
                key={doctor.id}
                id={`doctor-${doctor.id}`}
                className={`bg-gray-800/50 p-5 rounded-lg border transition-all duration-200 ${
                  selectedDoctor === doctor.id
                    ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex gap-4">
                  {/* Doctor Image */}
                  <img
                    src={doctor.image}
                    alt={doctor.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-700"
                  />
                  
                  {/* Doctor Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{doctor.name}</h3>
                        <p className="text-sm text-gray-400">{doctor.hospital}</p>
                        <p className="text-xs text-cyan-400 mt-1">{doctor.specialty}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-full">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-yellow-400 text-sm font-semibold">{doctor.rating}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-300 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {doctor.experience} years
                      </span>
                      <span className="text-cyan-400 font-semibold">₹{doctor.consultation_fee}</span>
                    </div>
                    
                    <button
                      onClick={() => handleBookAppointment(doctor)}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/50"
                    >
                      Book Appointment
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Side: Map */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <MapContainer
            center={getMapCenter()}
            zoom={12}
            style={{ height: '600px', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredDoctors.map((doctor) => (
              <Marker
                key={doctor.id}
                position={[doctor.location.lat, doctor.location.lng]}
                eventHandlers={{
                  click: () => handleMarkerClick(doctor),
                }}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">{doctor.name}</p>
                    <p className="text-sm text-gray-600">{doctor.hospital}</p>
                    <p className="text-xs text-gray-500">{doctor.specialty}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default DoctorFinder;

