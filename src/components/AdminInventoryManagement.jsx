// src/components/AdminInventoryManagement.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdminInventoryManagement() {
  const [testKits, setTestKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState({});
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState({});

  // Load test kits
  useEffect(() => {
    loadTestKits();
  }, []);

  const loadTestKits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('test_kits')
        .select('*')
        .eq('active', true)
        .eq('environment','prod')
        .order('name');

      if (error) throw error;
      setTestKits(data || []);
    } catch (err) {
      console.error('Error loading test kits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (kitId, currentQuantity) => {
    setEditMode(prev => ({ ...prev, [kitId]: true }));
    setEditValues(prev => ({ ...prev, [kitId]: currentQuantity }));
  };

  const handleCancel = (kitId) => {
    setEditMode(prev => {
      const newEditMode = { ...prev };
      delete newEditMode[kitId];
      return newEditMode;
    });
    setEditValues(prev => {
      const newEditValues = { ...prev };
      delete newEditValues[kitId];
      return newEditValues;
    });
  };

  const handleSave = async (kitId) => {
    try {
      setSaving(prev => ({ ...prev, [kitId]: true }));
      
      const newQuantity = Math.max(0, parseInt(editValues[kitId]) || 0);
      
    //   console.log('Attempting to update kit:', kitId, 'with quantity:', newQuantity);
    //   console.log('Kit ID type:', typeof kitId);
    //   console.log('Kit ID value:', JSON.stringify(kitId));
      
      // First, let's verify the kit exists
      const { data: existingKit, error: selectError } = await supabase
        .from('test_kits')
        .select('id, name, quantity')
        .eq('id', kitId)
        .single();
      
    //   console.log('Existing kit check:', { existingKit, selectError });
      
      if (selectError) {
        console.error('Error finding kit:', selectError);
        alert('Error finding test kit: ' + selectError.message);
        return;
      }
      
      if (!existingKit) {
        console.error('Kit not found with ID:', kitId);
        alert('Test kit not found with the provided ID');
        return;
      }
      
      // Now try the update
      const { data, error } = await supabase
        .from('test_kits')
        .update({ quantity: newQuantity })
        .eq('id', kitId)
        .select();

    //   console.log('Update response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        alert('Error updating quantity: ' + error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.error('No rows were updated');
        // console.log('All test kits for comparison:', testKits.map(k => ({ id: k.id, name: k.name })));
        alert('No rows were updated. Check console for debugging info.');
        return;
      }

    //   console.log('Successfully updated:', data[0]);

      // Update local state
      setTestKits(prev => 
        prev.map(kit => 
          kit.id === kitId ? { ...kit, quantity: newQuantity } : kit
        )
      );

      // Exit edit mode
      handleCancel(kitId);
      
      alert('Quantity updated successfully!');
    } catch (err) {
      console.error('Error updating quantity:', err);
      alert('Error updating quantity: ' + err.message);
    } finally {
      setSaving(prev => ({ ...prev, [kitId]: false }));
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {testKits.map((kit) => (
        <div key={kit.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden h-full flex flex-col">
          <div className="p-4 sm:p-6 flex-1 flex flex-col">
            {/* Test Kit Info - Fixed height section */}
            <div className="flex-1 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 min-h-[2.5rem] line-clamp-2">
                {kit.name}
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Price:</span> {formatPrice(kit.price)}
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Quantity:</span> {kit.quantity}
                </p>
              </div>
            </div>

            {/* Action Section - Fixed height */}
            <div className="mt-auto">
              {editMode[kit.id] ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editValues[kit.id] || 0}
                      onChange={(e) => setEditValues(prev => ({
                        ...prev,
                        [kit.id]: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSave(kit.id)}
                      disabled={saving[kit.id]}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving[kit.id] ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => handleCancel(kit.id)}
                      disabled={saving[kit.id]}
                      className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <button
                  onClick={() => handleEdit(kit.id, kit.quantity)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}