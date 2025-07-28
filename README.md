# GigaTECH SMART on FHIR Allergy Display Application

## Overview

This browser-based JavaScript application integrates with Electronic Health Record (EHR) systems using the SMART on FHIR framework to display patient allergy information. The application follows the SMART EHR launch sequence to retrieve and display allergies for the current patient being viewed in the EHR.

## Features

- **SMART on FHIR Integration**: Seamlessly integrates with EHR systems using the SMART launch sequence
- **Patient Context**: Automatically retrieves the current patient from the EHR context
- **Allergy Display**: Shows allergy information for the selected patient in JSON format
- **Error Handling**: Displays appropriate messages when no allergies are found
- **Cross-Browser Support**: Works across modern browsers with compatibility detection

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/benGigaTech/FHIR-Challenge-App.git
   cd FHIR-Challenge-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run serve
   ```

### Testing

The application will be available at http://127.0.0.1:8080/

To test with the SMART on FHIR sandbox, use the following launch URL:
```
http://127.0.0.1:8080/launch.html?launch=eyJhIjoiMSJ9&iss=https%3A%2F%2Flaunch.smarthealthit.org%2Fv%2Fr4%2Ffhir
```

## Usage Guide

1. Access the launch URL from within an EHR or using the test URL above
2. The application will handle the SMART launch sequence automatically
3. Authenticate with your EHR credentials when prompted (for the sandbox, you can use any provider)
   - Dr. Albertine Orn is a good default provider to log in with
4. The application will display the patient's allergy information in JSON format
   - Ms. Mariana Acuna has at least one allergy in the test system

For more detailed usage instructions, see the [User Guide](docs/user-guide.md).

## Technical Details

- **FHIR Version**: R4
- **Authentication**: SMART on FHIR OAuth2
- **Data Retrieval**: AllergyIntolerance resources
- **Server**: The application communicates with a FHIR R4 server (e.g., https://r4.smarthealthit.org)

### Project Structure

```
src/
├── index.html          # Main application page
├── launch.html         # SMART launch entry point
├── js/
│   ├── app.js          # Main application logic
│   ├── api.js          # FHIR API interactions
│   ├── auth.js         # Authentication handling
│   ├── error-handler.js # Error handling utilities
│   └── browser-compatibility.js # Browser compatibility checks
└── css/
    └── styles.css      # Application styling
```

## Browser Compatibility

The application is tested and compatible with:
- Google Chrome (latest)
- Mozilla Firefox (latest)
- Microsoft Edge (latest)
- Safari (latest)

For detailed browser compatibility information, see the [Browser Compatibility Documentation](docs/browser-compatibility.md).

## Known Limitations

- Displays raw JSON data rather than a formatted human-readable view
- Limited error recovery for certain edge cases
- No offline mode support

## Troubleshooting

For common issues and their solutions, see the [Troubleshooting Guide](docs/troubleshooting.md).

## Development

For information on contributing to this project, see the [Contributing Guide](CONTRIBUTING.md).

## Testing

For testing procedures and guidelines, see the [Testing Documentation](docs/testing.md).

## License

This project is [MIT Licensed](LICENSE).

## References

- [FHIR Specification](https://hl7.org/fhir)
- [FHIR AllergyIntolerance](https://www.hl7.org/fhir/allergyintolerance.html)
- [SMART Technical Reference](http://docs.smarthealthit.org/)
- [SMART Tutorial for browser apps](http://docs.smarthealthit.org/tutorials/javascript/)
