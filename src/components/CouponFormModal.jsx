
import { useState, useEffect } from 'react';

export default function CouponFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  coupon = null, 
  mode = 'create' // 'create' or 'edit'
}) {
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    description: '',
    usage_limit: '',
    per_user_limit: '',
    valid_from: new Date().toISOString().slice(0, 16),
    valid_until: '',
    minimum_order_value: '0',
    is_active: true,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (mode === 'edit' && coupon) {
      setFormData({
        code: coupon.code || '',
        type: coupon.type || 'percentage',
        value: coupon.value?.toString() || '',
        description: coupon.description || '',
        usage_limit: coupon.usage_limit?.toString() || '',
        per_user_limit: coupon.per_user_limit?.toString() || '1',
        valid_from: coupon.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 16) : '',
        valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 16) : '',
        minimum_order_value: coupon.minimum_order_value?.toString() || '0',
        is_active: coupon.is_active !== undefined ? coupon.is_active : true,
      });
    } else {
      // Reset form for create mode
      setFormData({
        code: '',
        type: 'percentage',
        value: '',
        description: '',
        usage_limit: '',
        per_user_limit: '',
        valid_from: new Date().toISOString().slice(0, 16),
        valid_until: '',
        minimum_order_value: '0',
        is_active: true,
      });
    }
    setErrors({});
  }, [mode, coupon, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Code validation
if (!formData.code.trim()) {
  newErrors.code = 'Coupon code is required';
} else if (formData.code.trim().length < 3) {
  newErrors.code = 'Code must be at least 3 characters';
} else if (formData.code.trim().length > 50) {
  newErrors.code = 'Code must be less than 50 characters';
} else if (!/^[A-Z0-9_!-]+$/i.test(formData.code.trim())) {
  newErrors.code = 'Code can only contain letters, numbers, hyphens, underscores, and exclamation marks';
}

    // Value validation
    if (!formData.value) {
      newErrors.value = 'Value is required';
    } else {
      const numValue = parseFloat(formData.value);
      if (isNaN(numValue) || numValue <= 0) {
        newErrors.value = 'Value must be greater than 0';
      } else if (formData.type === 'percentage' && numValue > 100) {
        newErrors.value = 'Percentage cannot exceed 100%';
      }
    }

    // Usage limit validation
    if (formData.usage_limit && parseInt(formData.usage_limit) <= 0) {
      newErrors.usage_limit = 'Usage limit must be greater than 0';
    }

    // Per user limit validation
    if (formData.per_user_limit && parseInt(formData.per_user_limit) <= 0) {
      newErrors.per_user_limit = 'Per user limit must be at least 1';
    }

    // Date validation
    if (formData.valid_until && formData.valid_from) {
      const from = new Date(formData.valid_from);
      const until = new Date(formData.valid_until);
      if (until <= from) {
        newErrors.valid_until = 'End date must be after start date';
      }
    }

    // Minimum order value validation
    if (formData.minimum_order_value && parseFloat(formData.minimum_order_value) < 0) {
      newErrors.minimum_order_value = 'Minimum order value cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Prepare data for submission
      const submitData = {
        code: formData.code.toUpperCase().trim(),
        type: formData.type,
        value: parseFloat(formData.value),
        description: formData.description.trim() || null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        per_user_limit: formData.per_user_limit ? parseInt(formData.per_user_limit) : null,
        valid_from: formData.valid_from || new Date().toISOString(),
        valid_until: formData.valid_until || null,
        minimum_order_value: parseFloat(formData.minimum_order_value) || 0,
        is_active: formData.is_active,
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: error.message || 'Failed to save coupon' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {mode === 'create' ? 'Create New Coupon' : 'Edit Coupon'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Code */}
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="SUMMER2024"
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.code ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
                </div>

                {/* Type and Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                      Discount Type *
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed_amount">Fixed Amount</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="value" className="block text-sm font-medium text-gray-700">
                      Value * {formData.type === 'percentage' ? '(%)' : '($)'}
                    </label>
                    <input
                      type="number"
                      id="value"
                      name="value"
                      value={formData.value}
                      onChange={handleChange}
                      step={formData.type === 'percentage' ? '1' : '0.01'}
                      min="0"
                      max={formData.type === 'percentage' ? '100' : undefined}
                      placeholder={formData.type === 'percentage' ? '15' : '25.00'}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.value ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value}</p>}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="2"
                    placeholder="Optional description of this coupon"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Usage Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="usage_limit" className="block text-sm font-medium text-gray-700">
                      Total Usage Limit
                    </label>
                    <input
                      type="number"
                      id="usage_limit"
                      name="usage_limit"
                      value={formData.usage_limit}
                      onChange={handleChange}
                      min="1"
                      placeholder="Unlimited"
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.usage_limit ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.usage_limit && <p className="mt-1 text-sm text-red-600">{errors.usage_limit}</p>}
                    <p className="mt-1 text-xs text-gray-500">Leave empty for unlimited</p>
                  </div>

                  <div>
                    <label htmlFor="per_user_limit" className="block text-sm font-medium text-gray-700">
                      Per User Limit
                    </label>
                    <input
                      type="number"
                      id="per_user_limit"
                      name="per_user_limit"
                      value={formData.per_user_limit}
                      onChange={handleChange}
                      min="1"
                      placeholder="Unlimited"
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.per_user_limit ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.per_user_limit && <p className="mt-1 text-sm text-red-600">{errors.per_user_limit}</p>}
                    <p className="mt-1 text-xs text-gray-500">Leave empty for unlimited uses per user</p>
                  </div>
                </div>

                {/* Validity Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="valid_from" className="block text-sm font-medium text-gray-700">
                      Valid From *
                    </label>
                    <input
                      type="datetime-local"
                      id="valid_from"
                      name="valid_from"
                      value={formData.valid_from}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="valid_until" className="block text-sm font-medium text-gray-700">
                      Valid Until
                    </label>
                    <input
                      type="datetime-local"
                      id="valid_until"
                      name="valid_until"
                      value={formData.valid_until}
                      onChange={handleChange}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.valid_until ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.valid_until && <p className="mt-1 text-sm text-red-600">{errors.valid_until}</p>}
                    <p className="mt-1 text-xs text-gray-500">Leave empty for no expiry</p>
                  </div>
                </div>

                {/* Minimum Order Value */}
                <div>
                  <label htmlFor="minimum_order_value" className="block text-sm font-medium text-gray-700">
                    Minimum Order Value ($)
                  </label>
                  <input
                    type="number"
                    id="minimum_order_value"
                    name="minimum_order_value"
                    value={formData.minimum_order_value}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.minimum_order_value ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.minimum_order_value && <p className="mt-1 text-sm text-red-600">{errors.minimum_order_value}</p>}
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Active (coupon can be used immediately)
                  </label>
                </div>

                {/* Submit Error */}
                {errors.submit && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : (mode === 'create' ? 'Create Coupon' : 'Save Changes')}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}