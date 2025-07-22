// src/components/AdminReportsUpload.jsx - Updated with Report Type Selection
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AdminReportsUpload() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('kit'); // 'kit' or 'one_off'
const [formData, setFormData] = useState({
  kitRegistrationId: '',
  kitRegistrationType: '',
  workOrderNumber: '',
  sampleNumber: ''
});

// Customer and Kit info for unregistered/one-off reports
const [customCustomerInfo, setCustomCustomerInfo] = useState({
  firstName: '',
  lastName: '',
  email: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  location: ''
});

const [customKitInfo, setCustomKitInfo] = useState({
  kitCode: '',
  testKitName: 'Advanced Water Test Kit',
  testKitId: ''
});

const [selectedFile, setSelectedFile] = useState(null);
const [availableKits, setAvailableKits] = useState({
  registered: [],
  unregistered: []
});
const [selectedKitInfo, setSelectedKitInfo] = useState(null);
  const [testKits, setTestKits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [allTestKits, setAllTestKits] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load data on component mount
  useEffect(() => {
    loadKitsData();
    loadTestKitTypes();
    loadAllTestKits();
  }, []);

  // Reset form when report type changes
  useEffect(() => {
    resetForm();
  }, [reportType]);

  const resetForm = () => {
    setFormData({
      kitRegistrationId: '',
      kitRegistrationType: '',
      workOrderNumber: '',
      sampleNumber: ''
    });
    setCustomCustomerInfo({
      firstName: '',
      lastName: '',
      email: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      location: ''
    });
    setCustomKitInfo({
      kitCode: '',
      testKitName: 'Advanced Water Test Kit',
      testKitId: ''
    });
    setSelectedKitInfo(null);
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    
    // Reset file input
    const fileInput = document.getElementById('file-upload');
    if (fileInput) fileInput.value = '';
  };

  const loadKitsData = async () => {
    try {
      setLoading(true);
      
      // Load kits that are awaiting results and not yet reported
      const { data: kitsData, error: kitsError } = await supabase
        .from('vw_test_kits_admin')
        .select('*')
        .is('work_order_number', null)
        .is('sample_number', null) 
        .is('report_id', null)
        .not('kit_status', 'in', '("report_generated","report_delivered")')
        .order('kit_created_at', { ascending: false });
  
      if (kitsError) {
        throw kitsError;
      }
  
      // Separate registered and unregistered kits based on registration status
      const registered = [];
      const unregistered = [];
      
      (kitsData || []).forEach(kit => {
        const formattedKit = {
          id: kit.kit_id,
          type: kit.kit_type,
          displayId: kit.kit_code,
          productName: kit.test_kit_name,
          orderNumber: kit.order_number,
          customerName: `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim(),
          customerEmail: kit.customer_email || '',
          createdAt: kit.kit_created_at,
          isRegistered: kit.is_registered
        };
  
        // Use is_registered field to determine if registered or unregistered
        if (kit.is_registered || kit.kit_type === 'legacy') {
          registered.push(formattedKit);
        } else {
          unregistered.push(formattedKit);
        }
      });
  
      setAvailableKits({
        registered,
        unregistered
      });
  
    } catch (err) {
      console.error('Error loading kits data:', err);
      setError('Failed to load kits data');
    } finally {
      setLoading(false);
    }
  };

  // Debug logging - you can remove this after testing
useEffect(() => {
  console.log('Available kits state:', availableKits);
  console.log('Report type:', reportType);
}, [availableKits, reportType]);

  const loadTestKitTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('test_kits')
        .select('*')
        .eq('environment', 'prod')
        .order('name');

      if (error) throw error;
      setTestKits(data || []);
    } catch (err) {
      console.error('Error loading test kits:', err);
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
      // Find the selected kit from both registered and unregistered lists
      const allKits = [...availableKits.registered, ...availableKits.unregistered];
      const selectedKit = allKits.find(kit => kit.id === value);
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        kitRegistrationType: selectedKit ? selectedKit.type : ''
      }));
      
      setSelectedKitInfo(selectedKit || null);
      
      // Reset custom info when switching kits
      if (selectedKit) {
        setCustomCustomerInfo({
          firstName: '',
          lastName: '', 
          email: '',
          address: '',
          city: '',
          province: '',
          postalCode: '',
          location: ''
        });
        setCustomKitInfo({
          kitCode: '',
          testKitName: 'Advanced Water Test Kit',
          testKitId: ''
        });
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleCustomerInfoChange = (e) => {
    const { name, value } = e.target;
    setCustomCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleKitInfoChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'testKitName') {
      // Find the selected test kit to get its ID
      const selectedKit = testKits.find(kit => kit.name === value);
      setCustomKitInfo(prev => ({
        ...prev,
        testKitName: value,
        testKitId: selectedKit ? (selectedKit.id || selectedKit.test_kit_uuid || selectedKit.uuid) : ''
      }));
    } else {
      setCustomKitInfo(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid Excel file (.xlsx, .xls) or CSV file (.csv)');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };

  const validateForm = () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return false;
    }

    if (reportType === 'kit') {
      if (!formData.kitRegistrationId) {
        setError('Please select a kit');
        return false;
      }
      // For unregistered kits, kit code is required if custom info is provided
      if (selectedKitInfo && !selectedKitInfo.isRegistered && customKitInfo.kitCode.trim() === '') {
        setError('Please enter a kit code for unregistered kits');
        return false;
      }
    } else if (reportType === 'one_off') {
      // For one-off reports, require customer info and kit info
      if (!customCustomerInfo.firstName.trim()) {
        setError('Please enter customer first name');
        return false;
      }
      if (!customCustomerInfo.lastName.trim()) {
        setError('Please enter customer last name');
        return false;
      }
      if (!customKitInfo.kitCode.trim()) {
        setError('Please enter a kit code');
        return false;
      }
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('reportType', reportType);
      
      // Add common fields
      uploadFormData.append('workOrderNumber', formData.sampleNumber || '');
      uploadFormData.append('sampleNumber', formData.workOrderNumber || '');
      
      if (reportType === 'kit') {
        uploadFormData.append('kitRegistrationId', formData.kitRegistrationId);
        uploadFormData.append('kitRegistrationType', formData.kitRegistrationType);
        
        // Determine actual report type based on kit registration status
        const actualReportType = selectedKitInfo?.isRegistered ? 'registered' : 'unregistered';
        uploadFormData.append('reportType', actualReportType);
        
        // Add custom info for unregistered kits
        if (!selectedKitInfo?.isRegistered) {
          uploadFormData.append('customCustomerInfo', JSON.stringify(customCustomerInfo));
          uploadFormData.append('customKitInfo', JSON.stringify(customKitInfo));
        }
      } else if (reportType === 'one_off') {
        uploadFormData.append('customCustomerInfo', JSON.stringify(customCustomerInfo));
        uploadFormData.append('customKitInfo', JSON.stringify(customKitInfo));
        uploadFormData.append('kitRegistrationId', ''); // No kit registration for one-off
        uploadFormData.append('kitRegistrationType', 'one_off');
        uploadFormData.append('reportType', 'one_off');
      }

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
      resetForm();
      
      // Reload data
      loadKitsData();
      loadAllTestKits();
      
    } catch (err) {
      console.error('Error uploading test results:', err);
      setError(err.message || 'Failed to upload test results');
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  const handleDownloadReport = async (reportId, kitCode) => {
    try {
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

      if (!report?.pdf_file_url) {
        setError('Report PDF not available');
        return;
      }

      let fileName;
      if (report.pdf_file_url.includes('/')) {
        fileName = report.pdf_file_url.split('/').pop();
      } else {
        fileName = `My-Water-Quality-Report-${kitCode}.pdf`;
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('generated-reports')
        .createSignedUrl(fileName, 3600);

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        setError('Failed to generate download link');
        return;
      }

      if (signedUrlData?.signedUrl) {
        window.open(signedUrlData.signedUrl, '_blank');
      } else {
        setError('Failed to generate download link');
      }
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report');
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

  const getKitDisplayInfo = (kit) => {
    const statusBadge = kit.kitStatus ? ` (${kit.kitStatus})` : '';
    const typeBadge = kit.type === 'legacy' ? ' [Legacy]' : '';
    
    return {
      label: `${kit.displayId} - ${kit.productName} - ${kit.orderNumber}${typeBadge}${statusBadge}`,
      subtitle: kit.customerName || 'No customer info',
      type: kit.type
    };
  };

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

        {/* Report Type Selection */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Report Type</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reportType"
                  value="kit"
                  checked={reportType === 'kit'}
                  onChange={(e) => setReportType(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Existing Kit</span>
                <span className="ml-2 text-xs text-gray-500">(Report for an existing kit in the system)</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reportType"
                  value="one_off"
                  checked={reportType === 'one_off'}
                  onChange={(e) => setReportType(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">One-off Report</span>
                <span className="ml-2 text-xs text-gray-500">(Independent report, not tied to existing kit)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Kit Selection for Registered/Unregistered */}
{(reportType === 'registered' || reportType === 'unregistered') && (
  <div>
    <label htmlFor="kitRegistrationId" className="block text-sm font-medium text-gray-700 mb-2">
      {reportType === 'registered' ? 'Registered Kit' : 'Unregistered Kit'} <span className="text-red-500">*</span>
    </label>
    <select
      id="kitRegistrationId"
      name="kitRegistrationId"
      value={formData.kitRegistrationId}
      onChange={handleInputChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      required
    >
      <option value="">
        Select a {reportType === 'registered' ? 'registered' : 'unregistered'} kit awaiting results...
      </option>
      {(reportType === 'registered' ? registeredKits : unregisteredKits).map((kit) => {
        const displayInfo = getKitDisplayInfo(kit);
        return (
          <option key={kit.id} value={kit.id}>
            {displayInfo.label}
            {kit.customerName && ` - ${kit.customerName}`}
            {reportType === 'unregistered' && ' [UNREGISTERED]'}
          </option>
        );
      })}
    </select>
    {((reportType === 'registered' ? registeredKits : unregisteredKits).length === 0) && !loading && (
      <p className="mt-2 text-sm text-gray-500">
        No {reportType === 'registered' ? 'registered' : 'unregistered'} kits available for results upload.
        {loading && " Loading available kits..."}
      </p>
    )}
  </div>
)}

          {/* Customer Information for Unregistered/One-off */}
          {((reportType === 'kit' && selectedKitInfo && !selectedKitInfo.isRegistered) || reportType === 'one_off') && (
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900">
                Customer Information 
                {reportType === 'one_off' && <span className="text-red-500">*</span>}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name {reportType === 'one_off' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={customCustomerInfo.firstName}
                    onChange={handleCustomerInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required={reportType === 'one_off'}
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name {reportType === 'one_off' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={customCustomerInfo.lastName}
                    onChange={handleCustomerInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required={reportType === 'one_off'}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={customCustomerInfo.email}
                    onChange={handleCustomerInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Location/Address
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={customCustomerInfo.location}
                    onChange={handleCustomerInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., Toronto, ON or 123 Main St, Toronto, ON"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Kit Information for Unregistered/One-off */}
          {((reportType === 'kit' && selectedKitInfo && !selectedKitInfo.isRegistered) || reportType === 'one_off') && (
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900">Kit Information</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="kitCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Kit Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="kitCode"
                    name="kitCode"
                    value={customKitInfo.kitCode}
                    onChange={handleKitInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., MWQ-001, CUSTOM-123"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="testKitName" className="block text-sm font-medium text-gray-700 mb-1">
                    Test Kit Type
                  </label>
                  <select
                    id="testKitName"
                    name="testKitName"
                    value={customKitInfo.testKitName}
                    onChange={handleKitInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {testKits.map((kit) => (
                      <option key={kit.id || kit.test_kit_uuid || kit.uuid} value={kit.name}>
                        {kit.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Selected Kit Info Display */}
          {reportType === 'kit' && selectedKitInfo && (
            <div className={`border rounded-md p-4 ${selectedKitInfo.isRegistered ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <h4 className={`text-sm font-medium mb-2 ${selectedKitInfo.isRegistered ? 'text-blue-900' : 'text-yellow-900'}`}>
                Selected Kit Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className={`font-medium ${selectedKitInfo.isRegistered ? 'text-blue-800' : 'text-yellow-800'}`}>Kit Code:</span>
                  <span className={`ml-2 ${selectedKitInfo.isRegistered ? 'text-blue-700' : 'text-yellow-700'}`}>{selectedKitInfo.displayId}</span>
                </div>
                <div>
                  <span className={`font-medium ${selectedKitInfo.isRegistered ? 'text-blue-800' : 'text-yellow-800'}`}>Product:</span>
                  <span className={`ml-2 ${selectedKitInfo.isRegistered ? 'text-blue-700' : 'text-yellow-700'}`}>{selectedKitInfo.productName}</span>
                </div>
                <div>
                  <span className={`font-medium ${selectedKitInfo.isRegistered ? 'text-blue-800' : 'text-yellow-800'}`}>Order:</span>
                  <span className={`ml-2 ${selectedKitInfo.isRegistered ? 'text-blue-700' : 'text-yellow-700'}`}>{selectedKitInfo.orderNumber}</span>
                </div>
                {selectedKitInfo.customerName && (
                  <div>
                    <span className={`font-medium ${selectedKitInfo.isRegistered ? 'text-blue-800' : 'text-yellow-800'}`}>Customer:</span>
                    <span className={`ml-2 ${selectedKitInfo.isRegistered ? 'text-blue-700' : 'text-yellow-700'}`}>{selectedKitInfo.customerName}</span>
                  </div>
                )}
                <div>
                  <span className={`font-medium ${selectedKitInfo.isRegistered ? 'text-blue-800' : 'text-yellow-800'}`}>Type:</span>
                  <span className={`ml-2 ${selectedKitInfo.isRegistered ? 'text-blue-700' : 'text-yellow-700'} capitalize`}>
                    {selectedKitInfo.type}
                    {selectedKitInfo.type === 'legacy' && ' Kit'}
                  </span>
                </div>
                <div>
                  <span className={`font-medium ${selectedKitInfo.isRegistered ? 'text-blue-800' : 'text-yellow-800'}`}>Registration Status:</span>
                  <span className={`ml-2 font-medium ${selectedKitInfo.isRegistered ? 'text-green-700' : 'text-red-700'}`}>
                    {selectedKitInfo.isRegistered ? 'Registered' : 'Unregistered'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="border-t border-gray-200 pt-6">
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

          {/* Error/Success/Processing Messages */}
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
          <div className="flex justify-end border-t border-gray-200 pt-6">
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
                  Upload & Process Results
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
              All Test Kits & Reports
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
                  Registration Status
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{kit.kit_code || 'N/A'}</div>
                      <div className="text-sm text-gray-500">#{kit.order_number || 'N/A'}</div>
                      <div className="text-xs text-gray-400">
                        {kit.kit_type === 'legacy' ? 'Legacy Kit' : 'Regular Kit'}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {kit.kit_type === 'legacy' ? (
                          `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim() || 'Legacy Customer'
                        ) : (
                          `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim() || 'Unknown Customer'
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {kit.customer_email || 'No email available'}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      kit.is_registered || kit.kit_type === 'legacy'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {kit.is_registered || kit.kit_type === 'legacy' ? 'Registered' : 'Unregistered'}
                    </span>
                  </td>
                  
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