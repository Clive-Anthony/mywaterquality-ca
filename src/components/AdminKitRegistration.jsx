// src/components/AdminKitRegistration.jsx - Admin Kit Registration Component
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AdminKitRegistration() {
  const { user } = useAuth();
  
  // State
  const [availableKits, setAvailableKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Search and dropdown state
  const [kitSearchQuery, setKitSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedKitInfo, setSelectedKitInfo] = useState(null);
  
  // Form state
  const [selectedKit, setSelectedKit] = useState('');
  const [sampleData, setSampleData] = useState({
    sample_date: '',
    sample_time: '',
    sample_description: '',
    number_of_containers: 1,
    person_taking_sample: ''
  });
  const [locationData, setLocationData] = useState({
    location_name: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Canada'
  });
  
  // Canadian provinces
  const provinces = [
    { value: '', label: 'Select a province' },
    { value: 'AB', label: 'Alberta' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'MB', label: 'Manitoba' },
    { value: 'NB', label: 'New Brunswick' },
    { value: 'NL', label: 'Newfoundland and Labrador' },
    { value: 'NS', label: 'Nova Scotia' },
    { value: 'NT', label: 'Northwest Territories' },
    { value: 'NU', label: 'Nunavut' },
    { value: 'ON', label: 'Ontario' },
    { value: 'PE', label: 'Prince Edward Island' },
    { value: 'QC', label: 'Quebec' },
    { value: 'SK', label: 'Saskatchewan' },
    { value: 'YT', label: 'Yukon' }
  ];

  // Load unregistered kits on mount
  useEffect(() => {
    loadUnregisteredKits();
  }, []);

  const loadUnregisteredKits = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: kitsData, error: kitsError } = await supabase
        .from('vw_test_kits_admin')
        .select('*')
        .eq('registration_status', 'unregistered')
        .order('kit_created_at', { ascending: false });

      if (kitsError) {
        throw kitsError;
      }

      const formattedKits = (kitsData || []).map(kit => ({
        id: kit.kit_id,
        type: kit.kit_type,
        displayId: kit.kit_code,
        productName: kit.test_kit_name,
        orderNumber: kit.order_number,
        customerName: `${kit.customer_first_name || ''} ${kit.customer_last_name || ''}`.trim(),
        customerEmail: kit.customer_email || '',
        createdAt: kit.kit_created_at,
        waybillReference: kit.waybill_reference_number || ''
      }));

      setAvailableKits(formattedKits);
      
    } catch (error) {
      console.error('Error loading unregistered kits:', error);
      setError('Failed to load unregistered kits');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedKit('');
    setSelectedKitInfo(null);
    setSampleData({
      sample_date: '',
      sample_time: '',
      sample_description: '',
      number_of_containers: 1,
      person_taking_sample: ''
    });
    setLocationData({
      location_name: '',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      country: 'Canada'
    });
    setKitSearchQuery('');
    setShowDropdown(false);
    setError(null);
    setSuccess(null);
  };

  const handleSampleDataChange = (field, value) => {
    setSampleData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationDataChange = (field, value) => {
    setLocationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getKitDisplayInfo = (kit) => {
    const statusBadge = kit.type === 'legacy' ? ' [Legacy]' : '';
    
    return {
      label: `${kit.displayId} - ${kit.productName} - ${kit.orderNumber}${statusBadge}`,
      subtitle: kit.customerName || 'No customer info',
      type: kit.type
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedKit) {
      setError('Please select a test kit to register');
      return;
    }

    if (!sampleData.sample_date || !sampleData.sample_time) {
      setError('Sample date and time are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      const registrationData = {
        kit_registration_id: selectedKit,
        ...sampleData,
        ...locationData,
        is_admin_registration: true // Flag to indicate this is an admin registration
      };

      const response = await fetch('/.netlify/functions/register-kit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register kit');
      }

      const result = await response.json();
      
      setSuccess(`Kit ${selectedKitInfo?.displayId} registered successfully! Chain of Custody generated and email sent.`);
      
      // Reset form and reload data
      resetForm();
      loadUnregisteredKits();
      
    } catch (error) {
      console.error('Error registering kit:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Admin Kit Registration
          </h3>
        </div>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading unregistered test kits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Admin Kit Registration
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Register unregistered test kits on behalf of customers and generate Chain of Custody documents.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-700 font-medium">{success}</span>
              </div>
              <button
                onClick={() => setSuccess(null)}
                className="text-green-400 hover:text-green-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {availableKits.length === 0 ? (
          <div className="text-center py-12">
            <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Unregistered Kits</h3>
            <p className="text-gray-500">All test kits have been registered by customers.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Kit Selection */}
            <div>
              <label htmlFor="kitSearchDropdown" className="block text-sm font-medium text-gray-700 mb-2">
                Search and Select Unregistered Test Kit <span className="text-red-500">*</span>
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  id="kitSearchDropdown"
                  placeholder="Type kit code, customer name, or order number to search..."
                  value={kitSearchQuery}
                  onChange={(e) => {
                    setKitSearchQuery(e.target.value);
                    setShowDropdown(true);
                    if (selectedKit && e.target.value !== selectedKitInfo?.displayName) {
                      setSelectedKit('');
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
                      const filteredKits = availableKits.filter(kit => 
                        kitSearchQuery === '' || 
                        kit.displayId.toLowerCase().includes(kitSearchQuery.toLowerCase()) ||
                        kit.customerName.toLowerCase().includes(kitSearchQuery.toLowerCase()) ||
                        kit.orderNumber.toLowerCase().includes(kitSearchQuery.toLowerCase())
                      );
                      
                      if (filteredKits.length === 0 && kitSearchQuery) {
                        return (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            No unregistered kits found matching "{kitSearchQuery}"
                          </div>
                        );
                      }
                      
                      return filteredKits.map((kit) => {
                        const displayInfo = getKitDisplayInfo(kit);
                        return (
                          <div
                            key={kit.id}
                            className="px-3 py-2 hover:bg-yellow-50 cursor-pointer text-sm"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedKit(kit.id);
                              setSelectedKitInfo({ ...kit, displayName: `${displayInfo.label} - ${kit.customerName}` });
                              setKitSearchQuery(`${displayInfo.label} - ${kit.customerName}`);
                              setShowDropdown(false);
                            }}
                          >
                            <div className="font-medium text-gray-900">{displayInfo.label}</div>
                            <div className="text-gray-500">{kit.customerName} • {kit.orderNumber} • <span className="text-orange-600 font-medium">UNREGISTERED</span></div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
              
              <p className="mt-1 text-xs text-gray-500">
                {availableKits.length} unregistered kits available for registration
              </p>
            </div>

            {/* Selected Kit Info Display */}
            {selectedKitInfo && (
              <div className="border rounded-md p-4 bg-yellow-50 border-yellow-200">
                <h4 className="text-sm font-medium mb-2 text-yellow-900">
                  Selected Kit Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-yellow-800">Kit Code:</span>
                    <span className="ml-2 text-yellow-700">{selectedKitInfo.displayId}</span>
                  </div>
                  <div>
                    <span className="font-medium text-yellow-800">Product:</span>
                    <span className="ml-2 text-yellow-700">{selectedKitInfo.productName}</span>
                  </div>
                  <div>
                    <span className="font-medium text-yellow-800">Order:</span>
                    <span className="ml-2 text-yellow-700">{selectedKitInfo.orderNumber}</span>
                  </div>
                  <div>
                    <span className="font-medium text-yellow-800">Customer:</span>
                    <span className="ml-2 text-yellow-700">{selectedKitInfo.customerName}</span>
                  </div>
                  <div>
                    <span className="font-medium text-yellow-800">Email:</span>
                    <span className="ml-2 text-yellow-700">{selectedKitInfo.customerEmail || 'Not available'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-yellow-800">Type:</span>
                    <span className="ml-2 text-yellow-700 capitalize">
                      {selectedKitInfo.type}
                      {selectedKitInfo.type === 'legacy' && ' Kit'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Sample Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Sample Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sample-date" className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="sample-date"
                    value={sampleData.sample_date}
                    onChange={(e) => handleSampleDataChange('sample_date', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    max={new Date().toISOString().split('T')[0]}
                    min="1900-01-01"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="sample-time" className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="sample-time"
                    value={sampleData.sample_time}
                    onChange={(e) => handleSampleDataChange('sample_time', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="containers" className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Containers
                  </label>
                  <input
                    type="number"
                    id="containers"
                    min="1"
                    value={sampleData.number_of_containers}
                    onChange={(e) => handleSampleDataChange('number_of_containers', parseInt(e.target.value) || 1)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="person-taking-sample" className="block text-sm font-medium text-gray-700 mb-1">
                    Name of Person Taking Sample
                  </label>
                  <input
                    type="text"
                    id="person-taking-sample"
                    value={sampleData.person_taking_sample}
                    onChange={(e) => handleSampleDataChange('person_taking_sample', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Full name"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="sample-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Description
                  </label>
                  <textarea
                    id="sample-description"
                    rows={3}
                    value={sampleData.sample_description}
                    onChange={(e) => handleSampleDataChange('sample_description', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Description of the sample (e.g., 'Kitchen tap water', 'Well water from basement')"
                  />
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                Location Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="location-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name
                  </label>
                  <input
                    type="text"
                    id="location-name"
                    value={locationData.location_name}
                    onChange={(e) => handleLocationDataChange('location_name', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 'Main House', 'Cottage', 'Office Building'"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={locationData.address}
                    onChange={(e) => handleLocationDataChange('address', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Street address"
                  />
                </div>
                
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={locationData.city}
                    onChange={(e) => handleLocationDataChange('city', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="City"
                  />
                </div>
                
                <div>
                  <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                    Province
                  </label>
                  <select
                    id="province"
                    value={locationData.province}
                    onChange={(e) => handleLocationDataChange('province', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {provinces.map(province => (
                      <option key={province.value} value={province.value}>
                        {province.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="postal-code" className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    id="postal-code"
                    value={locationData.postal_code}
                    onChange={(e) => handleLocationDataChange('postal_code', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="K1A 0A6"
                  />
                </div>
                
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    id="country"
                    value={locationData.country}
                    onChange={(e) => handleLocationDataChange('country', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting || !selectedKit || !sampleData.sample_date || !sampleData.sample_time}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registering Kit...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Register Test Kit
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}