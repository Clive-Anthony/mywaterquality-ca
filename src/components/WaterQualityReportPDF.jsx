// src/components/WaterQualityReportPDF.jsx - Updated to fix Buffer issues
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Buffer } from 'buffer';

// Buffer polyfill for @react-pdf/renderer
if (typeof global === 'undefined') {
  window.global = window;
}

// Set up Buffer globally for @react-pdf/renderer
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

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
    marginBottom: 15,
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
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 15,
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
    padding: 15,
    width: '100%', // Ensure it takes full width of its container
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
    marginTop: 12,
    marginBottom: 12,
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
    marginBottom: 20,
  },
tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 4, // Reduced from 6 to 3
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 6, // Reduced padding
    paddingHorizontal: 4,
    alignItems: 'center',
    minHeight: 30, // Minimum height for readability
  },

  tableContainerFlowable: {
    marginBottom: 15,
  },
tableHeaderRepeatable: {
  flexDirection: 'row',
  backgroundColor: '#F9FAFB',
  borderBottom: '1 solid #E5E7EB',
  paddingVertical: 8,
  paddingHorizontal: 3,
  alignItems: 'flex-start',
},
  tableRowExceeded: {
    flexDirection: 'row',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    minHeight: 25,
  },
  tableCellHeader: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    lineHeight: 1.2,
  },
  tableCell: {
    fontSize: 8, // Smaller default font
    color: '#1F2937',
    lineHeight: 1.4,
    paddingRight: 3,
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
    backgroundColor: '#FFFFFF', // White background
    border: '1 solid  #D1D5DB', // Grey border
    borderRadius: 8,
    padding: 12, // Slightly increased padding
    marginBottom: 10,
  },
  recommendationTitle: {
    fontSize: 12, // Increased from 10
    fontWeight: 'bold',
    color: '#1F2937', // Dark grey/black to match rest of PDF
    marginBottom: 12, // Increased spacing
  },
  recommendationText: {
    fontSize: 11, // Increased from 9
    color: '#374151', // Grey to match rest of PDF text
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
    lineHeight: 1.3, 
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
    fontSize: 12,
    color: '#1F2937', // Black text
    lineHeight: 1.6,
    marginBottom: 15,
    marginLeft: 10, // Add left margin to align with title box
    marginRight: 10, // Add right margin to align with title box
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
  tableContainerSummary: {
    marginBottom: 15,
    // Remove maxHeight constraint for summary tables
},
// Updated table row style for full text display
tableRowConcerns: {
  flexDirection: 'row',
  borderBottom: '1 solid #E5E7EB',
  paddingVertical: 6, // Increased padding for better spacing
  paddingHorizontal: 3,
  alignItems: 'flex-start', // Align content to top
  minHeight: 35, // Increased minimum height
  // Allow the row to expand based on content
},

// Updated table cell style for better text wrapping
tableCellConcerns: {
  fontSize: 8,
  color: '#1F2937',
  lineHeight: 1.4, // Increased line height for readability
  paddingRight: 3,
  textAlign: 'left',
  // Ensure text can wrap properly
},
  summaryCardsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20, // Increased padding
    textAlign: 'center',
    minHeight: 120, // Increased height for better proportions
    justifyContent: 'space-between',
    flexDirection: 'column',
  },
  
  // Green border variant
  summaryCardGreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    border: '2 solid #059669', // Green border
    borderRadius: 8,
    padding: 20,
    textAlign: 'center',
    minHeight: 120,
    justifyContent: 'space-between',
    flexDirection: 'column',
  },
  
  // Red border variant
  summaryCardRed: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    border: '2 solid #DC2626', // Red border
    borderRadius: 8,
    padding: 20,
    textAlign: 'center',
    minHeight: 120,
    justifyContent: 'space-between',
    flexDirection: 'column',
  },
  
  // Consistent title positioning
  summaryCardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 1.3,
    marginBottom: 0, // Remove margin since we're using flex spacing
  },
  
  // Container for the main content (number or status)
  summaryCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  
  // Container for bottom text
  summaryCardFooter: {
    justifyContent: 'flex-end',
  },
  
  // Number styling
  summaryCardNumber: {
    fontSize: 32, // Increased font size
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 0,
  },
  
  summaryCardNumberGreen: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 0,
    color: '#059669',
  },
  
  summaryCardNumberRed: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 0,
    color: '#DC2626',
  },
  
  // Status text for bacteriological (replaces number)
  summaryCardStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 0,
  },
  
  summaryCardStatusGreen: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 0,
    color: '#059669',
  },
  
  summaryCardStatusRed: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 0,
    color: '#DC2626',
  },
  
  // Bottom text styling
  summaryCardText: {
    fontSize: 10,
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 0,
  },
  
  summaryCardTextGreen: {
    fontSize: 10,
    textAlign: 'center',
    color: '#059669',
    marginTop: 0,
  },
  
  summaryCardTextRed: {
    fontSize: 10,
    textAlign: 'center',
    color: '#DC2626',
    marginTop: 0,
  },
  parametersUnifiedContainer: {
    backgroundColor: '#FFFFFF',
    border: '2 solid #9CA3AF', // Increased from 1 to 2 (thicker) and changed color from #E5E7EB to #9CA3AF (darker gray)
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  parametersContainer: {
    flexDirection: 'row',
    marginBottom: 0,
    gap: 15,
    minHeight: 180,
  },
  
  parameterCwqiSection: {
    width: '38%', // 2/5 of container
    marginRight: 10,
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
  },
  
  parameterTextSection: {
    width: '57%', // 3/5 of container
    backgroundColor: 'transparent',
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
    marginBottom: 3,
  },
  
  parametersListItemAO: {
    fontSize: 10,
    marginBottom: 3,
  },
  
  recommendationsSection: {
    marginTop: 10, // Add clear separation
    marginBottom: 8,
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
  generalRecommendationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 12,
    backgroundColor: '#2563EB',
    padding: 10,
    borderRadius: 4,
  },
  centeredTableContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  summaryCardsContainerTwoCards: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20, // Increased gap for better spacing with 2 cards
    justifyContent: 'center', // Center the cards when only 2 are shown
  },
  alertBoxContamination: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 15,
    borderRadius: 5,
    backgroundColor: '#FEF2F2',
    border: '2 solid #DC2626', // Red border
    alignItems: 'flex-start',
  },
  
  alertIconContainer: {
    marginRight: 10,
    marginTop: 2,
  },
  
  alertIcon: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  
  alertContentContainer: {
    flex: 1,
  },
  
  alertTextContamination: {
    fontSize: 11,
    color: '#1F2937',
    lineHeight: 1.4,
  },
  
  alertTextBold: {
    fontSize: 11,
    color: '#1F2937',
    lineHeight: 1.4,
    fontWeight: 'bold',
  },
  alertTextLink: {
    fontSize: 11,
    color: '#2563EB', // Blue color
    textDecoration: 'underline',
    lineHeight: 1.4,
  },
  cwqiTitleCurrent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937', // Dark gray for current score
    textAlign: 'center',
    marginBottom: 12, // Increased spacing between title and score
  },
  
  cwqiTitlePotential: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280', // Gray for potential score
    textAlign: 'center', // Center the title
    marginBottom: 4,
  },
  
  potentialScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    border: '1 solid #D1D5DB', // Gray outline
    borderRadius: 8,
    padding: 12,
    marginTop: 8, // Reduced from 15 to bring closer to health parameter container
    marginBottom: 20, // Increased from 10 to add more space before recommendations
  },
  
  potentialScoreLeft: {
    flexDirection: 'column',
    alignItems: 'center', // Center the title and score
    marginRight: 16,
    minWidth: 100, // Ensure consistent width for centering
  },
  
  potentialScoreNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669', // Green color for positive potential
    textAlign: 'center', // Center the score under the title
  },
  
  potentialScoreText: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 1.4,
    flex: 1,
    textAlign: 'left',
  },
  assessmentPage: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 60, // Increased from 50 to 60
    paddingBottom: 80, // Increased from 70 to 80
    fontSize: 10, // Reduced from 11 to 10 for better fit
    fontFamily: 'Helvetica',
    lineHeight: 1.15, // Reduced from 1.2 to 1.15 for tighter spacing
  },
  assessmentInfoTitle: {
    fontSize: 13, // Reduced from 14
    fontWeight: 'bold',
    marginTop: 18, // Reduced from 20
    marginBottom: 12, // Reduced from 15
    color: '#374151',
  },
  
  assessmentInfoText: {
    fontSize: 10, // Reduced from 11
    color: '#374151',
    lineHeight: 1.15, // Reduced from 1.2
    marginBottom: 10, // Reduced from 12
  },
  
  assessmentInfoList: {
    fontSize: 10, // Reduced from 11
    color: '#374151',
    lineHeight: 1.15, // Reduced from 1.2
    marginLeft: 15,
    marginBottom: 10, // Reduced from 12
  },

  perfectWaterBox: {
    backgroundColor: '#FFFFFF',
    border: '2 solid #059669', // Green border
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    marginTop: 10,
  },
  perfectWaterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
    textAlign: 'center',
  },
  perfectWaterText: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 1.4,
    textAlign: 'center',
  },
  noColiformsBox: {
    backgroundColor: '#FFFFFF',
    border: '2 solid #059669', // Green border
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    marginTop: 10,
  },
  noColiformsText: {
    fontSize: 10,
    marginTop:4,
    color: '#374151',
    textAlign: 'center',
    fontWeight: 'normal',
  },
});

// DEFAULT DATA - uncomment for production
const customer_first = "John"
const customer_name = "John Smith";
const order_number = 1450;
const sample_description = "Water from Tap";
const TEST_KIT = "Advanced Water Test Kit";
const test_kit_display = "Advanced Water Test Kit"

// CUSTOMER DATA -- uncomment when producing one-off reports
// const customer_first = "Nicole"
// const customer_name = "Nicole Cancelli";
// const order_number = 236;
// const sample_description = "Barn Sink - Raw Water";
// const TEST_KIT = "Advanced Water Test Kit";
// const test_kit_display = "Multiple Test Kits"



// Updated Parameters Section Component with integrated concerns table
const ParametersSection = ({ cwqi, concerns, type, title }) => {
  if (!cwqi) return null;

  const getQualityDescription = (rating, hasColiform = false) => {
    // ... keep existing getQualityDescription function as is
    if (hasColiform || rating === 'Poor - Coliform Present') {
      return 'With health-related parameters, your water quality score is Poor because coliform bacteria have been detected in your water sample. The presence of coliform bacteria indicates potential contamination and renders the water unsafe for consumption, resulting in a score of 0/100.';
    }
    
    switch (rating) {
      case 'Excellent':
        return 'almost all parameters meet the guidelines, and any exceedances are very small. Water quality is considered extremely high.';
      case 'Very Good':
        return 'one or more parameters slightly exceed guidelines, but overall water quality remains very safe and clean.';
      case 'Good':
        return 'some parameters exceed guidelines, usually by small to moderate amounts. Water is generally acceptable, but attention may be needed.';
      case 'Fair':
        return 'several parameters exceed guidelines, and some by larger amounts. Water quality may require treatment or monitoring.';
      case 'Marginal':
        return 'many parameters exceed guidelines, and/or some exceed them by significant amounts. Water quality is likely to pose issues without treatment.';
      case 'Poor':
        return 'most parameters exceed guidelines by large amounts. Water quality is poor and likely unsafe without corrective action.';
      default:
        return 'the water quality assessment is based on Canadian Water Quality Index standards.';
    }
  };

  const hasConcerns = concerns.length > 0;
  const isHealthType = type === 'health';
  const hasColiform = cwqi.coliformDetected || false;

  return (
    <View>
      {/* Unified Container with CWQI and Description */}
      <View style={styles.parametersUnifiedContainer}>
        <View style={styles.parametersContainer}>
          {/* CWQI Score Card - Left Side */}
          <View style={styles.parameterCwqiSection}>
            <CWQIComponent cwqi={cwqi} title={title} />
          </View>

          {/* Text Section - Right Side */}
          <View style={styles.parameterTextSection}>
            {hasColiform && isHealthType ? (
              <Text style={styles.qualityStatement}>
                {getQualityDescription(cwqi.rating, hasColiform)}
              </Text>
            ) : (
              <Text style={styles.qualityStatement}>
                <Text style={styles.qualityLevel}>
                  {isHealthType 
                    ? `With health-related parameters, your water quality is ${cwqi.rating}` 
                    : `For aesthetic and operational parameters, your water quality is ${cwqi.rating}`
                  }
                </Text>
                <Text>, this means that {getQualityDescription(cwqi.rating, hasColiform)}</Text>
              </Text>
            )}

            {hasConcerns && !hasColiform && concerns.length <= 6 && (
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

            {hasConcerns && !hasColiform && concerns.length > 6 && (
              <View style={styles.parametersList}>
                <Text style={styles.parametersListTitle}>
                  {concerns.length} parameters exceed recommended limits. See detailed table below for complete information.
                </Text>
              </View>
            )}

            {!hasConcerns && !hasColiform && (
              <Text style={[styles.qualityStatement, { color: '#059669', marginTop: 8 }]}>
                All {isHealthType ? 'health-related' : 'aesthetic and operational'} parameters are within acceptable limits.
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Potential Score Display */}
      {hasColiform && isHealthType && cwqi.potentialScore !== null && (
        <View style={styles.potentialScoreContainer}>
          <View style={styles.potentialScoreLeft}>
            <Text style={styles.cwqiTitlePotential}>Potential Score</Text>
            <Text style={styles.potentialScoreNumber}>
              +{cwqi.potentialScore}
            </Text>
          </View>
          <Text style={styles.potentialScoreText}>
            Your score could potentially increase by {cwqi.potentialScore} points after removing the coliforms from your drinking water.
          </Text>
        </View>
      )}

      {/* Recommendations */}
      <View style={styles.recommendationsSection}>
        <RecommendationsContent concerns={concerns} type={type} />
      </View>

      {/* Concerns Table - Directly below, with reduced spacing */}
      {hasConcerns && (
        <View style={{ marginTop: 8 }}> {/* Reduced from 15 to 8 */}
          <Text style={[styles.subsectionTitle, { 
            fontSize: 12, 
            marginBottom: 6,  /* Reduced from 10 to 6 */
            marginTop: 0      /* Ensure no extra top margin */
          }]}>
            {isHealthType ? 'Health Parameters of Concern - Details' : 'Aesthetic/Operational Parameters of Concern - Details'}
          </Text>
          <ConcernsTable data={concerns} type={type} />
        </View>
      )}
    </View>
  );
};

  // Extracted Recommendations Content Component
const RecommendationsContent = ({ concerns, type }) => {
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
    <View>
      <Text style={config.headerStyle}>
        {config.headerText}
      </Text>
      <Text style={styles.recommendationsText}>
        {config.bodyText}
      </Text>
    </View>
  );
};

  // Continuous Concerns Table with full text and better spacing
const ConcernsTable = ({ data, type = 'health' }) => {
  const config = {
    health: {
      headers: ['PARAMETER', 'HEALTH EFFECT', 'TREATMENT OPTIONS'],
      dataMapping: [
        'parameter_name',
        (row) => {
          // Return full health effect text - no truncation
          return row.health_effects || 'Elevated levels may pose health risks. Consult with a water treatment professional for specific health implications and recommended actions.';
        },
        (row) => {
          // Shorter treatment text since column is smaller
          const treatment = row.treatment_options || 'Multiple treatment options available. Consult with a certified water treatment professional.';
          return treatment.length > 60 ? treatment.substring(0, 60) + '...' : treatment;
        }
      ]
    },
    ao: {
      headers: ['PARAMETER', 'AESTHETIC CONSIDERATIONS', 'TREATMENT OPTIONS'],
      dataMapping: [
        'parameter_name',
        (row) => {
          // Use aesthetic_considerations first, fallback to description
          const aestheticConsiderations = row.aesthetic_considerations;
          const description = row.description || row.parameter_description;
          
          if (aestheticConsiderations && aestheticConsiderations.trim() !== '') {
            return aestheticConsiderations;
          } else if (description && description.trim() !== '') {
            return description;
          } else {
            return 'A water quality parameter that affects the aesthetic or operational characteristics of your water system.';
          }
        },
        (row) => {
          // Shorter treatment text since column is smaller
          const treatment = row.treatment_options || 'Multiple treatment options available. Consult with a certified water treatment professional.';
          return treatment.length > 60 ? treatment.substring(0, 60) + '...' : treatment;
        }
      ]
    }
  };

  const currentConfig = config[type];
  
  // Optimized column widths with more padding space
  const columnWidths = [95, 260, 110]; // Parameter: 95, Health Effect/Aesthetic Considerations: 260, Treatment: 110
  // Total: 465 points + padding = well within page limits

  return (
    <View>
      {/* Table Header */}
      <View style={styles.tableHeader} fixed>
        {currentConfig.headers.map((header, headerIndex) => (
          <View key={headerIndex} style={{ 
            width: columnWidths[headerIndex], 
            paddingRight: 6 // Increased padding between columns
          }}>
            <Text style={[styles.tableCellHeader, { textAlign: 'left' }]}>
              {header}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Continuous table body with smart breaks */}
      <View style={styles.tableContainer}>
        {data.map((row, rowIndex) => (
          <View 
            key={rowIndex} 
            style={[styles.tableRow, { 
              minHeight: 30, // Minimum height for readability
              paddingVertical: 5 // Increased vertical padding
            }]}
            minPresenceAhead={rowIndex < data.length - 1 ? 30 : 0} // Reserve space for next row
          >
            {currentConfig.dataMapping.map((mapFunc, cellIndex) => (
              <View key={cellIndex} style={{ 
                width: columnWidths[cellIndex], 
                paddingRight: 6, // Increased padding between columns
                alignItems: 'flex-start',
                justifyContent: 'flex-start'
              }}>
                <Text style={[
                  cellIndex === 0 ? styles.tableCellParameterName : styles.tableCell,
                  { 
                    fontSize: cellIndex === 0 ? 9 : 8, 
                    lineHeight: 1.4, // Better line height for readability
                    fontWeight: cellIndex === 0 ? 'bold' : 'normal',
                    textAlign: 'left'
                  }
                ]} wrap={true}>
                  {typeof mapFunc === 'function' ? mapFunc(row) : row[mapFunc]}
                </Text>
              </View>
            ))}
          </View>
        ))}
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
      <View style={styles.recommendationsSection} wrap={false}>
        <Text style={config.headerStyle}>
          {config.headerText}
        </Text>
        <Text style={styles.recommendationsText}>
          {config.bodyText}
        </Text>
      </View>
    );
};




// Summary Cards Component - Updated with test kit logic
const SummaryCards = ({ bacteriological, healthConcerns, aoConcerns, testKit }) => {
  // Check if any bacteriological parameters exceed limits using result_display_value
  const bacteriologicalExceeded = bacteriological.some(param => {
    // Check using result_display_value first, then fallback to other methods
    if (param.result_display_value?.includes('Detected')) {
      return true;
    }
    
    // Fallback to compliance status check
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
    
    // Determine if bacteriological card should be shown
    const showBacteriologicalCard = testKit === "Advanced Water Test Kit" || testKit === "City Water Test Kit";
  
    return (
        <View style={showBacteriologicalCard ? styles.summaryCardsContainer : styles.summaryCardsContainerTwoCards}>
        {/* Bacteriological Results Card - Only show for Advanced Water Test Kit */}
        {showBacteriologicalCard && (
          <View style={bacteriologicalExceeded ? styles.summaryCardRed : styles.summaryCardGreen}>
            {/* Title Section */}
            <View>
              <Text style={styles.summaryCardTitle}>Bacteriological Results</Text>
            </View>
            
            {/* Content Section - Status instead of number */}
            <View style={styles.summaryCardContent}>
              <Text style={bacteriologicalExceeded ? styles.summaryCardStatusRed : styles.summaryCardStatusGreen}>
                {bacteriologicalExceeded ? 'Coliforms Present' : 'No Coliforms Present'}
              </Text>
            </View>
            
            {/* Footer Section - Empty for consistency */}
            <View style={styles.summaryCardFooter}>
              <Text style={styles.summaryCardText}> </Text>
            </View>
          </View>
        )}
  
        {/* Health-Related Results Card - Always show */}
        <View style={healthConcernsCount > 0 ? styles.summaryCardRed : styles.summaryCardGreen}>
          {/* Title Section */}
          <View>
            <Text style={styles.summaryCardTitle}>Health-Related Results</Text>
          </View>
          
          {/* Content Section - Number */}
          <View style={styles.summaryCardContent}>
            <Text style={healthConcernsCount > 0 ? styles.summaryCardNumberRed : styles.summaryCardNumberGreen}>
              {healthConcernsCount}
            </Text>
          </View>
          
          {/* Footer Section */}
          <View style={styles.summaryCardFooter}>
            <Text style={healthConcernsCount > 0 ? styles.summaryCardTextRed : styles.summaryCardTextGreen}>
              concerns present
            </Text>
          </View>
        </View>
  
        {/* Aesthetic and Operational Results Card - Always show */}
        <View style={aoConcernsCount > 0 ? styles.summaryCardRed : styles.summaryCardGreen}>
          {/* Title Section */}
          <View>
            <Text style={styles.summaryCardTitle}>Aesthetic and Operational</Text>
          </View>
          
          {/* Content Section - Number */}
          <View style={styles.summaryCardContent}>
            <Text style={aoConcernsCount > 0 ? styles.summaryCardNumberRed : styles.summaryCardNumberGreen}>
              {aoConcernsCount}
            </Text>
          </View>
          
          {/* Footer Section */}
          <View style={styles.summaryCardFooter}>
            <Text style={aoConcernsCount > 0 ? styles.summaryCardTextRed : styles.summaryCardTextGreen}>
              concerns present
            </Text>
          </View>
        </View>
      </View>
    );
  };

// CWQI Component
const CWQIComponent = ({ cwqi, title }) => {
    if (!cwqi) return null;
  
    const getScoreColor = (rating) => {
      // Special handling for coliform detection
      if (rating === 'Poor - Coliform Present') return '#DC2626';
      
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
  
    // Override display for coliform detection
    const displayRating = cwqi.coliformDetected ? 'Poor' : cwqi.rating;
    const displayScore = cwqi.coliformDetected ? 0 : cwqi.score;
  
    return (
      <View style={styles.cwqiBox}>
        <Text style={styles.cwqiTitle}>{title}</Text>
        
        {/* Show "Current Score" title when coliform is detected with increased spacing */}
        {cwqi.coliformDetected && (
          <Text style={styles.cwqiTitleCurrent}>Current Score</Text>
        )}
        
        <Text style={[styles.cwqiScore, { color: getScoreColor(cwqi.rating) }]}>
          {displayScore}/100
        </Text>
        <Text style={[styles.cwqiRating, { color: getScoreColor(cwqi.rating) }]}>
          {displayRating}
        </Text>
        <View style={styles.cwqiBar}>
          <View style={[
            styles.cwqiBarFill, 
            { 
              backgroundColor: getScoreColor(cwqi.rating),
              width: getBarWidth(displayScore)
            }
          ]} />
        </View>
        <Text style={styles.cwqiSummary}>
          {cwqi.coliformDetected 
            ? 'Coliform bacteria detected'
            : `${cwqi.totalTests - cwqi.failedTests} of ${cwqi.totalTests} parameters passed`
          }
        </Text>
      </View>
    );
  };

// Clean PDFTable with continuous table approach (no chunking)
const PDFTable = ({ headers, data, keyMapping, showExceeded = false, tableType = 'default' }) => {
  
  const getColumnWidths = (tableType) => {
    if (tableType === 'results') {
      // Updated widths for new order: Parameter, Unit, Objective, Result, Status
      return [180, 35, 100, 70, 90];
    } else if (tableType === 'general') {
      return [180, 120, 80];
    } else if (tableType === 'general3col') {
      return [120, 80, 60];
    }
    return [100, 100, 100, 100, 100];
  };

  const columnWidths = getColumnWidths(tableType);
  
  const isParameterExceeded = (param) => {
    if (param.parameter_category === 'health') {
      return param.compliance_status === 'EXCEEDS_MAC';
    } else if (param.parameter_category === 'ao') {
      if (param.compliance_status === 'EXCEEDS_AO') {
        return true;
      }
      if (param.compliance_status === 'AO_RANGE_VALUE') {
        return param.overall_compliance_status === 'WARNING';
      }
      return false;
    } else {
      return param.compliance_status === 'FAIL';
    }
  };

  // Single continuous table for all table types
  return (
    <View>
      {/* Fixed header that repeats on each page */}
      <View style={styles.tableHeader} fixed>
        {headers.map((header, index) => (
          <View key={index} style={{ width: columnWidths[index], paddingRight: 6 }}>
            <Text 
              style={[styles.tableCellHeader, { textAlign: index === 0 ? 'left' : 'center' }]}
            >
              {header}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Continuous table body with natural page breaks */}
      <View style={styles.tableContainer}>
        {data.map((row, rowIndex) => {
          const isExceeded = showExceeded && isParameterExceeded(row);
          
          return (
            <View 
              key={rowIndex} 
              style={[
                isExceeded ? styles.tableRowExceeded : styles.tableRow,
                { 
                  minHeight: 25,
                  paddingVertical: 4
                }
              ]}
              minPresenceAhead={rowIndex < data.length - 1 ? 25 : 0}
            >
              {keyMapping.map((key, cellIndex) => (
                <View key={cellIndex} style={{ 
                  width: columnWidths[cellIndex], 
                  paddingRight: 6,
                  alignItems: cellIndex === 0 ? 'flex-start' : 'center',
                  justifyContent: 'center'
                }}>
                  <Text style={[
                    cellIndex === 0 ? styles.tableCellParameterName : styles.tableCell,
                    { 
                      textAlign: cellIndex === 0 ? 'left' : 'center',
                      fontWeight: cellIndex === 0 ? 'bold' : 'normal',
                      fontSize: 9,
                      lineHeight: 1.3
                    }
                  ]} wrap={true}>
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
    // Update the formatLabResult function to use result_display_value from the view
const formatLabResult = (param) => {
  // Use the pre-formatted display value from the database view
  if (param.result_display_value && param.result_display_value.trim() !== '') {
    return param.result_display_value.trim();
  }
  
  // Fallback to original logic if display value is not available
  if (param.result_value && param.result_value.trim() !== '') {
    return param.result_value.trim();
  }
  
  // Final fallback to numeric if both display and result values are not available
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
            <Text style={styles.headerTitle}>{customer_first}'s Water Quality Report</Text>
            <Text style={styles.headerSubtitle}>Order No {order_number}  - {test_kit_display}</Text>
          </View>
          <Image 
            src="/MWQ-logo-final.png" 
            style={styles.logoImage}
          />
        </View>
  
        {/* Sample Information */}
        <View style={styles.sampleInfoContainer}>
          {/* Left Table - Sample Details */}
          <View style={styles.sampleInfoTableLeft}>
            <View style={styles.tableRowSample}>
              <Text style={styles.tableCellSampleLabel}>Customer Name</Text>
              <Text style={styles.tableCellSampleValue}>{customer_name}</Text>
            </View>
            <View style={styles.tableRowSample}>
              <Text style={styles.tableCellSampleLabel}>Sample Description</Text>
              <Text style={styles.tableCellSampleValue}>{sample_description}</Text>
            </View>
            <View style={styles.tableRowSampleLast}>
              <Text style={styles.tableCellSampleLabel}>Test Kit</Text>
              <Text style={styles.tableCellSampleValue}>{test_kit_display}</Text>
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
        <Text style={styles.sectionTitle}>Summary of Results</Text>
  
        {/* Summary Cards */}
        <SummaryCards 
          bacteriological={bacteriological}
          healthConcerns={healthConcerns}
          aoConcerns={aoConcerns}
          testKit={TEST_KIT}
        />

        {/* Concerns Summary Text Box - Show when there are concerns but no coliform contamination */}
        {(healthConcerns.length > 0 || aoConcerns.length > 0) && 
        !bacteriological.some(param => 
          (param.parameter_name?.toLowerCase().includes('coliform') || 
            param.parameter_name?.toLowerCase().includes('escherichia') ||
            param.parameter_name?.toLowerCase().includes('e. coli') ||
            param.parameter_name?.toLowerCase().includes('e.coli')) &&
          (param.result_display_value?.includes('Detected') || 
            param.result_value?.includes('NDOGT') || 
            param.result_numeric?.toString().includes('NDOGT') ||
            param.compliance_status === 'EXCEEDS_MAC')
        ) && (
          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>
              Results Explanation
            </Text>
            <Text style={[styles.recommendationText, { fontWeight: 'bold' }]}>
              There are {healthConcerns.length > 0 && aoConcerns.length > 0 ? 'health-related and aesthetic' : 
                        healthConcerns.length > 0 ? 'health-related' : 'aesthetic'} concerns.
            </Text>
            {healthConcerns.length > 0 && (
              <Text style={[styles.recommendationText, { marginTop: 8 }]}>
                We strongly recommend consulting with a water treatment professional and retesting after any treatment is installed.
              </Text>
            )}
            {aoConcerns.length > 0 && (
              <Text style={[styles.recommendationText, { marginTop: 8 }]}>
                While not necessarily health concerns, these may affect taste, odor, or water system performance. Consider treatment options to improve water quality.
              </Text>
            )}
            <Text style={[styles.recommendationText, { marginTop: 8 }]}>
              Please refer to the Recommendations tables in the report for actions you can take to improve water quality.
            </Text>
          </View>
        )}
  
        {/* Bacteriological Results */}
          {bacteriological.length > 0 && (() => {
            // Check for coliform detection using result_display_value or compliance status
            const contaminatedParams = bacteriological.filter(param => 
              (param.parameter_name?.toLowerCase().includes('coliform') || 
              param.parameter_name?.toLowerCase().includes('escherichia') ||
              param.parameter_name?.toLowerCase().includes('e. coli') ||
              param.parameter_name?.toLowerCase().includes('e.coli')) &&
              (param.result_display_value?.includes('Detected') || 
              param.result_value?.includes('NDOGT') || 
              param.result_numeric?.toString().includes('NDOGT') ||
              param.compliance_status === 'EXCEEDS_MAC')
            );

            if (contaminatedParams.length > 0) {
              // Show contamination warning
              return (
                <View>
                  <View style={styles.alertBoxContamination}>
                    <View style={styles.alertIconContainer}>
                      <Text style={styles.alertIcon}>⚠</Text>
                    </View>
                    <View style={styles.alertContentContainer}>
                      <Text style={styles.alertTextBold}>
                        Bacteriological Results - Important Notice: Coliform Bacteria Detected
                      </Text>
                      <Text style={[styles.alertTextContamination, { marginTop: 6 }]}>
                        Coliform bacteria have been detected in your drinking water sample. While not necessarily harmful themselves, their presence indicates that disease-causing organisms may also be present. Immediate action is recommended.
                      </Text>
                      <Text style={[styles.alertTextBold, { marginTop: 8 }]}>
                        Disinfect Your Well System:
                      </Text>
                      <Text style={[styles.alertTextContamination, { marginTop: 4 }]}>
                        To reduce the risk of illness, you should disinfect your well and water system. This process is commonly referred to as "shock chlorination."
                      </Text>
                      <Text style={[styles.alertTextContamination, { marginTop: 6 }]}>
                        We strongly recommend that you:
                      </Text>
                      <Text style={[styles.alertTextContamination, { marginTop: 4, marginLeft: 10 }]}>
                        • <Text style={styles.alertTextBold}>Contact a licensed water well contractor</Text> to inspect and disinfect your well, <Text style={styles.alertTextBold}>or</Text>
                      </Text>
                      <Text style={[styles.alertTextContamination, { marginTop: 2, marginLeft: 10 }]}>
                        • <Text style={styles.alertTextBold}>Follow the well disinfection instructions</Text> provided by Health Canada: <Text style={styles.alertTextLink}>https://www.canada.ca/en/health-canada/services/environment/drinking-water/well/treat.html</Text>
                      </Text>
                      <Text style={[styles.alertTextContamination, { marginTop: 8 }]}>
                        After disinfection, it is important to <Text style={styles.alertTextBold}>re-test your water</Text> to confirm the effectiveness of treatment before resuming consumption.
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }
          })()}

        {/* Perfect Water Quality Message - Show when both CWQI scores = 100 */}
      {healthCWQI?.score === 100 && aoCWQI?.score === 100 && (
        <View style={styles.perfectWaterBox}>
          <Text style={styles.perfectWaterTitle}>
            Your water shows no concerns!
          </Text>
          <Text style={styles.perfectWaterText}>
            Congratulations! Your water quality results are excellent across all tested parameters. 
            This indicates that your water source is well-maintained and meets all health and aesthetic standards. 
            We appreciate your commitment to water quality testing and recommend continuing regular monitoring 
            to ensure ongoing excellence.
          </Text>
        </View>
      )}

      {/* Water First Banner */}
      <View style={styles.waterFirstBanner}>
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
        </View>

        {/* Footer */}
        {/* <Text style={styles.footer}>
          This report is generated based on laboratory analysis results. For questions about your water quality or treatment options, please consult with a qualified water treatment professional.
        </Text> */}
      </Page>

      {/* Page 3: About Your Water Quality Assessment */}
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
        
        {/* <Text style={styles.cwqiInfoText}>
          The concentration reported by the laboratory for each parameter is characterized by a colouring system:
        </Text>
        
        <Text style={styles.cwqiInfoList}>
          • Green: Concentration meets the standards/guidelines
        </Text>
        
        <Text style={styles.cwqiInfoList}>
          • Red: Concentration fails to meet the standards/guidelines
        </Text> */}
        
        {/* CWQI Rating Table */}
        <View style={styles.cwqiRatingTable} wrap={false}>
          <View style={styles.tableHeader}>
            <View style={{ width: 70, paddingRight: 4 }}> {/* Reduced width and padding */}
              <Text style={[styles.tableCellHeader, { textAlign: 'left', fontSize: 7 }]}>RATING</Text>
            </View>
            <View style={{ width: 70, paddingRight: 4 }}> {/* Reduced width and padding */}
              <Text style={[styles.tableCellHeader, { textAlign: 'center', fontSize: 7 }]}>CWQI SCORE</Text>
            </View>
            <View style={{ width: 280, paddingRight: 4 }}> {/* Reduced width and padding */}
              <Text style={[styles.tableCellHeader, { textAlign: 'left', fontSize: 7 }]}>WHAT DOES THE SCORE MEAN?</Text>
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
            <View key={index} style={[styles.tableRow, { paddingVertical: 3 }]} wrap={false}> {/* Reduced padding */}
              <View style={{ width: 70, paddingRight: 4 }}>
                <Text style={[styles.tableCell, { fontWeight: 'bold', textAlign: 'left', fontSize: 8 }]}>{item.rating}</Text>
              </View>
              <View style={{ width: 70, paddingRight: 4 }}>
                <Text style={[styles.tableCell, { textAlign: 'center', fontSize: 8 }]}>{item.score}</Text>
              </View>
              <View style={{ width: 280, paddingRight: 4 }}>
                <Text style={[styles.tableCell, { textAlign: 'left', fontSize: 8, lineHeight: 1.2 }]}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>
  
  
        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
      </Page>
  
        {/* Health Parameters Section - All in one */}
        <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.subsectionTitle}>Health Related Parameters</Text>
          <ParametersSection 
            cwqi={healthCWQI} 
            concerns={healthConcerns}
            type="health"
            title="Health Related Parameters"
          />
        </View>
  
        {/* AO Parameters Section - All in one */}
        <View break={true}>
          <Text style={styles.subsectionTitle}>Aesthetic and Operational Parameters</Text>
          <ParametersSection 
            cwqi={aoCWQI} 
            concerns={aoConcerns}
            type="ao"
            title="Aesthetic and Operational Parameters"
          />
        </View>
  
        {/* General Recommendations Section */}
        <View style={styles.recommendationsSection} break={true}>
          <Text style={styles.generalRecommendationsTitle}>
            General Recommendations
          </Text>
          <View style={styles.recommendationListBlack}>
            <Text style={styles.recommendationListBlack}>
              1. The water quality results presented in this Report Card should be carefully reviewed by a water treatment expert if treatment is necessary to improve the potability of the drinking water supply. A qualified professional can assess the results, recommend appropriate treatment solutions, and ensure that the water meets established drinking water standards or guidelines for safety and quality.
            </Text>
            <Text style={[styles.recommendationListBlack, { marginTop: 10 }]}>
              2. If you have any questions on your drinking water quality results, please schedule a meeting with our professional hydrogeologist.
            </Text>
          </View>
        </View>
      </Page>
  
      {/* Page 2: Full Results Tables */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Full Results</Text>
        
        {/* Health Parameters Table */}
      {healthParameters.length > 0 && (
        <View>
          <Text style={styles.subsectionTitle}>Health-Related Parameter Results </Text>
          <PDFTable
            headers={['Parameter', 'Unit', 'Recommended Maximum Concentration', 'Result', 'Status']}
            data={healthParameters}
            keyMapping={[
              'parameter_name',
              (row) => row.result_units || row.parameter_unit || 'N/A',
              (row) => {
                return row.mac_display_value || row.mac_display || 'No Standard';
              },
              (row) => formatLabResult(row),
              (row) => getComplianceStatus(row)
            ]}
            showExceeded={true}
            tableType="results"
            maxRowsPerPage={20} // Limit rows per page
          />
        </View>
      )}

      {/* AO Parameters Table */}
      {aoParameters.length > 0 && (
      <View break={true}>
        <Text style={styles.subsectionTitle}>Aesthetic & Operational Parameter Results</Text>
        <PDFTable
          headers={['Parameter', 'Unit', 'Recommended Maximum Concentration', 'Result', 'Status']}
          data={aoParameters}
          keyMapping={[
            'parameter_name',
            (row) => row.result_units || row.parameter_unit || 'N/A',
            (row) => {
              return row.ao_display_value || row.ao_display || 'No Standard';
            },
            (row) => formatLabResult(row),
            (row) => getComplianceStatus(row)
          ]}
          showExceeded={true}
          tableType="results"
          maxRowsPerPage={20} // Limit rows per page
        />
      </View>
      )}
      </Page>
  
        {/* General Parameters Table - Centered and Smaller */}
        <Page size="A4" style={styles.page}>
        {generalParameters && generalParameters.length > 0 && (
          <View break={generalParameters.length > 15}>
            <Text style={styles.subsectionTitle}>General Parameter Results</Text>
            <View style={styles.centeredTableContainer}>
              <PDFTable
                headers={['Parameter', 'Result', 'Unit']}
                data={generalParameters}
                keyMapping={[
                  'parameter_name',
                  (row) => formatLabResult(row),
                  (row) => row.result_units || row.parameter_unit || ''
                ]}
                showExceeded={false}
                tableType="general3col"
              />
            </View>
          </View>
        )}
  
        <Text style={styles.pageNumber} render={({ pageNumber }) => `Page ${pageNumber}`} fixed />
      </Page>
  
    
    </Document>
  );
};

export default WaterQualityReportPDF;