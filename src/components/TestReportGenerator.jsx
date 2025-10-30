// src/components/TestReportGenerator.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function TestReportGenerator() {
  const [selectedSample, setSelectedSample] = useState('');
  const [availableSamples, setAvailableSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAvailableSamples();
  }, []);

  const loadAvailableSamples = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_test_results_with_parameters')
        .select('sample_number, work_order_number')
        .not('sample_number', 'is', null)
        .order('sample_number', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get unique samples
      const uniqueSamples = Array.from(
        new Set(data.map(d => d.sample_number))
      ).map(sampleNum => {
        const sampleData = data.find(d => d.sample_number === sampleNum);
        return {
          sample_number: sampleNum,
          work_order_number: sampleData.work_order_number
        };
      });

      setAvailableSamples(uniqueSamples);
    } catch (err) {
      console.error('Error loading samples:', err);
      setError('Failed to load available samples');
    }
  };

  const handleGenerateTestReport = async () => {
    if (!selectedSample) {
      setError('Please select a sample number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/.netlify/functions/test-report-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          dataMode: 'real',
          sampleNumber: selectedSample
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate test report');
      }

      const result = await response.json();
      
      // Download the PDF
      const pdfBlob = new Blob(
        [Uint8Array.from(atob(result.pdfBase64), c => c.charCodeAt(0))],
        { type: 'application/pdf' }
      );
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error generating test report:', err);
      setError(err.message || 'Failed to generate test report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="testSample" className="block text-sm font-medium text-gray-700 mb-2">
          Select Sample for Testing <span className="text-red-500">*</span>
        </label>
        <select
          id="testSample"
          value={selectedSample}
          onChange={(e) => setSelectedSample(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          disabled={loading}
        >
          <option value="">-- Select a sample --</option>
          {availableSamples.map((sample) => (
            <option key={sample.sample_number} value={sample.sample_number}>
              Sample: {sample.sample_number} - WO: {sample.work_order_number}
            </option>
          ))}
        </select>
      </div>

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

      <div className="flex justify-end border-t border-gray-200 pt-6">
        <button
          onClick={handleGenerateTestReport}
          disabled={!selectedSample || loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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
    </div>
  );
}