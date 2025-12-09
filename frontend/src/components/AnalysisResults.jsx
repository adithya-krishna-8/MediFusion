import { Shield, Leaf } from 'lucide-react';

const AnalysisResults = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-2">Analysis Results</h2>
      <p className="text-gray-400 mb-6">{data.diagnosis_summary}</p>

      <div className="space-y-4">
        {data.conditions.map((condition, index) => (
          <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-blue-400">
                {condition.name}
              </h3>
              <span className={`text-sm font-bold px-2 py-1 rounded ${
                condition.confidence > 70 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {condition.confidence}% Match
              </span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full mb-3">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${condition.confidence}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-300">{condition.reasoning}</p>
          </div>
        ))}
      </div>

      {/* Precautions and Lifestyle Tips - 2 Column Grid */}
      {(data.precautions && data.precautions.length > 0) || (data.lifestyle_tips && data.lifestyle_tips.length > 0) ? (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Precautions Card */}
          {data.precautions && data.precautions.length > 0 && (
            <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Precautions</h3>
              </div>
              <ul className="space-y-2">
                {data.precautions.map((precaution, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span>{precaution}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lifestyle & Diet Card */}
          {data.lifestyle_tips && data.lifestyle_tips.length > 0 && (
            <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Leaf className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Lifestyle & Diet</h3>
              </div>
              <ul className="space-y-2">
                {data.lifestyle_tips.map((tip, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-green-400 mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-6 pt-4 border-t border-gray-800">
        <p className="text-sm text-gray-500">Recommended Specialist:</p>
        <span className="inline-block mt-1 bg-teal-900/50 text-teal-300 px-3 py-1 rounded-md text-sm border border-teal-800">
          {data.recommended_specialist}
        </span>
      </div>
    </div>
  );
};

export default AnalysisResults;

