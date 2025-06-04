// src/components/WaterQualityReportPDF.jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#2563EB',
    color: 'white',
    borderRadius: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 5,
  },
  logo: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#1F2937',
  },
  subsectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    color: '#374151',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  infoItem: {
    width: '50%',
    marginBottom: 10,
    paddingRight: 10,
  },
  infoLabel: {
    fontSize: 8,
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 2,
  },
  cwqiContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  cwqiBox: {
    flex: 1,
    border: '1 solid #E5E7EB',
    borderRadius: 5,
    padding: 15,
  },
  cwqiTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  cwqiScore: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  cwqiRating: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  cwqiBar: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginBottom: 8,
    flexDirection: 'row',
  },
  cwqiBarFill: {
    height: 12,
    borderRadius: 6,
  },
  cwqiSummary: {
    fontSize: 9,
    textAlign: 'center',
    color: '#6B7280',
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    paddingRight: 5,
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    paddingRight: 5,
  },
  tableCellParameter: {
    flex: 2,
    fontSize: 9,
    fontWeight: 'bold',
    paddingRight: 5,
  },
  statusPass: {
    color: '#059669',
  },
  statusFail: {
    color: '#DC2626',
  },
  alertBox: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    borderLeft: '4 solid',
  },
  alertSuccess: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#22C55E',
  },
  alertWarning: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#F59E0B',
  },
  alertText: {
    fontSize: 9,
    color: '#1F2937',
  },
  recommendationBox: {
    backgroundColor: '#EFF6FF',
    border: '1 solid #DBEAFE',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  recommendationTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 5,
  },
  recommendationText: {
    fontSize: 9,
    color: '#1E40AF',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#6B7280',
    borderTop: '1 solid #E5E7EB',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 8,
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#6B7280',
  },
});

// CWQI Component
const CWQIComponent = ({ cwqi, title }) => {
  if (!cwqi) return null;

  const getScoreColor = (rating) => {
    switch (rating) {
      case 'Poor': return '#DC2626';
      case 'Marginal': return '#F59E0B';
      case 'Good': return '#2563EB';
      case 'Excellent': return '#059669';
      default: return '#6B7280';
    }
  };

  const getBarWidth = (score) => `${Math.max(5, Math.min(100, score))}%`;

  return (
    <View style={styles.cwqiBox}>
      <Text style={styles.cwqiTitle}>{title}</Text>
      <Text style={[styles.cwqiScore, { color: getScoreColor(cwqi.rating) }]}>
        {cwqi.score}/100
      </Text>
      <Text style={[styles.cwqiRating, { color: getScoreColor(cwqi.rating) }]}>
        {cwqi.rating}
      </Text>
      <View style={styles.cwqiBar}>
        <View style={[
          styles.cwqiBarFill, 
          { 
            backgroundColor: getScoreColor(cwqi.rating),
            width: getBarWidth(cwqi.score)
          }
        ]} />
      </View>
      <Text style={styles.cwqiSummary}>
        {cwqi.totalTests - cwqi.failedTests} of {cwqi.totalTests} parameters passed
      </Text>
    </View>
  );
};

// Table Component
const PDFTable = ({ headers, data, keyMapping }) => (
  <View style={styles.table}>
    <View style={styles.tableHeader}>
      {headers.map((header, index) => (
        <Text key={index} style={styles.tableCellHeader}>
          {header}
        </Text>
      ))}
    </View>
    {data.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.tableRow}>
        {keyMapping.map((key, cellIndex) => (
          <Text 
            key={cellIndex} 
            style={cellIndex === 0 ? styles.tableCellParameter : styles.tableCell}
          >
            {typeof key === 'function' ? key(row) : row[key] || 'N/A'}
          </Text>
        ))}
      </View>
    ))}
  </View>
);

// Main PDF Document Component
const WaterQualityReportPDF = ({ reportData }) => {
  if (!reportData) return null;

  const { 
    sampleInfo, 
    healthParameters, 
    aoParameters, 
    bacteriological, 
    healthConcerns, 
    aoConcerns, 
    healthCWQI, 
    aoCWQI 
  } = reportData;

  const formatValue = (value, unit = '', decimalPlaces = 2) => {
    if (value === null || value === undefined) return 'N/A';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    return `${numValue.toFixed(decimalPlaces)} ${unit || ''}`.trim();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getComplianceStatus = (param) => {
    const isCompliant = param.compliance_status === 'MEETS' || param.compliance_status === 'WITHIN_RANGE';
    return isCompliant ? 'Within Limit' : 'Exceeds Limit';
  };

  return (
    <Document>
      {/* Page 1: Header, Sample Info, Summary */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Water Quality Report</Text>
            <Text style={styles.headerSubtitle}>Comprehensive Analysis Results</Text>
          </View>
          <Text style={styles.logo}>MyWaterQuality</Text>
        </View>

        {/* Sample Information */}
        <Text style={styles.sectionTitle}>Sample Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Customer Name</Text>
            <Text style={styles.infoValue}>John Smith</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Sample Location</Text>
            <Text style={styles.infoValue}>Kitchen Tap - Main Floor</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Sample Description</Text>
            <Text style={styles.infoValue}>Residential Well Water</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Property Address</Text>
            <Text style={styles.infoValue}>123 Maple Street, Toronto, ON</Text>
          </View>
        </View>

        {/* Testing Timeline */}
        <Text style={styles.subsectionTitle}>Testing Timeline</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Collection Date</Text>
            <Text style={styles.infoValue}>{formatDate(sampleInfo?.collectionDate)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Received Date</Text>
            <Text style={styles.infoValue}>{formatDate(sampleInfo?.receivedDate)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Report Date</Text>
            <Text style={styles.infoValue}>{formatDate(sampleInfo?.reportDate)}</Text>
          </View>
        </View>

        {/* CWQI Scores */}
        <Text style={styles.sectionTitle}>Summary of Results - CWQI Scores</Text>
        <View style={styles.cwqiContainer}>
          {healthCWQI && (
            <CWQIComponent cwqi={healthCWQI} title="Health Related Parameters" />
          )}
          {aoCWQI && (
            <CWQIComponent cwqi={aoCWQI} title="Aesthetic & Operational Parameters" />
          )}
        </View>

        {/* Health Parameters Summary */}
        <Text style={styles.subsectionTitle}>Health Related Parameters</Text>
        <View style={healthConcerns.length === 0 ? styles.alertSuccess : styles.alertWarning}>
          <Text style={styles.alertText}>
            {healthConcerns.length === 0 
              ? 'All health-related parameters are within acceptable limits' 
              : `${healthConcerns.length} health-related parameter(s) exceed recommended limits`
            }
          </Text>
        </View>

        {/* AO Parameters Summary */}
        <Text style={styles.subsectionTitle}>Aesthetic and Operational Parameters</Text>
        <View style={aoConcerns.length === 0 ? styles.alertSuccess : styles.alertWarning}>
          <Text style={styles.alertText}>
            {aoConcerns.length === 0 
              ? 'All aesthetic and operational parameters are within acceptable limits' 
              : `${aoConcerns.length} aesthetic/operational parameter(s) exceed recommended limits`
            }
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This report is generated based on laboratory analysis results. For questions about your water quality or treatment options, please consult with a qualified water treatment professional.
        </Text>
      </Page>

      {/* Page 2: Parameters of Concern */}
      {(healthConcerns.length > 0 || aoConcerns.length > 0) && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Parameters of Concern</Text>
          
          {healthConcerns.length > 0 && (
            <View>
              <Text style={styles.subsectionTitle}>Health Related Parameters of Concern</Text>
              <PDFTable
                headers={['Parameter', 'Result', 'Unit', 'Limit']}
                data={healthConcerns}
                keyMapping={[
                  'parameter_name',
                  (row) => formatValue(row.result_numeric, '', 3),
                  (row) => row.result_units || row.parameter_unit || 'N/A',
                  (row) => row.objective_display || formatValue(row.objective_value, '', 3)
                ]}
              />
              
              <View style={styles.recommendationBox}>
                <Text style={styles.recommendationTitle}>Recommendations</Text>
                <Text style={styles.recommendationText}>
                  Some health-related parameters exceed recommended limits. We recommend consulting with a water treatment professional and retesting after any treatment is installed.
                </Text>
              </View>
            </View>
          )}

          {aoConcerns.length > 0 && (
            <View>
              <Text style={styles.subsectionTitle}>Aesthetic/Operational Parameters of Concern</Text>
              <PDFTable
                headers={['Parameter', 'Result', 'Unit', 'Limit']}
                data={aoConcerns}
                keyMapping={[
                  'parameter_name',
                  (row) => formatValue(row.result_numeric, '', 3),
                  (row) => row.result_units || row.parameter_unit || 'N/A',
                  (row) => row.objective_display || formatValue(row.objective_value, '', 3)
                ]}
              />
              
              <View style={styles.recommendationBox}>
                <Text style={styles.recommendationTitle}>Recommendations</Text>
                <Text style={styles.recommendationText}>
                  Some aesthetic or operational parameters exceed recommended limits. While not necessarily health concerns, these may affect taste, odor, or water system performance.
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
        </Page>
      )}

      {/* Page 3: Full Health Parameters Results */}
      {healthParameters.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Health Parameter Results (MAC)</Text>
          <PDFTable
            headers={['Parameter', 'Result', 'Unit', 'Objective', 'Status']}
            data={healthParameters}
            keyMapping={[
              'parameter_name',
              (row) => formatValue(row.result_numeric, '', 3),
              (row) => row.result_units || row.parameter_unit || 'N/A',
              (row) => row.objective_display || formatValue(row.objective_value, '', 3),
              (row) => getComplianceStatus(row)
            ]}
          />
          <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
        </Page>
      )}

      {/* Page 4: Full AO Parameters Results */}
      {aoParameters.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Aesthetic & Operational Parameter Results (AO)</Text>
          <PDFTable
            headers={['Parameter', 'Result', 'Unit', 'Objective', 'Status']}
            data={aoParameters}
            keyMapping={[
              'parameter_name',
              (row) => formatValue(row.result_numeric, '', 3),
              (row) => row.result_units || row.parameter_unit || 'N/A',
              (row) => row.objective_display || formatValue(row.objective_value, '', 3),
              (row) => getComplianceStatus(row)
            ]}
          />
          <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
        </Page>
      )}

      {/* Page 5: Recommendations */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>General Recommendations</Text>
        
        <View style={styles.recommendationBox}>
          <Text style={styles.recommendationTitle}>General Recommendations</Text>
          <Text style={styles.recommendationText}>
            • Test your water annually or when you notice changes in taste, odor, or appearance{'\n'}
            • Maintain your well and water system according to manufacturer guidelines{'\n'}
            • Keep potential contamination sources away from your well head{'\n'}
            • Contact a water treatment professional for treatment options if needed
          </Text>
        </View>

        {/* Bacteriological Results */}
        {bacteriological.length > 0 && (
          <View>
            <Text style={styles.subsectionTitle}>Bacteriological Results</Text>
            <View style={styles.alertWarning}>
              <Text style={styles.alertText}>
                Bacterial contamination analysis:
                {bacteriological.map((param, index) => (
                  `\n${param.parameter_name}: ${formatValue(param.result_numeric, param.result_units)}`
                ))}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          Report generated on {formatDate(new Date().toISOString())} | MyWaterQuality.ca
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
      </Page>
    </Document>
  );
};

export default WaterQualityReportPDF;