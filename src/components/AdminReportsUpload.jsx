// src/components/AdminReportsUpload.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AdminReportsUpload() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    kitRegistrationId: '',
    kitRegistrationType: '', // 'regular' or 'legacy'
    workOrderNumber: '',
    sampleNumber: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [registeredKits, setRegisteredKits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [allTestKits, setAllTestKits] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper function for kit display info
  const getKitDisplayInfo = (kit) => {
    const statusBadge = kit.kitStatus ? ` (${kit.kitStatus})` : '';
    const typeBadge = kit.type === 'legacy' ? ' [Legacy]' : '';
    
    return {
      label: `${kit.displayId} - ${kit.productName} - ${kit.orderNumber}${typeBadge}${statusBadge}`,
      subtitle: kit.customerName || 'No customer info',
      type: kit.type
    };
  };

  // Add the report download handler function
  const handleDownloadReport = async (reportId, kitCode) => {
    try {
      // Get the report details to find the PDF URL
      const { data: report, error } = await supabase
        .from('reports')
        .select('pdf_file_url')
        .eq('report_id', reportId)
        .single();

      if (error) {
        console.error('Error fetching report:', error);
        setError('Failed to fetch report details');
        return;
      }

      if (report?.pdf_file_url) {
        // Open the PDF in a new tab for download
        window.open(report.pdf_file_url, '_blank');
      } else {
        setError('Report PDF not available');
      }
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report');
    }
  };

// Load registered kits on component mount
useEffect(() => {
    loadRegisteredKits();
    loadAllTestKits();
  }, []);

  const loadRegisteredKits = async () => {
    try {
      setLoading(true);
      
      // Load kits from the admin view that don't have results yet
      const { data: kitsData, error: kitsError } = await supabase
        .from('vw_test_kits_admin')
        .select('*')
        .is('work_order_number', null)
        .is('sample_number', null)
        .is('report_id', null)
        .order('kit_created_at', { ascending: false });

      if (kitsError) {
        throw kitsError;
      }

      // Format the kits for the dropdown
      const formattedKits = (kitsData || []).map(kit => ({
        id: kit.kit_id,
        type: kit.kit_type,
        displayId: kit.kit_code,
        productName: kit.test_kit_name,
        orderNumber: kit.order_number,
        customerName: `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim(),
        customerEmail: kit.customer_email || '',
        createdAt: kit.kit_created_at,
        // Additional fields for display
        kitStatus: kit.kit_status,
        isRegistered: kit.is_registered
      }));

      // Filter to only show registered kits (for regular kits) or all legacy kits
      const availableKits = formattedKits.filter(kit => {
        if (kit.type === 'legacy') {
          return true; // Legacy kits are always considered "registered"
        } else {
          return kit.isRegistered; // Regular kits must be registered by customer
        }
      });

      setRegisteredKits(availableKits);

    } catch (err) {
      console.error('Error loading registered kits:', err);
      setError('Failed to load registered kits');
    } finally {
      setLoading(false);
    }
  };
  
  const loadAllTestKits = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_test_kits_admin')
        .select('*')
        .order('kit_created_at', { ascending: false });
  
      if (error) throw error;
      setAllTestKits(data || []);
    } catch (err) {
      console.error('Error loading all test kits:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'kitRegistrationId') {
      // When kit is selected, also set the type
      const selectedKit = registeredKits.find(kit => kit.id === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        kitRegistrationType: selectedKit ? selectedKit.type : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear any existing error when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid Excel file (.xlsx, .xls) or CSV file (.csv)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };

  const validateForm = () => {
    if (!formData.kitRegistrationId) {
      setError('Please select a registered kit');
      return false;
    }
    
    // if (!formData.workOrderNumber.trim()) {
    //   setError('Please enter a work order number');
    //   return false;
    // }
    
    // if (!formData.sampleNumber.trim()) {
    //   setError('Please enter a sample number');
    //   return false;
    // }
    
    if (!selectedFile) {
      setError('Please select a file to upload');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

    // Create form data for file upload
    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    uploadFormData.append('kitRegistrationId', formData.kitRegistrationId);
    uploadFormData.append('kitRegistrationType', formData.kitRegistrationType);
    // SWAP THESE - the form labels are correct but the values are being sent backwards
    uploadFormData.append('workOrderNumber', formData.sampleNumber);  // Send sample number as work order
    uploadFormData.append('sampleNumber', formData.workOrderNumber);  // Send work order as sample number

      // Call Netlify function to process the upload
      const response = await fetch('/.netlify/functions/process-test-results', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: uploadFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process test results');
      }

      const result = await response.json();
      
      setSuccess(`Test results uploaded successfully! Report ID: ${result.reportId}`);
      
      // Reset form
        setFormData({
            kitRegistrationId: '',
            kitRegistrationType: '',
            workOrderNumber: '',
            sampleNumber: ''
        });
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
      
      // Reload kit registrations to show updated data
      loadRegisteredKits();
      loadAllTestKits();
      
    } catch (err) {
      console.error('Error uploading test results:', err);
      setError(err.message || 'Failed to upload test results');
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  const filteredTestKits = allTestKits.filter(kit => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      kit.order_number?.toLowerCase().includes(query) ||
      kit.customer_first_name?.toLowerCase().includes(query) ||
      kit.customer_last_name?.toLowerCase().includes(query) ||
      kit.customer_email?.toLowerCase().includes(query) ||
      kit.kit_code?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          <h3 className="text-lg sm:text-xl leading-6 font-medium text-gray-900">
            Upload Test Results
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload laboratory test results and generate customer reports automatically.
          </p>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Registered Kit Selection */}
            <div>
            <label htmlFor="kitRegistrationId" className="block text-sm font-medium text-gray-700 mb-2">
                Registered Kit <span className="text-red-500">*</span>
            </label>
            <select
              id="kitRegistrationId"
              name="kitRegistrationId"
              value={formData.kitRegistrationId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="">Select a registered kit awaiting results...</option>
              {registeredKits.map((kit) => (
                <option key={kit.id} value={kit.id}>
                  {kit.displayId} - {kit.productName} - {kit.orderNumber}
                  {kit.customerName && ` - ${kit.customerName}`}
                  {kit.type === 'legacy' ? ' (Legacy)' : ''}
                </option>
              ))}
            </select>
            {registeredKits.length === 0 && !loading && (
              <p className="mt-2 text-sm text-gray-500">
                No registered kits available for results upload. Kits must be registered by customers before results can be uploaded.
                {loading && " Loading available kits..."}
              </p>
            )}
            </div>
        
        {/* Selected Kit Info Display */}
        {(() => {
          const selectedKitInfo = registeredKits.find(kit => kit.id === formData.kitRegistrationId);
          return selectedKitInfo ? (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Kit Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Kit Code:</span>
                  <span className="ml-2 text-blue-700">{selectedKitInfo.displayId}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Product:</span>
                  <span className="ml-2 text-blue-700">{selectedKitInfo.productName}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Order:</span>
                  <span className="ml-2 text-blue-700">{selectedKitInfo.orderNumber}</span>
                </div>
                {selectedKitInfo.customerName && (
                  <div>
                    <span className="font-medium text-blue-800">Customer:</span>
                    <span className="ml-2 text-blue-700">{selectedKitInfo.customerName}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-blue-800">Type:</span>
                  <span className="ml-2 text-blue-700 capitalize">
                    {selectedKitInfo.type}
                    {selectedKitInfo.type === 'legacy' && ' Kit'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Status:</span>
                  <span className="ml-2 text-blue-700">{selectedKitInfo.kitStatus}</span>
                </div>
              </div>
            </div>
          ) : null;
        })()}

          {/* Work Order Number and Sample Number - Side by side on larger screens */}
          {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label htmlFor="workOrderNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Work Order Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="workOrderNumber"
                name="workOrderNumber"
                value={formData.workOrderNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter work order number"
                required
              />
            </div>

            <div>
              <label htmlFor="sampleNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Sample Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="sampleNumber"
                name="sampleNumber"
                value={formData.sampleNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter sample number"
                required
              />
            </div>
          </div> */}

          {/* File Upload */}
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Test Results File <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  Excel (.xlsx, .xls) or CSV files up to 10MB
                </p>
              </div>
            </div>
            
            {/* Show selected file */}
            {selectedFile && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-900">{selectedFile.name}</span>
                    <span className="text-xs text-blue-600 ml-2">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      document.getElementById('file-upload').value = '';
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
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

          {processing && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Processing</h3>
                  <div className="mt-1 text-sm text-blue-700">
                    Processing file and generating report... This may take a few moments.
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
                  Processing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* All Test Kits List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2 sm:mb-0">
              All Test Kits
            </h3>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search test kits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          {allTestKits.length > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              {allTestKits.length} total test kits
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chain of Custody
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTestKits.map((kit) => (
                <tr key={kit.kit_id} className="hover:bg-gray-50">
                  {/* Details Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{kit.kit_code || 'N/A'}</div>
                      <div className="text-sm text-gray-500">#{kit.order_number || 'N/A'}</div>
                    </div>
                  </td>
                  
                  {/* Customer Name Column - Handle missing customer info gracefully */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {kit.kit_type === 'legacy' ? (
                          // For legacy kits, show customer name from profiles if available
                          `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim() || 'Legacy Customer'
                        ) : (
                          // For regular kits, show full name or fallback
                          `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim() || 'Unknown Customer'
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {kit.customer_email || 'No email available'}
                      </div>
                    </div>
                  </td>
                  
                  {/* Chain of Custody Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {kit.chain_of_custody_url ? (
                      <button
                        onClick={() => window.open(kit.chain_of_custody_url, '_blank')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      >
                        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  
                  {/* Report Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {kit.has_report && kit.report_id ? (
                      <button
                        onClick={() => handleDownloadReport(kit.report_id, kit.kit_code)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                      >
                        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredTestKits.length === 0 && (
            <div className="text-center py-12">
              <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No test kits found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try adjusting your search criteria.' : 'No test kits available.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}