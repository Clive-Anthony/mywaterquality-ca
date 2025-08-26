// src/components/ParameterModal.jsx - Modal for parameter details and health considerations
import { useEffect } from 'react';

export default function ParameterModal({ parameter, onClose, formatLabResult }) {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const isHealthParameter = parameter.parameter_category === 'health';
  const isAOParameter = parameter.parameter_category === 'ao';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {parameter.parameter_name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="ml-4 bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Parameter Details */}
          <div className="space-y-6">
            {/* Results Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Your Result</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {parameter.result_display_value || formatLabResult(parameter)} {parameter.result_units || ''}
                  </dd>
                </div>
                {(isHealthParameter || isAOParameter) && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      {isHealthParameter ? 'Health Guideline' : 'Aesthetic Guideline'}
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-gray-900">
                      {isHealthParameter 
                        ? (parameter.mac_display_value || 'No Standard')
                        : (parameter.ao_display_value || 'No Standard')
                      } {parameter.result_units && (parameter.mac_display_value || parameter.ao_display_value) !== 'No Standard' ? parameter.result_units : ''}
                    </dd>
                  </div>
                )}
                {(isHealthParameter || isAOParameter) && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className={`mt-1 text-lg font-semibold ${
                      parameter.compliance_status === 'EXCEEDS_MAC' || 
                      parameter.compliance_status === 'EXCEEDS_AO' ||
                      (parameter.compliance_status === 'AO_RANGE_VALUE' && parameter.overall_compliance_status === 'WARNING')
                        ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {parameter.compliance_status === 'EXCEEDS_MAC' || 
                       parameter.compliance_status === 'EXCEEDS_AO' ||
                       (parameter.compliance_status === 'AO_RANGE_VALUE' && parameter.overall_compliance_status === 'WARNING')
                        ? 'Exceeds Limit' : 'Within Limit'}
                    </dd>
                  </div>
                )}
              </div>
            </div>

            {/* Health Effects */}
            {isHealthParameter && parameter.health_effects && (
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Health Considerations</h4>
                <p className="text-gray-700 leading-relaxed">
                  {parameter.health_effects}
                </p>
              </div>
            )}

            {/* Aesthetic Considerations */}
            {isAOParameter && (parameter.aesthetic_considerations || parameter.description) && (
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Aesthetic & Operational Considerations</h4>
                <p className="text-gray-700 leading-relaxed">
                  {parameter.aesthetic_considerations || parameter.description}
                </p>
              </div>
            )}

            {/* Parameter Description for General Parameters */}
            {!isHealthParameter && !isAOParameter && parameter.description && (
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">Parameter Description</h4>
                <p className="text-gray-700 leading-relaxed">
                  {parameter.description}
                </p>
              </div>
            )}

            {/* Warning if exceeds limits */}
            {(parameter.compliance_status === 'EXCEEDS_MAC' || 
              parameter.compliance_status === 'EXCEEDS_AO' ||
              (parameter.compliance_status === 'AO_RANGE_VALUE' && parameter.overall_compliance_status === 'WARNING')) && (
              <div className={`rounded-lg p-4 ${
                isHealthParameter ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className={`h-5 w-5 ${
                      isHealthParameter ? 'text-red-400' : 'text-yellow-400'
                    }`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-lg font-bold ${
                      isHealthParameter ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      {isHealthParameter ? 'Health Concern Detected' : 'Aesthetic/Operational Concern'}
                    </h3>
                    <div className={`mt-1 text-sm ${
                      isHealthParameter ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      {isHealthParameter 
                        ? 'This parameter exceeds health guidelines. Consider consulting with a water treatment professional.'
                        : 'This parameter exceeds aesthetic guidelines. While not necessarily a health concern, it may affect taste, odor, or water system performance.'
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-lg font-bold text-blue-900 mb-3">Need Help?</h4>
              <p className="text-blue-700 text-sm mb-3">
                If you have questions about this parameter or need assistance with water treatment options:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href="/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-200 hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Contact My Water Quality
                </a>
                <a
                  href="/about-canadas-drinking-water"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Learn About Water Standards
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}