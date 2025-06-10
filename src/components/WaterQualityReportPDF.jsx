// src/components/WaterQualityReportPDF.jsx - Updated to match web report formatting
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Create styles for PDF
const styles = StyleSheet.create({
page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    paddingBottom: 50, // Add extra bottom padding for page numbers
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
    marginTop: 15,
    marginBottom: 8,
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
    marginBottom: 15,
    marginTop: 10,
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
    width: '18%',
    fontSize: 8,
    fontWeight: 'bold',
    paddingRight: 3,
    textAlign: 'left',
  },
  cwqiRatingCellScore: {
    width: '18%',
    fontSize: 8,
    paddingRight: 3,
    textAlign: 'center',
  },
  cwqiRatingCellDescription: {
    width: '64%',
    fontSize: 8,
    paddingRight: 3,
    textAlign: 'left',
  },
  table: {
    marginBottom: 15,
  },
tableContainer: {
    maxHeight: 650, // Limit table height to prevent page overflow
    marginBottom: 20,
  },
tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 3, // Reduced from 6 to 3
    alignItems: 'flex-start',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 3, // Reduced from 6 to 3
    alignItems: 'flex-start',
  },
  tableRowExceeded: {
    flexDirection: 'row',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 3, // Reduced from 6 to 3
    backgroundColor: '#FEF2F2',
    alignItems: 'flex-start',
  },
  tableCellHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    lineHeight: 1.2,
  },
  tableCell: {
    fontSize: 9,
    color: '#1F2937',
    lineHeight: 1.2,
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
    bottom: 15, // Moved higher from 30
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#6B7280',
    backgroundColor: 'white', // Add background to ensure visibility
    paddingVertical: 2,
  },
  tableCellParameterName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1F2937',
    lineHeight: 1.1, 
  },
  tableCellUnit: {
    width: '12%',
    fontSize: 9,
    paddingRight: 3,
    textAlign: 'center',
  },
  tableCellObjective: {
    width: '28%',
    fontSize: 9,
    paddingRight: 3,
    textAlign: 'center',
  },
  tableCellStatus: {
    width: '23%',
    fontSize: 9,
    paddingRight: 3,
    textAlign: 'center',
  },
  tableCellDescription: {
    width: '35%',
    fontSize: 9,
    paddingRight: 3,
  },
  tableCellHealthEffect: {
    width: '40%',
    fontSize: 9,
    paddingRight: 3,
  },
alertBoxPlain: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    borderLeft: '4 solid #E5E7EB', // Gray border instead of colored
  },
  alertTextPlain: {
    fontSize: 10,
    color: '#1F2937', // Black text
  },
  recommendationListBlack: {
    fontSize: 9,
    color: '#1F2937', // Black text
    lineHeight: 1.6,
    marginBottom: 15,
  },
  sampleInfoContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 15,
  },
  
  sampleInfoTableLeft: {
    width: '65%', // 2/3 of container
    border: '1 solid #E5E7EB',
    borderRadius: 5,
  },
  
  sampleInfoTableRight: {
    width: '30%', // 1/3 of container
    border: '1 solid #E5E7EB',
    borderRadius: 5,
  },
  
  tableRowSample: {
    flexDirection: 'row',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  
  tableRowSampleLast: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  
  tableCellSampleLabel: {
    width: '45%',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    paddingRight: 8,
  },
  
  tableCellSampleValue: {
    width: '55%',
    fontSize: 10,
    color: '#1F2937',
  },
  
  tableCellDateLabel: {
    width: '50%',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    paddingRight: 4,
  },
  
  tableCellDateValue: {
    width: '50%',
    fontSize: 9,
    color: '#1F2937',
  },
  summaryCardsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  
  summaryCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    border: '1 solid #E5E7EB',
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
  },
  
  summaryCardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  summaryCardNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  
  summaryCardText: {
    fontSize: 10,
    textAlign: 'center',
    color: '#6B7280',
  },
  
  summaryCardNumberGreen: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    color: '#059669',
  },
  
  summaryCardNumberRed: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    color: '#DC2626',
  },
  
  summaryCardTextGreen: {
    fontSize: 10,
    textAlign: 'center',
    color: '#059669',
  },
  
  summaryCardTextRed: {
    fontSize: 10,
    textAlign: 'center',
    color: '#DC2626',
  },
  parametersContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 15,
    minHeight: 180,
  },
  
  parameterCwqiSection: {
    width: '38%', // 2/5 of container
    marginRight: 10,
  },
  
  parameterTextSection: {
    width: '57%', // 3/5 of container
    backgroundColor: '#F9FAFB',
    border: '1 solid #E5E7EB',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'flex-start',
  },
  
  qualityStatement: {
    fontSize: 11,
    color: '#1F2937',
    marginBottom: 12,
    lineHeight: 1.4,
  },
  
  qualityLevel: {
    fontWeight: 'bold',
  },
  
  parametersList: {
    marginTop: 8,
  },
  
  parametersListTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 6,
  },
  
  parametersListItem: {
    fontSize: 10,
    marginBottom: 3,
  },
  
  parametersListItemHealth: {
    fontSize: 10,
    color: '#DC2626',
    marginBottom: 3,
  },
  
  parametersListItemAO: {
    fontSize: 10,
    color: '#F59E0B',
    marginBottom: 3,
  },
  
  recommendationsSection: {
    marginBottom: 20,
  },
  
  recommendationsHeaderHealth: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 8,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 4,
    border: '1 solid #FECACA',
  },
  
  recommendationsHeaderAO: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 8,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 4,
    border: '1 solid #FED7AA',
  },
  
  recommendationsHeaderGreen: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 8,
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 4,
    border: '1 solid #BBF7D0',
  },
  
  recommendationsText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.4,
    marginBottom: 12,
  },
});

// Generic Parameters Section Component
const ParametersSection = ({ cwqi, concerns, type, title }) => {
    if (!cwqi) return null;
  
    const getQualityDescription = (rating) => {
      switch (rating) {
        case 'Excellent':
          return 'water quality is protected with a virtual absence of threat or impairment; conditions are very close to natural or pristine levels.';
        case 'Very Good':
          return 'water quality is protected with a slight presence of impairment. Conditions are close to pristine levels.';
        case 'Good':
          return 'water quality is protected with only a minor degree of threat or impairment; conditions rarely depart from natural or desirable levels.';
        case 'Fair':
          return 'water quality is usually protected but occasionally threatened or impaired; conditions sometimes depart from natural or desirable levels.';
        case 'Marginal':
          return 'water quality is frequently threatened or impaired; conditions often depart from natural or desirable levels.';
        case 'Poor':
          return 'water quality is almost always threatened or impaired; conditions usually depart from natural or desirable levels.';
        default:
          return 'the water quality assessment is based on Canadian Water Quality Index standards.';
      }
    };
  
    const hasConcerns = concerns.length > 0;
    const isHealthType = type === 'health';
  
    return (
      <View>
        {/* Parameters Layout */}
        <View style={styles.parametersContainer}>
          {/* CWQI Score Card - Left Side (2/5) */}
          <View style={styles.parameterCwqiSection}>
            <CWQIComponent cwqi={cwqi} title={title} />
          </View>
  
          {/* Text Section - Right Side (3/5) */}
          <View style={styles.parameterTextSection}>
            <Text style={styles.qualityStatement}>
              <Text style={styles.qualityLevel}>With health-related parameters, your water quality is {cwqi.rating}</Text>
              <Text>, this means that {getQualityDescription(cwqi.rating)}</Text>
            </Text>
  
            {hasConcerns && (
              <View style={styles.parametersList}>
                <Text style={styles.parametersListTitle}>
                  Parameters over the limit ({concerns.length}):
                </Text>
                {concerns.map((param, index) => (
                  <Text 
                    key={index} 
                    style={isHealthType ? styles.parametersListItemHealth : styles.parametersListItemAO}
                  >
                    • {param.parameter_name}
                  </Text>
                ))}
              </View>
            )}
  
            {!hasConcerns && (
              <Text style={[styles.qualityStatement, { color: '#059669', marginTop: 8 }]}>
                All {isHealthType ? 'health-related' : 'aesthetic and operational'} parameters are within acceptable limits.
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Generic Recommendations Section Component
const RecommendationsSection = ({ concerns, type }) => {
    const hasConcerns = concerns.length > 0;
    const isHealthType = type === 'health';
  
    const getRecommendationsConfig = () => {
      if (!hasConcerns) {
        return {
          headerStyle: styles.recommendationsHeaderGreen,
          headerText: 'Recommendations: Continue Monitoring',
          bodyText: `Your ${isHealthType ? 'health-related' : 'aesthetic and operational'} parameters are within acceptable limits. Continue regular testing to maintain water quality and monitor for any changes.`
        };
      }
  
      if (isHealthType) {
        return {
          headerStyle: styles.recommendationsHeaderHealth,
          headerText: 'Recommendations: Actions Needed',
          bodyText: 'The following health-related parameters exceed safe limits. We strongly recommend consulting with a water treatment professional and retesting after any treatment is installed.'
        };
      } else {
        return {
          headerStyle: styles.recommendationsHeaderAO,
          headerText: 'Recommendations: Consider Treatment',
          bodyText: 'Some aesthetic or operational parameters exceed recommended limits. While not necessarily health concerns, these may affect taste, odor, or water system performance. Consider treatment options to improve water quality.'
        };
      }
    };
  
    const config = getRecommendationsConfig();
  
    return (
      <View style={styles.recommendationsSection}>
        <Text style={config.headerStyle}>
          {config.headerText}
        </Text>
        <Text style={styles.recommendationsText}>
          {config.bodyText}
        </Text>
      </View>
    );
  };

// Summary Cards Component
const SummaryCards = ({ bacteriological, healthConcerns, aoConcerns }) => {
    // Check if any bacteriological parameters exceed limits
    const bacteriologicalExceeded = bacteriological.some(param => {
      if (param.parameter_category === 'health') {
        return param.compliance_status === 'EXCEEDS_MAC';
      } else if (param.parameter_category === 'ao') {
        return param.compliance_status === 'EXCEEDS_AO' || 
               (param.compliance_status === 'AO_RANGE_VALUE' && param.overall_compliance_status === 'WARNING');
      } else {
        return param.compliance_status === 'FAIL';
      }
    });
  
    const healthConcernsCount = healthConcerns.length;
    const aoConcernsCount = aoConcerns.length;
  
    return (
      <View style={styles.summaryCardsContainer}>
        {/* Bacteriological Results Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Bacteriological Results</Text>
          <Text style={bacteriologicalExceeded ? styles.summaryCardTextRed : styles.summaryCardTextGreen}>
            {bacteriologicalExceeded ? 'Coliforms present' : 'No coliforms present'}
          </Text>
        </View>
  
        {/* Health-Related Results Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Health-Related Results</Text>
          <Text style={healthConcernsCount > 0 ? styles.summaryCardNumberRed : styles.summaryCardNumberGreen}>
            {healthConcernsCount}
          </Text>
          <Text style={healthConcernsCount > 0 ? styles.summaryCardTextRed : styles.summaryCardTextGreen}>
            concerns present
          </Text>
        </View>
  
        {/* Aesthetic and Operational Results Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Aesthetic and Operational Results</Text>
          <Text style={aoConcernsCount > 0 ? styles.summaryCardNumberRed : styles.summaryCardNumberGreen}>
            {aoConcernsCount}
          </Text>
          <Text style={aoConcernsCount > 0 ? styles.summaryCardTextRed : styles.summaryCardTextGreen}>
            concerns present
          </Text>
        </View>
      </View>
    );
  };

// CWQI Component
const CWQIComponent = ({ cwqi, title }) => {
  if (!cwqi) return null;

  const getScoreColor = (rating) => {
    switch (rating) {
      case 'Poor': return '#DC2626';
      case 'Marginal': return '#F59E0B';
      case 'Good': return '#2563EB';
      case 'Excellent': return '#059669';
      case 'Very Good': return '#0D9488';
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

// Replace the PDFTable component with better break handling
const PDFTable = ({ headers, data, keyMapping, showExceeded = false, tableType = 'default' }) => {
  
    const getColumnWidths = (tableType) => {
        if (tableType === 'results') {
          return [210, 40, 40, 110, 75];
        } else if (tableType === 'concerns') {
          return [150, 170, 150];
        } else if (tableType === 'general') {  // Add this block
          return [250,150];
        }
        return [100, 100, 100, 100, 100];
      };
  
    const columnWidths = getColumnWidths(tableType);
  
    return (
      <View style={styles.tableContainer} break={data.length > 10}>
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeader}>
            {headers.map((header, index) => (
              <View key={index} style={{ width: columnWidths[index], paddingRight: 2 }}>
                <Text 
                  style={[styles.tableCellHeader, { textAlign: index === 0 ? 'left' : 'center' }]}
                  wrap={false}
                >
                  {header}
                </Text>
              </View>
            ))}
          </View>
          
          {/* Data Rows */}
            {data.map((row, rowIndex) => {
            // Function to determine if a parameter is exceeded (matches web logic)
            const isParameterExceeded = (param) => {
                if (param.parameter_category === 'health') {
                return param.compliance_status === 'EXCEEDS_MAC';
                } else if (param.parameter_category === 'ao') {
                if (param.compliance_status === 'EXCEEDS_AO') {
                    return true;
                }
                // For range values, check the overall compliance status
                if (param.compliance_status === 'AO_RANGE_VALUE') {
                    return param.overall_compliance_status === 'WARNING';
                }
                return false;
                } else {
                // For non-hybrid parameters, use the overall compliance status
                return param.compliance_status === 'FAIL';
                }
            };

            const isExceeded = showExceeded && isParameterExceeded(row);
            
            return (
                <View 
                key={rowIndex} 
                style={isExceeded ? styles.tableRowExceeded : styles.tableRow}
                break={rowIndex > 0 && rowIndex % 15 === 0} // Break every 15 rows
                >
                {keyMapping.map((key, cellIndex) => (
                    <View key={cellIndex} style={{ width: columnWidths[cellIndex], paddingRight: 2 }}>
                    <Text 
                        style={[
                        cellIndex === 0 ? styles.tableCellParameterName : styles.tableCell,
                        { 
                            textAlign: cellIndex === 0 ? 'left' : 'center',
                            fontWeight: cellIndex === 0 ? 'bold' : 'normal'
                        }
                        ]}
                        wrap={cellIndex === 0 ? false : true}
                    >
                        {typeof key === 'function' ? key(row) : row[key] || 'N/A'}
                    </Text>
                    </View>
                ))}
                </View>
            );
            })}
        </View>
      </View>
    );
  };

// Main PDF Document Component
const WaterQualityReportPDF = ({ reportData }) => {
  if (!reportData) return null;

  const { 
    sampleInfo, 
    healthParameters, 
    aoParameters,
    generalParameters, 
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

  // Update the formatLabResult function to handle hybrid parameters
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
  
  // Update the getComplianceStatus function
  const getComplianceStatus = (param) => {
    if (param.parameter_category === 'health') {
      return param.compliance_status === 'MEETS_MAC' ? 'Within Limit' : 
             param.compliance_status === 'EXCEEDS_MAC' ? 'Exceeds Limit' : 
             'No Standard';
    } else if (param.parameter_category === 'ao') {
      if (param.compliance_status === 'MEETS_AO') {
        return 'Within Limit';
      } else if (param.compliance_status === 'EXCEEDS_AO') {
        return 'Exceeds Limit';
      } else if (param.compliance_status === 'AO_RANGE_VALUE') {
        if (param.overall_compliance_status === 'WARNING') {
          return 'Outside Range';
        } else if (param.overall_compliance_status === 'PASS') {
          return 'Within Range';
        } else {
          return 'Range Value';
        }
      } else {
        return 'No Standard';
      }
    } else {
      // For non-hybrid parameters
      return param.compliance_status === 'PASS' ? 'Within Limit' : 
             param.compliance_status === 'FAIL' ? 'Exceeds Limit' : 
             'No Standard';
    }
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
        {/* <View style={styles.waterFirstBanner}>
        <View style={styles.waterFirstContent}>
            <Text style={styles.waterFirstTitle}>
            Supporting Water First's Drinking Water Internship
            </Text>
            <Text style={styles.waterFirstText}>
            $5 of every water quality package purchased through My Water Quality will go to Water First.
            </Text>
        </View>
        <Image 
            src="/images/water_first.png" 
            style={styles.waterFirstLogoImage}
        />
        </View> */}

        {/* Sample Information */}
        {/* <Text style={styles.sectionTitle}>Sample Information</Text> */}
        <View style={styles.sampleInfoContainer}>
        {/* Left Table - Sample Details */}
        <View style={styles.sampleInfoTableLeft}>
            <View style={styles.tableRowSample}>
            <Text style={styles.tableCellSampleLabel}>Location Name</Text>
            <Text style={styles.tableCellSampleValue}>Kitchen Tap - Main Floor</Text>
            </View>
            <View style={styles.tableRowSample}>
            <Text style={styles.tableCellSampleLabel}>Sample Description</Text>
            <Text style={styles.tableCellSampleValue}>Residential Well Water</Text>
            </View>
            <View style={styles.tableRowSampleLast}>
            <Text style={styles.tableCellSampleLabel}>Address of Sample</Text>
            <Text style={styles.tableCellSampleValue}>123 Maple Street, Toronto, ON M5V 3A8</Text>
            </View>
        </View>
        
        {/* Right Table - Dates */}
        <View style={styles.sampleInfoTableRight}>
            <View style={styles.tableRowSample}>
            <Text style={styles.tableCellDateLabel}>Collection Date</Text>
            <Text style={styles.tableCellDateValue}>{formatDate(sampleInfo?.collectionDate)}</Text>
            </View>
            <View style={styles.tableRowSample}>
            <Text style={styles.tableCellDateLabel}>Received Date</Text>
            <Text style={styles.tableCellDateValue}>{formatDate(sampleInfo?.receivedDate)}</Text>
            </View>
            <View style={styles.tableRowSampleLast}>
            <Text style={styles.tableCellDateLabel}>Report Date</Text>
            <Text style={styles.tableCellDateValue}>{formatDate(sampleInfo?.reportDate)}</Text>
            </View>
        </View>
        </View>

        

        {/* Summary of Results with Summary Cards and CWQI Scores */}
        <Text style={styles.sectionTitle}>Summary of Results - CWQI Scores</Text>

        {/* Summary Cards */}
        <SummaryCards 
        bacteriological={bacteriological}
        healthConcerns={healthConcerns}
        aoConcerns={aoConcerns}
        />

        {/* CWQI Scores */}
        <View style={styles.cwqiContainer}>
        {healthCWQI && (
            <CWQIComponent cwqi={healthCWQI} title="Health Related Parameters" />
        )}
        {aoCWQI && (
            <CWQIComponent cwqi={aoCWQI} title="Aesthetic & Operational Parameters" />
        )}
        </View>

        {/* Bacteriological Results */}
        {bacteriological.length > 0 && (
          <View>
            <Text style={styles.subsectionTitle}>Bacteriological Results</Text>
            <View style={styles.alertBoxPlain}>
            <Text style={styles.alertTextPlain}>
                Bacterial contamination analysis:
                {bacteriological.map((param, index) => (
                  `\n${param.parameter_name}: ${formatLabResult(param)} ${param.result_units || param.parameter_unit || ''}`
                ))}
              </Text>
            </View>
          </View>
        )}

        {/* Health Parameters Summary - Updated Layout */}
        <Text style={styles.subsectionTitle}>Health Related Parameters</Text>
            <ParametersSection 
            cwqi={healthCWQI} 
            concerns={healthConcerns}
            type="health"
            title="Health Related Parameters"
            />
            <RecommendationsSection 
            concerns={healthConcerns}
            type="health"
            />

{healthConcerns.length > 0 && (
      <View>
        <PDFTable
          headers={['Parameter', 'Health Effect', 'Treatment Options']}
          data={healthConcerns}
          keyMapping={[
            'parameter_name',
            (row) => row.health_effects || 'Elevated levels may pose health risks. Consult with a water treatment professional for specific health implications and recommended actions.',
            (row) => row.treatment_options || 'Multiple treatment options are available including filtration, softening, and chemical treatment. Consult with a certified water treatment professional to determine the best solution for your specific situation.'
          ]}
          tableType="concerns"
        />
      </View>
        )}      

            {/* AO Parameters Summary - New Layout */}
            <Text style={styles.subsectionTitle}>Aesthetic and Operational Parameters</Text>
            <ParametersSection 
            cwqi={aoCWQI} 
            concerns={aoConcerns}
            type="ao"
            title="Aesthetic & Operational Parameters"
            />
            <RecommendationsSection 
            concerns={aoConcerns}
            type="ao"
            />

{aoConcerns.length > 0 && (
      <View>
        <PDFTable
          headers={['Parameter', 'Description', 'Treatment Options']}
          data={aoConcerns}
          keyMapping={[
            'parameter_name',
            (row) => row.description || row.parameter_description || 'A water quality parameter that affects the aesthetic or operational characteristics of your water system.',
            (row) => row.treatment_options || 'Multiple treatment options are available including filtration, softening, and chemical treatment. Consult with a certified water treatment professional to determine the best solution for your specific situation.'
          ]}
          tableType="concerns"
        />
      </View>
    )}


        {/* Footer */}
        <Text style={styles.footer}>
          This report is generated based on laboratory analysis results. For questions about your water quality or treatment options, please consult with a qualified water treatment professional.
        </Text>
      </Page>


      {/* Page 3: Full Results Tables */}
<Page size="A4" style={styles.page}>
  <Text style={styles.sectionTitle}>Full Results</Text>
  

{/* Health Parameters Table */}
{healthParameters.length > 0 && (
  <View>
    <Text style={styles.subsectionTitle}>Health Parameter Results (MAC)</Text>
    <PDFTable
      headers={['Parameter', 'Result', 'Unit', 'Recommended Maximum Concentration', 'Status']}
      data={healthParameters}
      keyMapping={[
        'parameter_name',
        (row) => formatLabResult(row),
        (row) => row.result_units || row.parameter_unit || 'N/A',
        (row) => {
          // For hybrid parameters in health table, use MAC values
          if (row.parameter_category === 'health') {
            return row.mac_display || formatValue(row.mac_value, '', 3);
          }
          return row.objective_display || formatValue(row.objective_value, '', 3);
        },
        (row) => getComplianceStatus(row)
      ]}
      showExceeded={true}
      tableType="results"
    />
  </View>
)}

{/* AO Parameters Table */}
{aoParameters.length > 0 && (
  <View>
    <Text style={styles.subsectionTitle}>Aesthetic & Operational Parameter Results (AO)</Text>
    <PDFTable
      headers={['Parameter', 'Result', 'Unit', 'Recommended Maximum Concentration', 'Status']}
      data={aoParameters}
      keyMapping={[
        'parameter_name',
        (row) => formatLabResult(row),
        (row) => row.result_units || row.parameter_unit || 'N/A',
        (row) => {
          // For hybrid parameters in AO table, use AO values
          if (row.parameter_category === 'ao') {
            return row.ao_display || formatValue(row.ao_value, '', 3);
          }
          return row.objective_display || formatValue(row.objective_value, '', 3);
        },
        (row) => getComplianceStatus(row)
      ]}
      showExceeded={true}
      tableType="results"
    />
  </View>
)}

{/* Add General Parameters Table here */}
{generalParameters && generalParameters.length > 0 && (
  <View break={generalParameters.length > 15}>
    <Text style={styles.subsectionTitle}>General Parameter Results</Text>
    <PDFTable
      headers={['Parameter', 'Result']}
      data={generalParameters}
      keyMapping={[
        'parameter_name',
        (row) => {
          const result = formatLabResult(row);
          const unit = row.result_units || row.parameter_unit || '';
          return unit ? `${result} ${unit}` : result;
        }
      ]}
      showExceeded={false}
      tableType="general"
    />
  </View>
)}

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
                • Amplitude: The degree to which each failed parameter exceeds its objective.
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
            
            {/* CWQI Rating Table - Replace the existing one */}
            <View style={styles.cwqiRatingTable} break={false} wrap={false}>
            <View style={styles.tableHeader}>
                <View style={{ width: 80, paddingRight: 5 }}>
                <Text style={[styles.tableCellHeader, { textAlign: 'left' }]}>RATING</Text>
                </View>
                <View style={{ width: 80, paddingRight: 5 }}>
                <Text style={[styles.tableCellHeader, { textAlign: 'center' }]}>CWQI SCORE</Text>
                </View>
                <View style={{ width: 300, paddingRight: 5 }}>
                <Text style={[styles.tableCellHeader, { textAlign: 'left' }]}>WHAT DOES THE SCORE MEAN?</Text>
                </View>
            </View>
            
            {[
                { rating: 'Excellent', score: '95-100', description: 'Almost all parameters meet the guidelines, and any exceedances are very small. Water quality is considered extremely high.' },
                { rating: 'Very Good', score: '89-94', description: 'One or more parameters slightly exceed guidelines, but overall water quality remains very safe and clean.' },
                { rating: 'Good', score: '80-88', description: 'Some parameters exceed guidelines, usually by small to moderate amounts. Water is generally acceptable, but attention may be needed.' },
                { rating: 'Fair', score: '65-79', description: 'Several parameters exceed guidelines, and some by larger amounts. Water quality may require treatment or monitoring.' },
                { rating: 'Marginal', score: '45-64', description: 'Many parameters exceed guidelines, and/or some exceed them by significant amounts. Water quality is likely to pose issues without treatment.' },
                { rating: 'Poor', score: '0-44', description: 'Most parameters exceed guidelines by large amounts. Water quality is poor and likely unsafe without corrective action.' }
            ].map((item, index) => (
                <View key={index} style={styles.tableRow} wrap={false}>
                <View style={{ width: 80, paddingRight: 5 }}>
                    <Text style={[styles.tableCell, { fontWeight: 'bold', textAlign: 'left' }]}>{item.rating}</Text>
                </View>
                <View style={{ width: 80, paddingRight: 5 }}>
                    <Text style={[styles.tableCell, { textAlign: 'center' }]}>{item.score}</Text>
                </View>
                <View style={{ width: 300, paddingRight: 5 }}>
                    <Text style={[styles.tableCell, { textAlign: 'left' }]}>{item.description}</Text>
                </View>
                </View>
            ))}
            </View>

            <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
            </Page>
    </Document>
  );
};

export default WaterQualityReportPDF;