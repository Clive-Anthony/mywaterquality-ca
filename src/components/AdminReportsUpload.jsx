// src/components/AdminReportsUpload.jsx - Updated with Customer Email Functionality
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AdminReportsUpload() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('kit');
  const [formData, setFormData] = useState({
    kitRegistrationId: '',
    kitRegistrationType: '',
    workOrderNumber: '',
    sampleNumber: ''
  });
  const [kitSearchQuery, setKitSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [modalContext, setModalContext] = useState('approval');

  // Collapse/expand state
  const [isExpanded, setIsExpanded] = useState(false);

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
  const [selectedCoCFile, setSelectedCoCFile] = useState(null);
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

  // NEW: Customer email modal states
  const [showCustomerEmailModal, setShowCustomerEmailModal] = useState(false);
  const [selectedReportForEmail, setSelectedReportForEmail] = useState(null);
  const [customerEmailAddress, setCustomerEmailAddress] = useState('');
  const [sendingToCustomer, setSendingToCustomer] = useState(false);

  const [availableReportsForUpdate, setAvailableReportsForUpdate] = useState([]);
  const [selectedReportForUpdate, setSelectedReportForUpdate] = useState('');
  const [regeneratingReport, setRegeneratingReport] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadKitsData();
    loadTestKitTypes();
    loadAllTestKits();
    loadAvailableReportsForUpdate();
  }, []);

  // Reset form when report type changes
  useEffect(() => {
    resetForm();
  }, [reportType]);

  // NEW: Auto-dismiss success modal after 5 seconds
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
        setSuccessModalMessage('');
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

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
    setKitSearchQuery('');
    setShowDropdown(false);
    setSelectedCoCFile(null);
    
    // Reset file input
    const fileInput = document.getElementById('file-upload');
    const cocInput = document.getElementById('coc-upload');
    if (fileInput) fileInput.value = '';
    if (cocInput) cocInput.value = '';
  };

  const loadKitsData = async () => {
    try {
      setLoading(true);
      
      const { data: kitsData, error: kitsError } = await supabase
        .from('vw_test_kits_admin')
        .select('*')
        .is('work_order_number', null)
        .is('sample_number', null) 
        .is('report_id', null)
        .not('kit_status', 'in', '("report_generated","report_delivered")')
        .in('registration_status', ['registered', 'unregistered'])
        .order('kit_created_at', { ascending: false });
    
        if (kitsError) {
          throw kitsError;
        }
    
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
            isRegistered: kit.registration_status === 'registered'
          };

          if (kit.registration_status === 'registered') {
            registered.push(formattedKit);
          } else if (kit.registration_status === 'unregistered') {
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
        .select('*',)
        .order('kit_created_at', { ascending: false });

      if (error) throw error;
      setAllTestKits(data || []);
    } catch (err) {
      console.error('Error loading all test kits:', err);
    }
  };

  const loadAvailableReportsForUpdate = async () => {
  try {
    const { data: reportsData, error: reportsError } = await supabase
      .from('vw_test_kits_admin')
      .select('*')
      .not('work_order_number', 'is', null)
      .not('sample_number', 'is', null)
      .not('report_id', 'is', null)
      .order('kit_created_at', { ascending: false });

    if (reportsError) {
      throw reportsError;
    }

    setAvailableReportsForUpdate(reportsData || []);
  } catch (err) {
    console.error('Error loading available reports for update:', err);
    setError('Failed to load available reports');
  }
};


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'kitRegistrationId') {
      const allKits = [...availableKits.registered, ...availableKits.unregistered];
      const selectedKit = allKits.find(kit => kit.id === value);
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        kitRegistrationType: selectedKit ? selectedKit.type : ''
      }));
      
      setSelectedKitInfo(selectedKit || null);
      
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

  const handleReportRegeneration = async () => {
  if (!selectedReportForUpdate) {
    setError('Please select a report to regenerate');
    return;
  }

  setRegeneratingReport(true);
  setError(null);
  setSuccess(null);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    const selectedReport = availableReportsForUpdate.find(
      report => report.kit_id === selectedReportForUpdate
    );

    if (!selectedReport) {
      throw new Error('Selected report not found');
    }

    const response = await fetch('/.netlify/functions/regenerate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        kitId: selectedReport.kit_id,
        kitType: selectedReport.kit_type
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to regenerate report');
    }

    const result = await response.json();
    
    // Set context for regeneration and show customer email modal
    setModalContext('regeneration');
    setSelectedReportForEmail({
      reportId: result.reportId,
      kitCode: selectedReport.kit_code,
      customerName: `${selectedReport.customer_first_name || ''} ${selectedReport.customer_last_name || ''}`.trim(),
      defaultEmail: selectedReport.customer_email || ''
    });
    
    setCustomerEmailAddress(selectedReport.customer_email || '');
    setShowCustomerEmailModal(true);
    setSelectedReportForUpdate('');
    
    // Reload data
    loadAllTestKits();
    loadAvailableReportsForUpdate();
    
  } catch (err) {
    console.error('Error regenerating report:', err);
    setError(err.message || 'Failed to regenerate report');
  } finally {
    setRegeneratingReport(false);
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

  const handleCoCFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please select a valid PDF file for Chain of Custody');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setError('Chain of Custody file size must be less than 10MB');
        return;
      }
      
      setSelectedCoCFile(file);
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
      // For unregistered kits, require location
      if (selectedKitInfo && !selectedKitInfo.isRegistered) {
        if (!customCustomerInfo.location.trim()) {
          setError('Please enter sample location');
          return false;
        }
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
      
      uploadFormData.append('workOrderNumber', formData.sampleNumber || '');
      uploadFormData.append('sampleNumber', formData.workOrderNumber || '');
      
      // Add Chain of Custody file if selected
      if (selectedCoCFile) {
        uploadFormData.append('cocFile', selectedCoCFile);
      }
      
      if (reportType === 'kit') {
        uploadFormData.append('kitRegistrationId', formData.kitRegistrationId);
        uploadFormData.append('kitRegistrationType', formData.kitRegistrationType);
        
        const actualReportType = selectedKitInfo?.isRegistered ? 'registered' : 'unregistered';
        uploadFormData.append('reportType', actualReportType);
        
        if (!selectedKitInfo?.isRegistered) {
          uploadFormData.append('customCustomerInfo', JSON.stringify(customCustomerInfo));
          
          const actualKitInfo = {
            kitCode: selectedKitInfo.displayId,
            testKitName: selectedKitInfo.productName,
            testKitId: selectedKitInfo.testKitId || ''
          };
          uploadFormData.append('customKitInfo', JSON.stringify(actualKitInfo));
        }
      } else if (reportType === 'one_off') {
        uploadFormData.append('customCustomerInfo', JSON.stringify(customCustomerInfo));
        uploadFormData.append('customKitInfo', JSON.stringify(customKitInfo));
        uploadFormData.append('kitRegistrationId', '');
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
      
      setSuccessModalMessage(`Test results uploaded successfully! Report ID: ${result.reportId}`);
      setShowSuccessModal(true);
      resetForm();
      setSuccess(null);
      
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

// NEW: Handle approval status change - Works for both approve AND disapprove
const handleApprovalChange = async (kit, isApproved) => {
  if (!kit.report_id || !kit.pdf_file_url) {
    setError('No report available for this kit');
    return;
  }

  // Update approval status immediately (works for both true and false)
  await updateApprovalStatus(kit.kit_id, kit.kit_type, isApproved);

  // Only show email modal when approving (not when disapproving)
  if (isApproved) {
    setModalContext('approval'); // Set context for approval
    setSelectedReportForEmail({
      reportId: kit.report_id,
      kitCode: kit.kit_code,
      customerName: `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim(),
      defaultEmail: kit.customer_email || ''
    });
    
    setCustomerEmailAddress(kit.customer_email || '');
    setShowCustomerEmailModal(true);
    setError(null);
    setSuccess(null);
  }
};

// NEW: Update approval status in database
const updateApprovalStatus = async (kitId, kitType, approvalStatus) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    let error;

    if (kitType === 'regular') {
      const { error: updateError } = await supabase
        .from('kit_registrations')
        .update({ approval_status: approvalStatus })
        .eq('kit_registration_id', kitId);
      error = updateError;
    } else if (kitType === 'legacy') {
      const { error: updateError } = await supabase
        .from('legacy_kit_registrations')
        .update({ approval_status: approvalStatus })
        .eq('id', kitId);
      error = updateError;
    } else {
      throw new Error('Invalid kit type');
    }

    if (error) {
      throw new Error(`Failed to update approval status: ${error.message}`);
    }

    // Reload the test kits data to reflect the change
    loadAllTestKits();
    
  } catch (err) {
    console.error('Error updating approval status:', err);
    setError(err.message || 'Failed to update approval status');
  }
};

  // NEW: Handle send to customer button click
  const handleSendToCustomer = async (kit) => {
    if (!kit.has_report || !kit.report_id) {
      setError('No report available for this kit');
      return;
    }

    setSelectedReportForEmail({
      reportId: kit.report_id,
      kitCode: kit.kit_code,
      customerName: `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim(),
      defaultEmail: kit.customer_email || ''
    });
    
    setCustomerEmailAddress(kit.customer_email || '');
    setShowCustomerEmailModal(true);
    setError(null);
    setSuccess(null);
  };

  // NEW: Send report to customer
  const sendReportToCustomer = async () => {
    if (!selectedReportForEmail || !customerEmailAddress.trim()) {
      setError('Please enter a valid email address');
      return;
    }

    setSendingToCustomer(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/.netlify/functions/send-customer-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          reportId: selectedReportForEmail.reportId,
          customEmail: customerEmailAddress.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send report to customer');
      }

      const result = await response.json();

      
      setSuccessModalMessage(`Report sent successfully to ${result.customerEmail}!`);
      setShowSuccessModal(true);
      setShowCustomerEmailModal(false);
      setSelectedReportForEmail(null);
      setCustomerEmailAddress('');
      setSuccess(null);
      
    } catch (err) {
      console.error('Error sending report to customer:', err);
      setError(err.message || 'Failed to send report to customer');
    } finally {
      setSendingToCustomer(false);
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

  const handleLabChainOfCustodyUpload = async (kitId, kitType, kitCode, file) => {
    try {
      setError(null);
      setSuccess(null);
      
      if (!file) return;
  
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
  
      const fileExtension = file.name.split('.').pop() || 'pdf';
      const fileName = `LAB_COC_${kitCode}.${fileExtension}`;
  
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lab-chain-of-custody')
        .upload(fileName, file, {
          contentType: 'application/pdf',
          upsert: true
        });
  
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
  
      const { data: urlData } = supabase.storage
        .from('lab-chain-of-custody')
        .getPublicUrl(fileName);
  
      if (kitType === 'legacy') {
        const { error: updateError } = await supabase
          .from('legacy_kit_registrations')
          .update({ lab_chain_of_custody_url: urlData.publicUrl })
          .eq('id', kitId);
        
        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from('kit_registrations')
          .update({ lab_chain_of_custody_url: urlData.publicUrl })
          .eq('kit_registration_id', kitId);
        
        if (updateError) throw updateError;
      }
  
      loadAllTestKits();
      
      setSuccess(`Lab chain of custody uploaded successfully for kit ${kitCode}`);
      setError(null);
    } catch (err) {
      setError(`Failed to upload lab chain of custody: ${err.message}`);
      setSuccess(null);
    }
  };
  
  const handleDownloadChainOfCustody = async (url, kitCode, type = 'original') => {
  try {
    if (!url) {
      setError(`No ${type} chain of custody available`);
      return;
    }

    let bucket, fileName;
    
    // Parse the URL to extract bucket and file path
    if (url.includes('/storage/v1/object/public/')) {
      // Handle public URLs (though lab-results is private, some URLs might still have this format)
      const urlParts = url.split('/storage/v1/object/public/')[1];
      const [bucketName, ...filenameParts] = urlParts.split('/');
      bucket = bucketName;
      fileName = filenameParts.join('/');
    } else if (url.includes('/storage/v1/object/sign/')) {
      // Handle signed URLs
      const urlParts = url.split('/storage/v1/object/sign/')[1];
      const [bucketName, ...filenameParts] = urlParts.split('/');
      bucket = bucketName;
      fileName = filenameParts.join('/');
    } else {
      // Fallback: assume it's a lab-results URL and try to extract the path
      // For URLs like: https://domain.supabase.co/storage/v1/object/public/lab-results/592161/CofC592161.pdf
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Find 'lab-results' in the path
      const labResultsIndex = pathParts.indexOf('lab-results');
      if (labResultsIndex !== -1 && labResultsIndex < pathParts.length - 1) {
        bucket = 'lab-results';
        fileName = pathParts.slice(labResultsIndex + 1).join('/');
      } else {
        // Final fallback
        bucket = 'lab-results';
        fileName = url.split('/').pop();
      }
    }

    console.log('Downloading from bucket:', bucket, 'file:', fileName);

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileName, 3600);

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      throw new Error(`Failed to generate download link: ${signedUrlError.message}`);
    }

    if (signedUrlData?.signedUrl) {
      window.open(signedUrlData.signedUrl, '_blank');
      setError(null);
    } else {
      setError('Failed to generate download link');
    }
  } catch (err) {
    console.error('Error downloading chain of custody:', err);
    setError(`Failed to download ${type} chain of custody: ${err.message}`);
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
      {/* Collapsible Header */}
<div className="bg-white shadow rounded-lg overflow-hidden">
  <button
    onClick={() => setIsExpanded(!isExpanded)}
    className="w-full px-4 sm:px-6 py-4 sm:py-5 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors duration-200"
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <h3 className="text-lg sm:text-xl leading-6 font-medium text-gray-900 flex items-center">
          <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload Test Results
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload laboratory test results and generate customer reports automatically.
        </p>
      </div>
      <div className="ml-4 flex-shrink-0">
        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
          isExpanded 
            ? 'bg-blue-100 border-2 border-blue-300' 
            : 'bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
        }`}>
          <svg 
            className={`h-4 w-4 text-blue-600 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  </button>

  {/* Collapsed State Summary */}
  {!isExpanded && (
    <div className="px-4 sm:px-6 py-2 bg-gray-50 border-t border-gray-200">
      <p className="text-xs text-gray-500 flex items-center">
        <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Click to expand and upload test results
      </p>
    </div>
  )}

  {/* Collapsible Content */}
  <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
    {isExpanded && (
      <>

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
          {/* Kit Selection for Existing Kits */}
          {reportType === 'kit' && (
            <div>
              <label htmlFor="kitSearchDropdown" className="block text-sm font-medium text-gray-700 mb-2">
                Search and Select Test Kit <span className="text-red-500">*</span>
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  id="kitSearchDropdown"
                  placeholder="Type kit code or customer name to search..."
                  value={kitSearchQuery}
                  onChange={(e) => {
                    setKitSearchQuery(e.target.value);
                    setShowDropdown(true);
                    if (formData.kitRegistrationId && e.target.value !== selectedKitInfo?.displayName) {
                      setFormData(prev => ({ ...prev, kitRegistrationId: '' }));
                      setSelectedKitInfo(null);
                    }
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  autoComplete="off"
                />
                
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Dropdown Results */}
                {showDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {(() => {
                      const filteredRegistered = availableKits.registered.filter(kit => 
                        kitSearchQuery === '' || 
                        kit.displayId.toLowerCase().includes(kitSearchQuery.toLowerCase()) ||
                        kit.customerName.toLowerCase().includes(kitSearchQuery.toLowerCase()) ||
                        kit.orderNumber.toLowerCase().includes(kitSearchQuery.toLowerCase())
                      );
                      
                      const filteredUnregistered = availableKits.unregistered.filter(kit => 
                        kitSearchQuery === '' || 
                        kit.displayId.toLowerCase().includes(kitSearchQuery.toLowerCase()) ||
                        kit.customerName.toLowerCase().includes(kitSearchQuery.toLowerCase()) ||
                        kit.orderNumber.toLowerCase().includes(kitSearchQuery.toLowerCase())
                      );
                      
                      const hasResults = filteredRegistered.length > 0 || filteredUnregistered.length > 0;
                      
                      if (!hasResults && kitSearchQuery) {
                        return (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            No kits found matching "{kitSearchQuery}"
                          </div>
                        );
                      }
                      
                      return (
                        <>
                          {filteredRegistered.length > 0 && (
                            <>
                              <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                                Registered Kits
                              </div>
                              {filteredRegistered.map((kit) => {
                                const displayInfo = getKitDisplayInfo(kit);
                                return (
                                  <div
                                    key={kit.id}
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setFormData(prev => ({ ...prev, kitRegistrationId: kit.id, kitRegistrationType: kit.type }));
                                      setSelectedKitInfo({ ...kit, displayName: `${displayInfo.label} - ${kit.customerName}` });
                                      setKitSearchQuery(`${displayInfo.label} - ${kit.customerName}`);
                                      setShowDropdown(false);
                                    }}
                                  >
                                    <div className="font-medium text-gray-900">{displayInfo.label}</div>
                                    <div className="text-gray-500">{kit.customerName} • {kit.orderNumber}</div>
                                  </div>
                                );
                              })}
                            </>
                          )}
                          
                          {filteredUnregistered.length > 0 && (
                            <>
                              <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                                Unregistered Kits
                              </div>
                              {filteredUnregistered.map((kit) => {
                                const displayInfo = getKitDisplayInfo(kit);
                                return (
                                  <div
                                    key={kit.id}
                                    className="px-3 py-2 hover:bg-yellow-50 cursor-pointer text-sm"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setFormData(prev => ({ ...prev, kitRegistrationId: kit.id, kitRegistrationType: kit.type }));
                                      setSelectedKitInfo({ ...kit, displayName: `${displayInfo.label} - ${kit.customerName} [UNREGISTERED]` });
                                      setKitSearchQuery(`${displayInfo.label} - ${kit.customerName} [UNREGISTERED]`);
                                      setShowDropdown(false);
                                    }}
                                  >
                                    <div className="font-medium text-gray-900">{displayInfo.label}</div>
                                    <div className="text-gray-500">{kit.customerName} • {kit.orderNumber} • <span className="text-orange-600 font-medium">UNREGISTERED</span></div>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
              
              {(availableKits.registered.length === 0 && availableKits.unregistered.length === 0) && !loading && (
                <p className="mt-2 text-sm text-gray-500">
                  No kits available for results upload.
                </p>
              )}
            </div>
          )}

          {/* Customer Information - Simplified for unregistered, full for one-off */}
          {reportType === 'kit' && selectedKitInfo && !selectedKitInfo.isRegistered ? (
            // SIMPLIFIED: Only location for unregistered kits
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900">
                Sample Location
              </h4>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Sample Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={customCustomerInfo.location}
                  onChange={handleCustomerInfoChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Toronto, ON or 123 Main St, Toronto, ON"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Customer and kit information is already available from the existing registration.
                </p>
              </div>
            </div>
          ) : reportType === 'one_off' ? (
            // FULL FORM: Complete customer info for one-off reports
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900">
                Customer Information <span className="text-red-500">*</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={customCustomerInfo.firstName}
                    onChange={handleCustomerInfoChange}
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
                    name="lastName"
                    value={customCustomerInfo.lastName}
                    onChange={handleCustomerInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
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
          ) : null}

          {/* Kit Information for One-off only */}
          {reportType === 'one_off' && (
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

          {/* Chain of Custody Upload */}
          <div className="border-t border-gray-200 pt-6">
            <label htmlFor="coc-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Chain of Custody PDF (Optional)
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
                    htmlFor="coc-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload Chain of Custody</span>
                    <input
                      id="coc-upload"
                      name="coc-upload"
                      type="file"
                      className="sr-only"
                      accept=".pdf"
                      onChange={handleCoCFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PDF files up to 10MB
                </p>
              </div>
            </div>
            
            {selectedCoCFile && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-green-900">{selectedCoCFile.name}</span>
                    <span className="text-xs text-green-600 ml-2">
                      ({(selectedCoCFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCoCFile(null);
                      document.getElementById('coc-upload').value = '';
                    }}
                    className="text-green-600 hover:text-green-800"
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
        </>
      )}
    </div>
  </div>
      
      {/* Update Existing Report Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-orange-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <h3 className="text-lg leading-6 font-medium">
              Update Existing Report
            </h3>
          </div>
          <p className="mt-1 text-sm">
            Regenerate reports for existing test kits (useful for design changes or corrections).
          </p>
        </div>

        <div className="p-4 sm:p-6">
          <div className="space-y-6">
            {/* Report Selection */}
            <div>
              <label htmlFor="reportSelect" className="block text-sm font-medium text-gray-700 mb-2">
                Select Report to Update <span className="text-red-500">*</span>
              </label>
              <select
                id="reportSelect"
                value={selectedReportForUpdate}
                onChange={(e) => setSelectedReportForUpdate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                disabled={regeneratingReport}
              >
                <option value="">-- Select a report to regenerate --</option>
                {availableReportsForUpdate.map((report) => (
                  <option key={report.kit_id} value={report.kit_id}>
                    {`${report.customer_first_name || ''} ${report.customer_last_name || ''}`.trim() || 'Unknown Customer'} - {report.kit_code} - WO{report.work_order_number}
                  </option>
                ))}
              </select>
              
              {availableReportsForUpdate.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  No reports available for regeneration. Reports must have completed test results.
                </p>
              )}
            </div>

            {/* Selected Report Info */}
            {selectedReportForUpdate && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                {(() => {
                  const selectedReport = availableReportsForUpdate.find(
                    report => report.kit_id === selectedReportForUpdate
                  );
                  return selectedReport ? (
                    <div>
                      <h4 className="text-sm font-medium text-orange-900 mb-2">
                        Selected Report Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-orange-800">Customer:</span>
                          <span className="ml-2 text-orange-700">
                            {`${selectedReport.customer_first_name || ''} ${selectedReport.customer_last_name || ''}`.trim() || 'Unknown Customer'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-orange-800">Kit Code:</span>
                          <span className="ml-2 text-orange-700">{selectedReport.kit_code}</span>
                        </div>
                        <div>
                          <span className="font-medium text-orange-800">Work Order:</span>
                          <span className="ml-2 text-orange-700">WO{selectedReport.work_order_number}</span>
                        </div>
                        <div>
                          <span className="font-medium text-orange-800">Sample:</span>
                          <span className="ml-2 text-orange-700">{selectedReport.sample_number}</span>
                        </div>
                        <div>
                          <span className="font-medium text-orange-800">Test Kit:</span>
                          <span className="ml-2 text-orange-700">{selectedReport.test_kit_name}</span>
                        </div>
                        <div>
                          <span className="font-medium text-orange-800">Current Report ID:</span>
                          <span className="ml-2 text-orange-700 font-mono text-xs">{selectedReport.report_id}</span>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

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

            {regeneratingReport && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="animate-spin h-5 w-5 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-orange-800">Processing</h3>
                    <div className="mt-1 text-sm text-orange-700">
                      Regenerating report... This may take a few moments.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-end border-t border-gray-200 pt-6">
              <button
                onClick={handleReportRegeneration}
                disabled={!selectedReportForUpdate || regeneratingReport}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {regeneratingReport ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Customer Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                  Details
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Lab Chain of Custody
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Report
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Approve Report
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTestKits.map((kit) => (
                <tr key={kit.kit_id} className="hover:bg-gray-50">
                  {/* Customer Name Column */}
                  <td className="px-4 py-4 whitespace-nowrap w-1/4">
                    <div className="max-w-[180px]">
                      <div className="text-sm font-medium text-gray-900 truncate" title={
                        kit.kit_type === 'legacy' ? (
                          `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim() || 'Legacy Customer'
                        ) : (
                          `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim() || 'Unknown Customer'
                        )
                      }>
                        {kit.kit_type === 'legacy' ? (
                          `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim() || 'Legacy Customer'
                        ) : (
                          `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim() || 'Unknown Customer'
                        )}
                      </div>
                      <div className="text-sm text-gray-500 truncate" title={kit.customer_email || 'No email available'}>
                        {kit.customer_email || 'No email available'}
                      </div>
                    </div>
                  </td>
                  
                  {/* Details Column */}
                  <td className="px-4 py-4 whitespace-nowrap w-1/5">
                    <div className="max-w-[120px]">
                      <div className="text-sm font-medium text-gray-900 truncate" title={kit.kit_code || 'N/A'}>
                        {kit.kit_code || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500 truncate" title={`#${kit.order_number || 'N/A'}`}>
                        #{kit.order_number || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {kit.kit_type === 'legacy' ? 'Legacy Kit' : 'Regular Kit'}
                      </div>
                    </div>
                  </td>

                  {/* Lab Chain of Custody Column */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <label
                        htmlFor={`lab-upload-${kit.kit_id}`}
                        className="inline-flex items-center justify-center w-8 h-8 bg-green-100 hover:bg-green-200 text-green-700 rounded-md cursor-pointer transition-colors duration-200"
                        title="Upload Lab Chain of Custody"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </label>
                      <input
                        id={`lab-upload-${kit.kit_id}`}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            handleLabChainOfCustodyUpload(kit.kit_id, kit.kit_type, kit.kit_code, file);
                            e.target.value = '';
                          }
                        }}
                      />
                      
                      {kit.lab_chain_of_custody_url ? (
                        <button
                          onClick={() => handleDownloadChainOfCustody(kit.lab_chain_of_custody_url, kit.kit_code, 'lab')}
                          className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors duration-200"
                          title="Download Lab Chain of Custody"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      ) : (
                        <span className="w-8 h-8 flex items-center justify-center text-gray-400">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </td>
                    
                  {/* Report Column - Updated to use pdf_file_url */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {kit.report_id && kit.pdf_file_url ? (
                      <button
                        onClick={() => handleDownloadReport(kit.report_id, kit.kit_code)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-md transition-colors duration-200"
                        title="Download Report"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>

                  {/* Approve Report Column - Same condition */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {kit.report_id && kit.pdf_file_url ? (
                      <input
                        type="checkbox"
                        checked={kit.approval_status || false}
                        onChange={(e) => handleApprovalChange(kit, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        title="Approve/disapprove report for customer access"
                      />
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

      {/* NEW: Customer Email Modal - Fixed formatting */}
      {showCustomerEmailModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {modalContext === 'regeneration' ? 'Report Regenerated - Send to Customer' : 'Send Report to Customer'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCustomerEmailModal(false);
                      setSelectedReportForEmail(null);
                      setCustomerEmailAddress('');
                      setModalContext('approval'); // Reset to default
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        {modalContext === 'regeneration' 
                          ? 'Report has been regenerated successfully.' 
                          : 'Report has been approved.'}
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        {modalContext === 'regeneration'
                          ? 'Send notification email to customer (optional).'
                          : (
                            <>
                              Send notification email to customer (optional).
                              <br />
                              <span className="text-xs text-green-600">
                                This action will also allow customers to view the report in their Reports dashboard.
                              </span>
                            </>
                          )}
                      </p>
                    </div>
                  </div>
                </div>
              
              {selectedReportForEmail && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Kit:</span> {selectedReportForEmail.kitCode}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Customer:</span> {selectedReportForEmail.customerName || 'N/A'}
                  </p>
                </div>
              )}
              
              <div className="mb-4">
                <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="customerEmail"
                  value={customerEmailAddress}
                  onChange={(e) => setCustomerEmailAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="customer@example.com"
                  disabled={sendingToCustomer}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerEmailModal(false);
                    setSelectedReportForEmail(null);
                    setCustomerEmailAddress('');
                    setModalContext('approval'); // Reset to default
                  }}
                  disabled={sendingToCustomer}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Skip Email
                </button>
                <button
                  type="button"
                  onClick={sendReportToCustomer}
                  disabled={sendingToCustomer || !customerEmailAddress.trim()}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingToCustomer ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Email Notification'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            {/* Modal Header */}
            <div className="bg-green-50 px-6 py-4 border-b border-green-200 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="ml-3 text-lg font-semibold text-green-800">Success!</h3>
                </div>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessModalMessage('');
                  }}
                  className="text-green-400 hover:text-green-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-base text-gray-900 font-medium mb-2">
                    {successModalMessage}
                  </p>
                  <p className="text-sm text-gray-600">
                    The operation completed successfully. The customer will receive their report via email.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  This dialog will close automatically in 5 seconds
                </div>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessModalMessage('');
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
            
            {/* Progress bar for auto-dismiss */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-5000 ease-linear"
                style={{
                  animation: showSuccessModal ? 'progress 5s linear' : 'none',
                  animationFillMode: 'forwards'
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}