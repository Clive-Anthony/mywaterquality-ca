// src/components/ProfileForm.jsx - SIMPLIFIED VERSION
// Removed database optimization that was causing hanging

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    phone: ''
  });

  // Fetch user profile data
  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setFetchingProfile(false);
        return;
      }

      try {
        setFetchingProfile(true);
        setError(null);
        
        console.log('ProfileForm: Fetching profile for user:', user.id);
        
        // FIXED: Direct query without optimization
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          // If the error is that no row was found, that's okay - we'll create one on save
          if (error.code === 'PGRST116') {
            console.log('ProfileForm: No existing profile found, will create on save');
            // Pre-populate with user metadata if available
            setProfile({
              first_name: user.user_metadata?.first_name || user.user_metadata?.firstName || '',
              last_name: user.user_metadata?.last_name || user.user_metadata?.lastName || '',
              address: '',
              city: '',
              province: '',
              postal_code: '',
              phone: ''
            });
          } else {
            console.error('ProfileForm: Error fetching profile:', error);
            setError(`Failed to load profile: ${error.message}`);
          }
        } else if (data) {
          console.log('ProfileForm: Profile data loaded:', data);
          setProfile({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            address: data.address || '',
            city: data.city || '',
            province: data.province || '',
            postal_code: data.postal_code || '',
            phone: data.phone || ''
          });
        }
      } catch (error) {
        console.error('ProfileForm: Exception fetching profile:', error);
        setError(`Error loading profile: ${error.message}`);
      } finally {
        setFetchingProfile(false);
      }
    }

    fetchProfile();
  }, [user]);

  // Validate form data
  const validateForm = () => {
    const errors = {};
    
    // Validate postal code format for Canada
    if (profile.postal_code && !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(profile.postal_code)) {
      errors.postal_code = 'Please enter a valid Canadian postal code (e.g., K1A 0A6)';
    }
    
    // Validate phone number format
    if (profile.phone && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(profile.phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    // Validate province selection
    if (profile.province && !provinces.find(p => p.value === profile.province)) {
      errors.province = 'Please select a valid province';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // FIXED: Simplified form submission without hanging
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    setValidationErrors({});
    
    // Validate form
    if (!validateForm()) {
      setLoading(false);
      setError('Please correct the errors above');
      return;
    }
    
    try {
      console.log('ProfileForm: Updating profile for user:', user.id);
      console.log('ProfileForm: Profile data:', profile);
      
      // Prepare the profile data
      const profileData = {
        id: user.id,
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        address: profile.address.trim(),
        city: profile.city.trim(),
        province: profile.province,
        postal_code: profile.postal_code.trim().toUpperCase(),
        phone: profile.phone.trim(),
        updated_at: new Date().toISOString()
      };

      // FIXED: Direct database update without optimization
      const { data: profileResult, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();

      if (profileError) {
        console.error('ProfileForm: Profile update error:', profileError);
        
        // Provide more specific error messages
        if (profileError.code === '42501') {
          throw new Error('You do not have permission to update your profile. Please contact support.');
        } else if (profileError.code === '42P01') {
          throw new Error('Profile system is not properly configured. Please contact support.');
        } else {
          throw new Error(`Failed to update profile: ${profileError.message}`);
        }
      }

      console.log('ProfileForm: Profile updated successfully in database:', profileResult);

      // FIXED: Update user metadata in background (non-blocking)
      console.log('ProfileForm: Starting background auth metadata update...');
      const fullName = `${profileData.first_name} ${profileData.last_name}`.trim();
      
      // Fire-and-forget auth metadata update (completely non-blocking)
      supabase.auth.updateUser({
        data: {
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          full_name: fullName,
          firstName: profileData.first_name,
          lastName: profileData.last_name
        }
      }).then(({ data: authResult, error: metadataError }) => {
        if (metadataError) {
          console.warn('ProfileForm: Auth metadata update failed (profile still saved):', metadataError);
        } else {
          console.log('ProfileForm: Auth metadata updated successfully:', authResult);
        }
      }).catch((metadataUpdateError) => {
        console.warn('ProfileForm: Auth metadata update exception (profile still saved):', metadataUpdateError);
      });

      console.log('✅ ProfileForm: Profile update completed successfully');

      // Show success message immediately
      setSuccess(true);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error('ProfileForm: Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      // Always clear loading state immediately
      console.log('ProfileForm: Setting loading to false - profile update complete');
      setLoading(false);
    }
  };

  // List of Canadian provinces for dropdown
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

  // Show loading while fetching profile
  if (fetchingProfile) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Profile Information
          </h3>
        </div>
        <div className="px-6 py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Profile Information
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Update your personal information and address
        </p>
      </div>
      
      <div className="px-6 py-6">
        {/* Success Message */}
        {success && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 rounded" role="alert">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-700">Profile updated successfully!</span>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded" role="alert">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="text-red-700">{error}</span>
                {error.includes('permission') && (
                  <p className="text-red-600 text-sm mt-1">
                    This might be a database configuration issue. Please contact support if this persists.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* First Name */}
            <div className="sm:col-span-3">
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                First Name *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="first_name"
                  id="first_name"
                  autoComplete="given-name"
                  required
                  value={profile.first_name}
                  onChange={handleChange}
                  className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    validationErrors.first_name ? 'border-red-300' : ''
                  }`}
                  placeholder="Enter your first name"
                />
                {validationErrors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.first_name}</p>
                )}
              </div>
            </div>

            {/* Last Name */}
            <div className="sm:col-span-3">
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                Last Name *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="last_name"
                  id="last_name"
                  autoComplete="family-name"
                  required
                  value={profile.last_name}
                  onChange={handleChange}
                  className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    validationErrors.last_name ? 'border-red-300' : ''
                  }`}
                  placeholder="Enter your last name"
                />
                {validationErrors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.last_name}</p>
                )}
              </div>
            </div>

            {/* Street Address */}
            <div className="sm:col-span-6">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Street Address
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="address"
                  id="address"
                  autoComplete="street-address"
                  value={profile.address}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Enter your street address"
                />
              </div>
            </div>

            {/* City */}
            <div className="sm:col-span-2">
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="city"
                  id="city"
                  autoComplete="address-level2"
                  value={profile.city}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Enter your city"
                />
              </div>
            </div>

            {/* Province */}
            <div className="sm:col-span-2">
              <label htmlFor="province" className="block text-sm font-medium text-gray-700">
                Province
              </label>
              <div className="mt-1">
                <select
                  id="province"
                  name="province"
                  autoComplete="address-level1"
                  value={profile.province}
                  onChange={handleChange}
                  className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    validationErrors.province ? 'border-red-300' : ''
                  }`}
                >
                  {provinces.map(province => (
                    <option key={province.value} value={province.value}>
                      {province.label}
                    </option>
                  ))}
                </select>
                {validationErrors.province && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.province}</p>
                )}
              </div>
            </div>

            {/* Postal Code */}
            <div className="sm:col-span-2">
              <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                Postal Code
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="postal_code"
                  id="postal_code"
                  autoComplete="postal-code"
                  value={profile.postal_code}
                  onChange={handleChange}
                  className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    validationErrors.postal_code ? 'border-red-300' : ''
                  }`}
                  placeholder="K1A 0A6"
                />
                {validationErrors.postal_code && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.postal_code}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="sm:col-span-3">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  autoComplete="tel"
                  value={profile.phone}
                  onChange={handleChange}
                  className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    validationErrors.phone ? 'border-red-300' : ''
                  }`}
                  placeholder="(555) 123-4567"
                />
                {validationErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              * Required fields
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  // Reset form to original values
                  setProfile({
                    first_name: user?.user_metadata?.first_name || user?.user_metadata?.firstName || '',
                    last_name: user?.user_metadata?.last_name || user?.user_metadata?.lastName || '',
                    address: '',
                    city: '',
                    province: '',
                    postal_code: '',
                    phone: ''
                  });
                  setValidationErrors({});
                  setError(null);
                  setSuccess(false);
                }}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </div>
                ) : (
                  'Save Profile'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}