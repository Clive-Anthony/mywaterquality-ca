// src/components/AdminReportTesting.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AdminReportTesting() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    sampleNumber: '',
    customerInfo: {
      firstName: 'John',
      lastName: 'Smith',
      kitCode: 'TEST-001'
    },
    testKitInfo: {
      name: 'Advanced Water Test Kit',
      id: 'a69fd2ca-232f-458e-a240-7e36f50ffa2b'
    }
  });
  const [availableSamples, setAvailableSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [testKits, setTestKits] = useState([]);

  // Load available sample numbers on component mount
  useEffect(() => {
    loadAvailableSamples();
    loadTestKits();
  }, []);

  const loadAvailableSamples = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_test_results_with_parameters')
        .select('sample_number')
        .not('sample_number', 'is', null)
        .order('sample_number');

      if (error) throw error;

      // Get unique sample numbers
      const uniqueSamples = [...new Set(data.map(row => row.sample_number))];
      setAvailableSamples(uniqueSamples);
    } catch (err) {
      console.error('Error loading available samples:', err);
      setError('Failed to load available sample numbers');
    }
  };

  const loadTestKits = async () => {
    try {
      const { data, error } = await supabase
        .from('test_kits')
        .select('*')
        .eq('environment','prod')
        .order('name');
  
      if (error) throw error;
  
      setTestKits(data || []);
    } catch (err) {
      console.error('Error loading test kits:', err);
      // Don't set error state for this as it's not critical
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('customerInfo.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        customerInfo: {
          ...prev.customerInfo,
          [field]: value
        }
      }));
    } else if (name.startsWith('testKitInfo.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        testKitInfo: {
          ...prev.testKitInfo,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear messages when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const validateForm = () => {
    if (!formData.sampleNumber.trim()) {
      setError('Please select or enter a sample number');
      return false;
    }
    
    if (!formData.customerInfo.firstName.trim()) {
      setError('Please enter customer first name');
      return false;
    }
    
    if (!formData.customerInfo.lastName.trim()) {
      setError('Please enter customer last name');
      return false;
    }
    
    if (!formData.customerInfo.kitCode.trim()) {
      setError('Please enter kit code');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Call test report generation function
      const response = await fetch('/.netlify/functions/test-report-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          sampleNumber: formData.sampleNumber,
          customerInfo: formData.customerInfo,
          testKitInfo: formData.testKitInfo
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate test report');
      }

      const result = await response.json();
      
      // Convert base64 to blob and download
      const pdfBlob = base64ToBlob(result.pdfBase64, 'application/pdf');
      const downloadUrl = URL.createObjectURL(pdfBlob);
      
      // Create download link and click it
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(downloadUrl);
      
      setSuccess(`Test report generated and downloaded successfully: ${result.filename}`);
      
    } catch (err) {
      console.error('Error generating test report:', err);
      setError(err.message || 'Failed to generate test report');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert base64 to blob
  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          <h3 className="text-lg sm:text-xl leading-6 font-medium text-gray-900">
            Test Report Generation
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Generate test reports for design and formatting verification. Reports are not saved to storage.
          </p>
        </div>

        {/* Test Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Sample Number Selection */}
          <div>
            <label htmlFor="sampleNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Sample Number <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <select
                id="sampleNumber"
                name="sampleNumber"
                value={formData.sampleNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              >
                <option value="">Select an available sample number...</option>
                {availableSamples.map((sample, index) => (
                  <option key={index} value={sample}>
                    {sample}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Or enter a custom sample number in the field below
              </p>
              <input
                type="text"
                name="sampleNumber"
                value={formData.sampleNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter sample number manually"
              />
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Customer Information</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="customerInfo.firstName"
                  value={formData.customerInfo.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="customerInfo.lastName"
                  value={formData.customerInfo.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="kitCode" className="block text-sm font-medium text-gray-700 mb-1">
                Kit Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="kitCode"
                name="customerInfo.kitCode"
                value={formData.customerInfo.kitCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., TEST-001, MWQ-1234"
                required
              />
            </div>
          </div>

          {/* Test Kit Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Test Kit Information</h4>
            
            <div>
              <label htmlFor="testKitName" className="block text-sm font-medium text-gray-700 mb-1">
                Test Kit Type
              </label>
              <select
                id="testKitName"
                name="testKitInfo.name"
                value={formData.testKitInfo.name}
                onChange={(e) => {
                    const selectedKit = testKits.find(kit => kit.name === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      testKitInfo: {
                        name: e.target.value,
                        id: selectedKit ? (selectedKit.id || selectedKit.test_kit_uuid || selectedKit.uuid) : ''
                      }
                    }));
                  }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                {testKits.map((kit) => (
                    <option key={kit.id || kit.test_kit_uuid || kit.uuid} value={kit.name}>
                        {kit.name}
                    </option>
                    ))}
                </select>
              <p className="mt-1 text-xs text-gray-500">
                This affects which bacteriological cards are shown and report formatting
              </p>
            </div>
          </div>

          {/* Current Values Display */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Current Test Values</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Sample:</span>
                <span className="ml-2 text-gray-600">{formData.sampleNumber || 'Not selected'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Customer:</span>
                <span className="ml-2 text-gray-600">
                  {formData.customerInfo.firstName} {formData.customerInfo.lastName}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Kit Code:</span>
                <span className="ml-2 text-gray-600">{formData.customerInfo.kitCode}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Test Kit:</span>
                <span className="ml-2 text-gray-600">{formData.testKitInfo.name}</span>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-1 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success</h3>
                  <div className="mt-1 text-sm text-green-700">{success}</div>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Generating Report</h3>
                  <div className="mt-1 text-sm text-blue-700">
                    Please wait while the test report is being generated...
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Test Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}