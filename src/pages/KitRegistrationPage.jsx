// src/pages/KitRegistrationPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageLayout from '../components/PageLayout';
import { useLocation } from 'react-router-dom';

export default function KitRegistrationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [availableKits, setAvailableKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
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

  const location = useLocation();
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Load available kits on mount
  useEffect(() => {
    loadAvailableKits();
  }, []);

  useEffect(() => {
    // Check if redirected from claim page with success
    if (location.state?.message) {
      setClaimSuccess(location.state.message);
      // Clear the state to prevent showing on refresh
      window.history.replaceState({}, document.title);
      
      // Auto-hide success message after 10 seconds
      setTimeout(() => {
        setClaimSuccess(false);
      }, 10000);
    }
  }, [location.state]);
  
  // Add this success message component after the existing success message in the JSX
  {/* Claim Success Message */}
  {claimSuccess && (
    <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-700 font-medium">{claimSuccess}</span>
        </div>
        <button
          onClick={() => setClaimSuccess(false)}
          className="text-green-400 hover:text-green-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )}

  const loadAvailableKits = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/.netlify/functions/register-kit', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load available kits');
      }

      const data = await response.json();
      setAvailableKits(data.kits || []);
      
    } catch (error) {
      console.error('Error loading available kits:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // For data 
  const handleSampleDataChange = (field, value) => {
    // Special handling for date field to ensure proper format
    if (field === 'sample_date') {
      // Remove any non-digit characters except hyphens
      let cleanValue = value.replace(/[^\d-]/g, '');
      
      // Ensure proper date format YYYY-MM-DD
      if (cleanValue.length > 10) {
        cleanValue = cleanValue.substring(0, 10);
      }
      
      // If user is typing and we have enough characters, format it
      if (cleanValue.length >= 8 && !cleanValue.includes('-')) {
        // Convert YYYYMMDD to YYYY-MM-DD
        cleanValue = cleanValue.substring(0, 4) + '-' + 
                    cleanValue.substring(4, 6) + '-' + 
                    cleanValue.substring(6, 8);
      }
      
      // Validate year is 4 digits (1900-2099)
      const yearMatch = cleanValue.match(/^(\d{1,4})/);
      if (yearMatch) {
        let year = yearMatch[1];
        if (year.length > 4) {
          year = year.substring(0, 4);
          cleanValue = year + cleanValue.substring(year.length);
        }
        
        // If year is complete, validate it's reasonable
        if (year.length === 4) {
          const yearNum = parseInt(year);
          if (yearNum < 1900 || yearNum > 2099) {
            // Reset to current year if unreasonable
            const currentYear = new Date().getFullYear();
            cleanValue = currentYear + cleanValue.substring(4);
          }
        }
      }
      
      setSampleData(prev => ({
        ...prev,
        [field]: cleanValue
      }));
    } else {
      setSampleData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleLocationDataChange = (field, value) => {
    setLocationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedKit) {
        setError('Please select a test kit to register');
        return;
      }
  
      if (!sampleData.sample_description?.trim()) {
        setError('Sample description is required');
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
        ...locationData
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
      
      setSuccess(true);
      
      // Reset form
      setSelectedKit('');
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
      
      // Reload available kits
      loadAvailableKits();
      
    } catch (error) {
      console.error('Error registering kit:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Hero section
  const KitRegistrationHero = () => (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Register Your Test Kit
          </h1>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Register your water testing kit with sample and location information.
          </p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <PageLayout hero={<KitRegistrationHero />}>
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your available test kits...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout hero={<KitRegistrationHero />}>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Kit Registration
              </h2>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Success Message */}
            {success && (
              <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-700">Test kit registered successfully!</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {availableKits.length === 0 ? (
              <div className="text-center py-12">
                <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Test Kits Available</h3>
                <p className="text-gray-500 mb-4">You don't have any test kits available for registration.</p>
                <button
                  onClick={() => navigate('/shop')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Order Test Kits
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Section 1: Select Test Kit */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    1. Select Test Kit
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="kit-select" className="block text-sm font-medium text-gray-700 mb-2">
                        Available Test Kits *
                      </label>
                      <select
                        id="kit-select"
                        value={selectedKit}
                        onChange={(e) => setSelectedKit(e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        required
                      >
                        <option value="">Select a test kit to register</option>
                        {availableKits
                          .filter(kit => !kit.is_registered)
                          .map((kit) => (
                            <option key={kit.kit_registration_id} value={kit.kit_registration_id}>
                              {kit.display_id} - {kit.product_name} (Order #{kit.order_number})
                            </option>
                          ))}
                      </select>
                      {availableKits.filter(kit => !kit.is_registered).length === 0 && (
                        <p className="mt-1 text-sm text-gray-500">
                          All your test kits have been registered.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Sample Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    2. Sample Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label htmlFor="sample-date" className="block text-sm font-medium text-gray-700 mb-1">
                        Sample Date *
                      </label>
                      <input
                        type="date"
                        id="sample-date"
                        value={sampleData.sample_date}
                        onChange={(e) => handleSampleDataChange('sample_date', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        max={new Date().toISOString().split('T')[0]} // Prevent future dates
                        min="1900-01-01" // Reasonable minimum date
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="sample-time" className="block text-sm font-medium text-gray-700 mb-1">
                        Sample Time *
                      </label>
                      <input
                        type="time"
                        id="sample-time"
                        value={sampleData.sample_time}
                        onChange={(e) => handleSampleDataChange('sample_time', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="containers" className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Containers *
                      </label>
                      <input
                        type="number"
                        id="containers"
                        min="1"
                        value={sampleData.number_of_containers}
                        onChange={(e) => handleSampleDataChange('number_of_containers', parseInt(e.target.value) || 1)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="person-taking-sample" className="block text-sm font-medium text-gray-700 mb-1">
                        Name of Person Taking Sample *
                      </label>
                      <input
                        type="text"
                        id="person-taking-sample"
                        value={sampleData.person_taking_sample}
                        onChange={(e) => handleSampleDataChange('person_taking_sample', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        placeholder="Full name"
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label htmlFor="sample-description" className="block text-sm font-medium text-gray-700 mb-1">
                        Sample Description *
                      </label>
                      <textarea
                        id="sample-description"
                        rows={3}
                        value={sampleData.sample_description}
                        onChange={(e) => handleSampleDataChange('sample_description', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        placeholder="Required description of the sample (e.g., 'Kitchen tap water', 'Well water from basement')"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Location Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    3. Location Information
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
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
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
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
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
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
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
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
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
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
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
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={submitting || !selectedKit}
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
                      'Register Test Kit'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}