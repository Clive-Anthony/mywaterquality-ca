// src/components/WaterQualityReportPDF.jsx - Updated to match web report formatting
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 5,
    color: '#000000',
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
    backgroundColor: '#2563EB',
    color: 'white',
    padding: 10,
    marginLeft: -10,
    marginRight: -10,
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
logoImage: {
    height: 40,
    width: 'auto',
  },
  waterFirstLogoImage: {
    height: 32,
    width: 'auto',
  },
  waterFirstBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    border: '2 solid #2563EB',
    borderRadius: 5,
    padding: 12,
    marginBottom: 20,
  },
  waterFirstContent: {
    flex: 1,
    paddingRight: 10,
  },
  waterFirstTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  waterFirstText: {
    fontSize: 10,
    color: '#374151',
  },
  waterFirstLogo: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: 'bold',
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
cwqiInfoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 15,
  },
  cwqiInfoText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
    marginBottom: 8,
  },
  cwqiInfoList: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
    marginLeft: 10,
    marginBottom: 8,
  },
  cwqiRatingTable: {
    marginTop: 15,
    marginBottom: 15,
  },
  cwqiRatingHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  cwqiRatingRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  cwqiRatingCellRating: {
    width: '15%',
    fontSize: 8,
    fontWeight: 'bold',
    paddingRight: 5,
  },
  cwqiRatingCellScore: {
    width: '15%',
    fontSize: 8,
    paddingRight: 5,
  },
  cwqiRatingCellDescription: {
    width: '70%',
    fontSize: 8,
    paddingRight: 5,
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
  tableRowExceeded: {
    flexDirection: 'row',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: '#FEF2F2',
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
  tableCellWide: {
    flex: 3,
    fontSize: 9,
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
  alertTextLarge: {
    fontSize: 10,
    color: '#1F2937',
  },
  parameterList: {
    marginTop: 8,
    marginBottom: 8,
  },
  parameterListItem: {
    fontSize: 9,
    color: '#1F2937',
    marginBottom: 2,
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
  recommendationList: {
    fontSize: 9,
    color: '#1E40AF',
    lineHeight: 1.6,
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
const PDFTable = ({ headers, data, keyMapping, showExceeded = false }) => (
  <View style={styles.table}>
    <View style={styles.tableHeader}>
      {headers.map((header, index) => (
        <Text key={index} style={index === 0 ? styles.tableCellParameter : 
                                   header.includes('Description') || header.includes('Effect') || header.includes('Treatment') ? 
                                   styles.tableCellWide : styles.tableCellHeader}>
          {header}
        </Text>
      ))}
    </View>
    {data.map((row, rowIndex) => {
      const isExceeded = showExceeded && (row.compliance_status === 'EXCEEDS' || row.compliance_status === 'OUTSIDE_RANGE');
      return (
        <View key={rowIndex} style={isExceeded ? styles.tableRowExceeded : styles.tableRow}>
          {keyMapping.map((key, cellIndex) => (
            <Text 
              key={cellIndex} 
              style={cellIndex === 0 ? styles.tableCellParameter : 
                     (typeof key === 'function' && key.toString().includes('Description')) ||
                     (typeof key === 'function' && key.toString().includes('Effect')) ||
                     (typeof key === 'function' && key.toString().includes('Treatment')) ? 
                     styles.tableCellWide : styles.tableCell}
            >
              {typeof key === 'function' ? key(row) : row[key] || 'N/A'}
            </Text>
          ))}
        </View>
      );
    })}
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

  const formatLabResult = (param) => {
    // Use lab's original varchar format - this preserves exact significant digits
    if (param.result_value && param.result_value.trim() !== '') {
      return param.result_value.trim();
    }
    
    // Fall back to numeric if result_value is not available
    const value = param.result_numeric;
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    
    const num = parseFloat(value);
    
    // Handle very small numbers
    if (Math.abs(num) < 0.001 && num !== 0) {
      return num.toExponential(2);
    }
    
    // Handle normal range - remove trailing zeros
    let formatted = num.toString();
    if (formatted.includes('.')) {
      formatted = formatted.replace(/\.?0+$/, '');
    }
    
    return formatted;
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
      {/* Page 1: Header, Sample Info, Water First Banner, Summary */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
        <View>
            <Text style={styles.headerTitle}>Water Quality Report</Text>
            <Text style={styles.headerSubtitle}>Comprehensive Analysis Results</Text>
        </View>
        <Image 
            src="/MWQ-logo-final.png" 
            style={styles.logoImage}
        />
        </View>

        {/* Water First Banner */}
        <View style={styles.waterFirstBanner}>
        <View style={styles.waterFirstContent}>
            <Text style={styles.waterFirstTitle}>
            Supporting Water First's Drinking Water Internship
            </Text>
            <Text style={styles.waterFirstText}>
            $5 of every water quality package purchased through mywaterquality.ca will go to Water First.
            </Text>
        </View>
        <Image 
            src="/images/water_first.png" 
            style={styles.waterFirstLogoImage}
        />
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
          <Text style={styles.alertTextLarge}>
            {healthConcerns.length === 0 
              ? 'All health-related parameters are within acceptable limits' 
              : `${healthConcerns.length} health-related parameter(s) exceed recommended limits`
            }
          </Text>
          {healthConcerns.length > 0 && (
            <View style={styles.parameterList}>
              {healthConcerns.map((param, index) => (
                <Text key={index} style={styles.parameterListItem}>
                  • {param.parameter_name}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* AO Parameters Summary */}
        <Text style={styles.subsectionTitle}>Aesthetic and Operational Parameters</Text>
        <View style={aoConcerns.length === 0 ? styles.alertSuccess : styles.alertWarning}>
          <Text style={styles.alertTextLarge}>
            {aoConcerns.length === 0 
              ? 'All aesthetic and operational parameters are within acceptable limits' 
              : `${aoConcerns.length} aesthetic/operational parameter(s) exceed recommended limits`
            }
          </Text>
          {aoConcerns.length > 0 && (
            <View style={styles.parameterList}>
              {aoConcerns.map((param, index) => (
                <Text key={index} style={styles.parameterListItem}>
                  • {param.parameter_name}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Bacteriological Results */}
        {bacteriological.length > 0 && (
          <View>
            <Text style={styles.subsectionTitle}>Bacteriological Results</Text>
            <View style={styles.alertWarning}>
              <Text style={styles.alertText}>
                Bacterial contamination analysis:
                {bacteriological.map((param, index) => (
                  `\n${param.parameter_name}: ${formatLabResult(param)} ${param.result_units || param.parameter_unit || ''}`
                ))}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          This report is generated based on laboratory analysis results. For questions about your water quality or treatment options, please consult with a qualified water treatment professional.
        </Text>
      </Page>

      {/* Page 2: Full Results Tables */}
<Page size="A4" style={styles.page}>
  <Text style={styles.sectionTitle}>Full Results</Text>
  
  {/* Health Parameters Table */}
  {healthParameters.length > 0 && (
    <View>
      <Text style={styles.subsectionTitle}>Health Parameter Results (MAC)</Text>
      <PDFTable
        headers={['Parameter', 'Result', 'Unit', 'Objective', 'Status']}
        data={healthParameters}
        keyMapping={[
          'parameter_name',
          (row) => formatLabResult(row),
          (row) => row.result_units || row.parameter_unit || 'N/A',
          (row) => row.objective_display || formatValue(row.objective_value, '', 3),
          (row) => getComplianceStatus(row)
        ]}
        showExceeded={true}
      />
    </View>
  )}

  {/* AO Parameters Table */}
  {aoParameters.length > 0 && (
    <View>
      <Text style={styles.subsectionTitle}>Aesthetic & Operational Parameter Results (AO)</Text>
      <PDFTable
        headers={['Parameter', 'Result', 'Unit', 'Objective', 'Status']}
        data={aoParameters}
        keyMapping={[
          'parameter_name',
          (row) => formatLabResult(row),
          (row) => row.result_units || row.parameter_unit || 'N/A',
          (row) => row.objective_display || formatValue(row.objective_value, '', 3),
          (row) => getComplianceStatus(row)
        ]}
        showExceeded={true}
      />
    </View>
  )}

  {/* Parameters of Concern Details */}
  {(healthConcerns.length > 0 || aoConcerns.length > 0) && (
    <View>
      {healthConcerns.length > 0 && (
        <View>
          <Text style={styles.subsectionTitle}>Health Parameters of Concern - Details</Text>
          <PDFTable
            headers={['Parameter', 'Description', 'Health Effect']}
            data={healthConcerns}
            keyMapping={[
              'parameter_name',
              (row) => row.description || row.parameter_description || 'A water quality parameter that requires monitoring for health and safety compliance.',
              (row) => row.health_effects || 'Elevated levels may pose health risks. Consult with a water treatment professional for specific health implications and recommended actions.'
            ]}
          />
        </View>
      )}

      {aoConcerns.length > 0 && (
        <View>
          <Text style={styles.subsectionTitle}>Aesthetic/Operational Parameters of Concern - Details</Text>
          <PDFTable
            headers={['Parameter', 'Description', 'Treatment Options']}
            data={aoConcerns}
            keyMapping={[
              'parameter_name',
              (row) => row.description || row.parameter_description || 'A water quality parameter that affects the aesthetic or operational characteristics of your water system.',
              (row) => row.treatment_options || 'Multiple treatment options are available including filtration, softening, and chemical treatment. Consult with a certified water treatment professional to determine the best solution for your specific situation.'
            ]}
          />
        </View>
      )}
    </View>
  )}

  <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
</Page>

      {/* Page 3: General Recommendations */}
        <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>General Recommendations</Text>
        
        <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>General Recommendations</Text>
            <Text style={styles.recommendationList}>
            • Test your water annually or when you notice changes in taste, odor, or appearance{'\n'}
            • Maintain your well and water system according to manufacturer guidelines{'\n'}
            • Keep potential contamination sources away from your well head{'\n'}
            • Contact a water treatment professional for treatment options if needed
            </Text>
        </View>

        <Text style={styles.footer}>
            This report is generated based on laboratory analysis results. For questions about your water quality or treatment options, please consult with a qualified water treatment professional.{'\n\n'}
            Report generated on {formatDate(new Date().toISOString())} | MyWaterQuality.ca
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
        </Page>

        {/* Page 4: CWQI Information */}
            <Page size="A4" style={styles.page}>
            <Text style={styles.sectionTitle}>About Your Water Quality Assessment</Text>
            
            <Text style={styles.cwqiInfoTitle}>INTRODUCTION TO YOUR DRINKING WATER QUALITY REPORT CARD</Text>
            
            <Text style={styles.cwqiInfoText}>
                Your Drinking Water Quality Report Card presents laboratory results in a clear and easy-to-understand format. It includes the following key information:
            </Text>
            
            <Text style={styles.cwqiInfoText}>
                1. Your Drinking Water Quality Score or Grade: Based on the Canadian Water Quality Index (CWQI).
            </Text>
            
            <Text style={styles.cwqiInfoText}>
                2. Summary of Drinking Water Quality Results: Divided into two main categories:
            </Text>
            
            <Text style={styles.cwqiInfoList}>
                • Health Parameters: Includes bacteriological results and other parameters known or suspected of having health impacts. These are compared against their Maximum Acceptable Concentration (MAC) and Interim Maximum Acceptable Concentration (IMAC) to ensure safety.
            </Text>
            
            <Text style={styles.cwqiInfoList}>
                • Aesthetic (AO) /Operational (OG) Parameters: Includes parameters that can affect the taste, smell or appearance of the water, as well as parameters that can cause issues with treatment and distribution systems.
            </Text>
            
            <Text style={styles.cwqiInfoText}>
                3. Your Detailed Drinking Water Quality Results: Laboratory results are summarized into three main tables: Health-Based, Aesthetic/Operational-Based, and General Parameters. For each parameter that exceeds the concentration threshold, the Drinking Water Quality Report Card provides a detailed description of the parameter and why it is a concern, along with recommended treatment options.
            </Text>
            
            <Text style={styles.cwqiInfoTitle}>HOW WE GRADE YOUR DRINKING WATER QUALITY</Text>
            
            <Text style={styles.cwqiInfoText}>
                The Canadian Water Quality Index (CWQI) is a reliable tool for assessing water quality and determining its suitability for drinking. It evaluates a broad range of water quality parameters and consolidates them into a single score.
            </Text>
            
            <Text style={styles.cwqiInfoText}>
                The CWQI method relies on a set of parameters with drinking water standards established to ensure water safety for human consumption. These standards include:
            </Text>
            
            <Text style={styles.cwqiInfoList}>
                • Health-Related Standards: Water must be free from disease-causing organisms and toxic chemicals at unsafe concentrations.
            </Text>
            
            <Text style={styles.cwqiInfoList}>
                • Aesthetic Objectives: Water should be clear, palatable, and visually acceptable.
            </Text>
            
            <Text style={styles.cwqiInfoList}>
                • Operational Guidelines: Water should not contain substances that could hinder effective treatment, disinfection, or distribution.
            </Text>
            
            <Text style={styles.cwqiInfoText}>
                The CWQI evaluates water quality by calculating three key factors based on established objectives:
            </Text>
            
            <Text style={styles.cwqiInfoList}>
                • Scope: The number of parameters that do not meet their designated objectives.
            </Text>
            
            <Text style={styles.cwqiInfoList}>
                • Frequency: The proportion of water samples that fail to meet these objectives.
            </Text>
            
            <Text style={styles.cwqiInfoList}>
                • Magnitude: The degree to which each failed parameter exceeds its objective.
            </Text>
            
            <Text style={styles.cwqiInfoText}>
                The concentration reported by the laboratory for each parameter is characterized by a colouring system:
            </Text>
            
            <Text style={styles.cwqiInfoList}>
                • Green: Concentration meets the standards/guidelines
            </Text>
            
            <Text style={styles.cwqiInfoList}>
                • Red: Concentration fails to meet the standards/guidelines
            </Text>
            
            {/* CWQI Rating Table */}
            <View style={styles.cwqiRatingTable}>
                <View style={styles.cwqiRatingHeader}>
                <Text style={[styles.cwqiRatingCellRating, styles.tableCellHeader]}>RATING</Text>
                <Text style={[styles.cwqiRatingCellScore, styles.tableCellHeader]}>CWQI SCORE</Text>
                <Text style={[styles.cwqiRatingCellDescription, styles.tableCellHeader]}>WHAT DOES THE SCORE MEAN?</Text>
                </View>
                
                <View style={styles.cwqiRatingRow}>
                <Text style={styles.cwqiRatingCellRating}>Excellent</Text>
                <Text style={styles.cwqiRatingCellScore}>95-100</Text>
                <Text style={styles.cwqiRatingCellDescription}>Water quality is protected with a virtual absence of impairment; conditions are very close to pristine levels. These index values can only be obtained if all measurements meet recommended guidelines virtually all the time.</Text>
                </View>
                
                <View style={styles.cwqiRatingRow}>
                <Text style={styles.cwqiRatingCellRating}>Very Good</Text>
                <Text style={styles.cwqiRatingCellScore}>89-94</Text>
                <Text style={styles.cwqiRatingCellDescription}>Water quality is protected with a slight presence of impairment. Conditions are close to pristine levels.</Text>
                </View>
                
                <View style={styles.cwqiRatingRow}>
                <Text style={styles.cwqiRatingCellRating}>Good</Text>
                <Text style={styles.cwqiRatingCellScore}>80-88</Text>
                <Text style={styles.cwqiRatingCellDescription}>Water quality is protected with only a minor degree of impairment. Conditions rarely depart from desirable levels.</Text>
                </View>
                
                <View style={styles.cwqiRatingRow}>
                <Text style={styles.cwqiRatingCellRating}>Fair</Text>
                <Text style={styles.cwqiRatingCellScore}>65-79</Text>
                <Text style={styles.cwqiRatingCellDescription}>Water quality is usually protected but occasionally impaired. Conditions sometimes depart from desirable levels.</Text>
                </View>
                
                <View style={styles.cwqiRatingRow}>
                <Text style={styles.cwqiRatingCellRating}>Marginal</Text>
                <Text style={styles.cwqiRatingCellScore}>45-64</Text>
                <Text style={styles.cwqiRatingCellDescription}>Water quality is frequently impaired. Conditions often depart from desirable levels.</Text>
                </View>
                
                <View style={styles.cwqiRatingRow}>
                <Text style={styles.cwqiRatingCellRating}>Poor</Text>
                <Text style={styles.cwqiRatingCellScore}>0-44</Text>
                <Text style={styles.cwqiRatingCellDescription}>Water quality is almost always impaired. Conditions usually depart from desirable levels.</Text>
                </View>
            </View>

            <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
            </Page>
    </Document>
  );
};

export default WaterQualityReportPDF;