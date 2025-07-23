// src/utils/testKitHelpers.js
import { supabase } from '../lib/supabaseClient';
import placeholderImage from '../assets/images/test-kit-placeholder.jpg';

/**
 * Generate URL slug from test kit name
 * @param {string} name - Test kit name
 * @returns {string} URL-friendly slug
 */
export const generateSlug = (name) => {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Get test kit by slug
 * @param {string} slug - URL slug
 * @returns {Object} { testKit, error }
 */
export const getTestKitBySlug = async (slug) => {
  try {
    // console.log('Fetching test kit by slug:', slug);
    
    const { data, error } = await supabase
      .from('test_kits')
      .select('*')
      .eq('slug', slug)
      .eq('environment', 'prod')
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { testKit: null, error: new Error('Test kit not found') };
      }
      throw error;
    }

    return { testKit: data, error: null };
  } catch (error) {
    console.error('Error fetching test kit by slug:', error);
    return { testKit: null, error };
  }
};

/**
 * Get parameters for a test kit with prioritization using view
 * @param {string} testKitId - Test kit UUID
 * @returns {Object} { parameters, featuredParameters, error }
 */
export const getTestKitParameters = async (testKitId) => {
  try {
    // console.log('Fetching parameters for test kit:', testKitId);
    
    const { data, error } = await supabase
      .from('vw_test_kits_parameters')
      .select('*')
      .eq('test_kit_id', testKitId)
      .order('priority_score', { ascending: true })
      .order('sort_order', { ascending: true, nullsLast: true })
      .order('search_name', { ascending: true });

    if (error) {
      throw error;
    }

    const allParameters = (data || []).map(item => ({
      id: item.parameter_id,
      parameter_name: item.parameter_name,
      display_name: item.display_name,
      description: item.parameter_description,
      unit: item.unit,
      parameter_type: item.parameter_type,
      health_effects: item.health_effects,
      aesthetic_considerations: item.aesthetic_considerations,
      mac_value: item.mac_value,
      ao_value: item.ao_value,
      warning_limit_value: item.warning_limit_value,
      tags: item.tags,
      is_featured: item.is_featured,
      sort_order: item.sort_order,
      priority_score: item.priority_score
    }));

    // Get first 6 parameters (already prioritized by the view)
    const featuredParameters = allParameters.slice(0, 6);

    return { 
      parameters: allParameters, 
      featuredParameters,
      error: null 
    };
  } catch (error) {
    console.error('Error fetching test kit parameters:', error);
    return { parameters: [], featuredParameters: [], error };
  }
};

/**
 * Get image URL for test kit with fallback
 * @param {Object} testKit - Test kit object
 * @returns {string} Image URL or placeholder
 */
export const getTestKitImageUrl = (testKit) => {
    if (!testKit) return placeholderImage;
    
    if (testKit.image_url) {
      // If it's already a full URL, use it
      if (testKit.image_url.startsWith('http')) {
        return testKit.image_url;
      }
      
      // If it's a storage path, construct the URL
      try {
        const { data } = supabase.storage
          .from('test-kit-images')
          .getPublicUrl(testKit.image_url);
        
        return data.publicUrl;
      } catch (error) {
        console.error('Error getting image URL:', error);
        return placeholderImage;
      }
    }
    
    // Fallback to placeholder
    return placeholderImage;
  };

/**
 * Format price for display
 * @param {number} price - Price value
 * @returns {string} Formatted price
 */
export const formatPrice = (price) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(price);
};

/**
 * Check if test kit is in stock
 * @param {number} quantity - Available quantity
 * @returns {boolean} Whether item is in stock
 */
export const isInStock = (quantity) => quantity > 0;

/**
 * Get stock status information
 * @param {number} quantity - Available quantity
 * @returns {Object} Stock status with text and styling
 */
export const getStockStatus = (quantity) => {
  if (quantity === 0) {
    return { text: 'Out of Stock', className: 'bg-red-100 text-red-800' };
  } else if (quantity <= 10) {
    return { text: 'Low Stock', className: 'bg-yellow-100 text-yellow-800' };
  } else {
    return { text: 'In Stock', className: 'bg-green-100 text-green-800' };
  }
};

/**
 * Get parameter type badge styling
 * @param {string} parameterType - Parameter type (MAC, GENERAL, HYBRID, etc.)
 * @returns {Object} Badge styling information
 */
export const getParameterTypeBadge = (parameterType) => {
  switch (parameterType) {
    case 'MAC':
      return {
        label: 'Health Critical',
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    case 'HYBRID':
      return {
        label: 'Health & Aesthetic',
        className: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    case 'GENERAL':
      return {
        label: 'General',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    default:
      return {
        label: parameterType || 'Standard',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      };
  }
};

/**
 * Get default description for test kits
 * @returns {string} Default description text
 */
export const getDefaultDescription = () => {
  return "Please see parameters to understand how this test kit can support your drinking water quality";
};

/**
 * Sort parameters alphabetically by display name
 * @param {Array} parameters - Array of parameter objects
 * @returns {Array} Sorted parameters
 */
export const sortParametersAlphabetically = (parameters) => {
  return [...parameters].sort((a, b) => {
    const nameA = a.display_name || a.parameter_name || '';
    const nameB = b.display_name || b.parameter_name || '';
    return nameA.localeCompare(nameB);
  });
};

/**
 * Group parameters by type
 * @param {Array} parameters - Array of parameter objects
 * @returns {Object} Parameters grouped by type
 */
export const groupParametersByType = (parameters) => {
  const grouped = parameters.reduce((acc, param) => {
    const type = param.parameter_type || 'GENERAL';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(param);
    return acc;
  }, {});

  // Sort each group alphabetically
  Object.keys(grouped).forEach(type => {
    grouped[type] = sortParametersAlphabetically(grouped[type]);
  });

  return grouped;
};

/**
 * Search test kits by parameter names only
 * @param {string} searchTerm - Search term
 * @param {number} limit - Maximum results to return
 * @returns {Object} { testKits, error }
 */
export const searchTestKitsByParameters = async (searchTerm, limit = 20) => {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return { testKits: [], error: null };
      }
  
    //   console.log('Searching test kits by parameter names:', searchTerm);
      
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      
      const { data, error } = await supabase
        .from('vw_test_kits_parameters')
        .select(`
          test_kit_id,
          test_kit_name,
          test_kit_slug,
          search_name
        `)
        .ilike('search_name', searchPattern)
        .order('priority_score', { ascending: true })
        .limit(limit);
  
      if (error) {
        throw error;
      }
  
      // Group by test kit and remove duplicates
      const testKitMap = new Map();
      
      (data || []).forEach(item => {
        if (!testKitMap.has(item.test_kit_id)) {
          testKitMap.set(item.test_kit_id, {
            id: item.test_kit_id,
            name: item.test_kit_name,
            slug: item.test_kit_slug,
            matchedParameters: []
          });
        }
        
        testKitMap.get(item.test_kit_id).matchedParameters.push({
          name: item.search_name
        });
      });
  
      const testKits = Array.from(testKitMap.values());
  
      return { testKits, error: null };
    } catch (error) {
      console.error('Error searching test kits by parameters:', error);
      return { testKits: [], error };
    }
  };

/**
 * Generate meta tags for SEO
 * @param {Object} testKit - Test kit object
 * @returns {Object} Meta tag information
 */
export const generateMetaTags = (testKit) => {
  if (!testKit) {
    return {
      title: 'Test Kit Not Found | My Water Quality',
      description: 'The requested water testing kit could not be found.',
      keywords: 'water testing, water quality, test kit'
    };
  }

  const title = `${testKit.name} | My Water Quality`;
  const description = testKit.description || getDefaultDescription();
  const keywords = `water testing, ${testKit.name.toLowerCase()}, water quality, test kit, laboratory analysis`;

  return {
    title,
    description: description.length > 160 ? description.substring(0, 157) + '...' : description,
    keywords
  };
};