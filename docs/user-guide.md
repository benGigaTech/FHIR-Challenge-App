# SMART on FHIR Allergy Display Application - User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Application Interface](#application-interface)
4. [Using the Application](#using-the-application)
5. [Understanding Allergy Information](#understanding-allergy-information)
6. [Troubleshooting](#troubleshooting)
7. [Additional Resources](#additional-resources)

## Introduction

The SMART on FHIR Allergy Display Application is a healthcare application designed to display patient allergy information from Electronic Health Record (EHR) systems. This application uses the SMART on FHIR framework to securely access patient data through standardized APIs.

### Purpose

This application allows healthcare providers to:
- Quickly view a patient's allergies and intolerances
- See detailed information about each allergy
- Access this information securely within their EHR workflow

### Key Features

- Secure authentication through SMART on FHIR
- Display of patient allergies in a clear, organized format
- Detailed view of allergy information
- Support for multiple browsers and devices
- Error handling for missing or incomplete data

## Getting Started

### Prerequisites

To use this application, you need:
- Access to a SMART on FHIR-enabled EHR system
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Appropriate access permissions for patient data

### Launching the Application

The application is designed to be launched from within your EHR system:

1. Navigate to the patient's record in your EHR
2. Look for the "Apps" or "SMART Apps" section
3. Select "Allergy Display Application" from the available apps
4. The application will launch in a new window or embedded frame

### Authentication

When the application launches:
1. You may be prompted to log in if you're not already authenticated
2. You'll need to authorize the application to access patient data
3. The authorization process follows OAuth 2.0 standards for security

## Application Interface

The application interface consists of several key areas:

### Header Section
- Displays the application name
- Shows the current patient's name and basic information
- Contains navigation controls (if applicable)

### Main Content Area
- Lists all allergies for the current patient
- Shows a "No allergies found" message if the patient has no recorded allergies
- Displays error messages if there are connectivity or data issues

### Allergy List
- Each allergy is displayed as a card or list item
- Critical or high-severity allergies may be highlighted
- Basic information is shown for each allergy

### Allergy Detail View
- Click on an allergy to see more detailed information
- Shows reaction details, severity, onset date, and other clinical information
- May include additional notes or comments

## Using the Application

### Viewing Patient Allergies

1. After the application loads, you'll see the patient's name and basic information
2. The main section will display a list of the patient's allergies
3. Each allergy entry shows:
   - Allergen name
   - Reaction type
   - Severity (if available)
   - Status (active, inactive, etc.)

### Exploring Allergy Details

To view more information about a specific allergy:
1. Click on the allergy entry in the list
2. A detailed view will expand or open
3. This view includes:
   - Full allergen information
   - Detailed reaction descriptions
   - Onset date
   - Recorder information
   - Clinical notes (if available)

### Filtering and Sorting

If the patient has many allergies, you may be able to:
1. Sort allergies by severity, date, or alphabetically
2. Filter allergies by type (medication, food, environmental)
3. Search for specific allergens

## Understanding Allergy Information

### Allergy Types

The application displays different types of allergies:
- **Medication allergies**: Reactions to pharmaceutical products
- **Food allergies**: Reactions to food items
- **Environmental allergies**: Reactions to substances in the environment
- **Biologic allergies**: Reactions to biological materials

### Severity Levels

Allergies may be classified by severity:
- **Mild**: Minimal systemic effects
- **Moderate**: Marked symptoms but not life-threatening
- **Severe**: Potentially life-threatening
- **Critical**: Immediately life-threatening

### Status Indicators

Allergies have status indicators:
- **Active**: Current allergies that require attention
- **Inactive**: Historical allergies that may no longer be relevant
- **Resolved**: Allergies that have been resolved
- **Refuted**: Allergies that were incorrectly recorded and refuted

## Troubleshooting

### Common Issues

#### Application Doesn't Load
- Check your internet connection
- Ensure you have proper access permissions
- Try refreshing the page
- Clear your browser cache

#### No Patient Data Appears
- Verify you've selected a patient in the EHR
- Check if the patient has any recorded allergies
- Ensure your authentication hasn't expired

#### Browser Compatibility Issues
- Update your browser to the latest version
- Try a different supported browser
- Disable browser extensions that might interfere

### Error Messages

The application may display these error messages:

- **Authentication Error**: You need to re-authenticate to access patient data
- **No Patient Context**: The application couldn't determine which patient to display
- **FHIR Server Error**: The EHR's FHIR server is experiencing issues
- **No Allergies Found**: The patient has no recorded allergies
- **Network Error**: There's an issue with your internet connection

### Related Documentation

- [FHIR AllergyIntolerance Resource](https://www.hl7.org/fhir/allergyintolerance.html)
- [SMART on FHIR Documentation](https://docs.smarthealthit.org/)
- [Application Technical Documentation](./technical-guide.md)

### Training Resources

- Online tutorials available at: [training.example.com](https://training.example.com)
- Monthly webinars for new users
- In-app help system (click the "?" icon)

---

*This user guide was last updated on July 25, 2025.*
