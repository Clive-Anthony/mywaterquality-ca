// CWQI score gauge component
import { useMemo } from 'react';

export default function CWQIGauge({ title, score, rating, totalTests, failedTests, type, showScale = true }) {
  // Calculate gauge properties
  const gaugeProps = useMemo(() => {
    const normalizedScore = Math.max(0, Math.min(100, score));
    const circumference = 2 * Math.PI * 45; // radius = 45
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;
    
    // Color based on score
    let color = '#059669'; // green
    if (score < 45) color = '#DC2626'; // red
    else if (score < 65) color = '#F59E0B'; // orange/yellow
    else if (score < 80) color = '#2563EB'; // blue
    else if (score < 89) color = '#0D9488'; // teal
    else if (score < 95) color = '#059669'; // green
    
    return {
      normalizedScore,
      strokeDasharray,
      strokeDashoffset,
      color
    };
  }, [score]);

  const getScoreDescription = (score) => {
    if (score >= 95) return 'Excellent water quality with virtually no concerns';
    if (score >= 89) return 'Very good water quality with minimal issues';
    if (score >= 80) return 'Good water quality with minor concerns';
    if (score >= 65) return 'Fair water quality - some parameters exceed guidelines';
    if (score >= 45) return 'Marginal water quality - treatment may be needed';
    return 'Poor water quality - immediate action recommended';
  };

  const getRecommendation = (score, type, failedTests) => {
    const isHealth = type === 'health';
    
    if (failedTests === 0) {
      return `All ${isHealth ? 'health-related' : 'aesthetic and operational'} parameters are within acceptable limits.`;
    }
    
    if (isHealth) {
      return 'Some health-related parameters exceed safe limits. We strongly recommend consulting with a water treatment professional.';
    } else {
      return 'Some parameters exceed recommended limits. These may affect taste, odor, or water system performance.';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{title}</h3>
      
      <div className="flex items-center justify-between mb-6">
        {/* Gauge SVG */}
        <div className="relative">
          <svg width="120" height="120" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="45"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="45"
              stroke={gaugeProps.color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={gaugeProps.strokeDasharray}
              strokeDashoffset={gaugeProps.strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* Score in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{Math.round(score)}</div>
              <div className="text-xs text-gray-500">/ 100</div>
            </div>
          </div>
        </div>

        {/* Score Details */}
        <div className="flex-1 ml-6">
          <div className="mb-3">
            <div className="flex items-center">
              <span className="text-2xl font-bold" style={{ color: gaugeProps.color }}>
                {rating}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {getScoreDescription(score)}
            </p>
          </div>
          
          <div className="text-sm text-gray-500">
            <div className="mb-1">
              <strong>{totalTests - failedTests}</strong> of <strong>{totalTests}</strong> parameters passed
            </div>
            {failedTests > 0 && (
              <div className="text-red-600">
                <strong>{failedTests}</strong> parameter{failedTests !== 1 ? 's' : ''} exceed{failedTests === 1 ? 's' : ''} guidelines
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className={`rounded-lg p-4 ${
        failedTests === 0 ? 'bg-green-50 border border-green-200' : 
        type === 'health' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {failedTests === 0 ? (
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className={`h-5 w-5 ${type === 'health' ? 'text-red-400' : 'text-yellow-400'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h4 className={`text-sm font-medium ${
              failedTests === 0 ? 'text-green-800' :
              type === 'health' ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {failedTests === 0 ? 'Continue Monitoring' :
               type === 'health' ? 'Actions Needed' : 'Consider Treatment'}
            </h4>
            <p className={`mt-1 text-sm ${
              failedTests === 0 ? 'text-green-700' :
              type === 'health' ? 'text-red-700' : 'text-yellow-700'
            }`}>
              {getRecommendation(score, type, failedTests)}
            </p>
          </div>
        </div>
      </div>

      {/* Score Scale Reference - Only show if showScale is true */}
      {showScale && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">CWQI Score Scale</h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              <span>95-100: Excellent</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-teal-500 mr-2"></div>
              <span>89-94: Very Good</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
              <span>80-88: Good</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
              <span>65-79: Fair</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
              <span>45-64: Marginal</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              <span>0-44: Poor</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}