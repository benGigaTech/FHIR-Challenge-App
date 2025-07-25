# GigaTECH SMART on FHIR Allergy Display Application - Development Plan

## Project Overview

This project involves developing a browser-based JavaScript application that integrates with Electronic Health Record (EHR) systems using the SMART on FHIR framework. The application will display patient allergy information by leveraging the FHIR R4 specification and SMART launch sequence.

### Key Technologies
- **SMART on FHIR**: Framework for EHR integration and app launching
- **FHIR R4**: Healthcare data exchange standard
- **JavaScript**: Vanilla JavaScript for client-side functionality
- **Node.js/npm**: Package management and development server
- **http-server**: Static file serving with CORS support

## Requirements Analysis

### Functional Requirements
1. **EHR Launch Integration**: Implement SMART EHR launch sequence
2. **Patient Context**: Retrieve current patient from EHR launch context
3. **Allergy Data Retrieval**: Query FHIR server for AllergyIntolerance resources
4. **Data Display**: Show allergy information in JSON format
5. **Error Handling**: Display appropriate message when no allergies found
6. **Provider Flexibility**: Support login with any available provider
7. **Patient Flexibility**: Work with any patient in the system

### Technical Requirements
- **Host/Port**: Must run on http://127.0.0.1:8080/
- **Launch Command**: `npm run serve`
- **FHIR Server**: Communicate with R4-compatible server (e.g., https://r4.smarthealthit.org)
- **Launch URL**: Support testing via provided SMART launch link
- **Browser Compatibility**: Standard web browser support

### Test Cases
- **Default Provider**: Dr. Albertine Orn
- **Test Patient**: Ms. Mariana Acuna (has at least one allergy)
- **Launch URL**: `http://127.0.0.1:8080/launch.html?launch=eyJhIjoiMSJ9&iss=https%3A%2F%2Flaunch.smarthealthit.org%2Fv%2Fr4%2Ffhir`

## Development Phases

### Phase 1: Project Setup and Infrastructure
**Estimated Time**: 15-20 minutes

#### Tasks:
1. **Initialize npm project**
   - Create `package.json` with proper configuration
   - Set up npm scripts for serving the application
   - Configure http-server with CORS support

2. **Create basic file structure**
   ```
   src/
   ├── index.html          # Main application page
   ├── launch.html         # SMART launch entry point
   ├── js/
   │   ├── app.js         # Main application logic
   │   ├── smart.js       # SMART on FHIR integration
   │   └── fhir.js        # FHIR API interactions
   └── css/
       └── styles.css     # Basic styling
   ```

3. **Install dependencies**
   - `http-server` for static file serving
   - Consider SMART on FHIR client library or implement manually

#### Deliverables:
- Working development server
- Basic HTML structure
- Package.json with correct serve script

### Phase 2: SMART on FHIR Integration
**Estimated Time**: 20-25 minutes

#### Tasks:
1. **Implement SMART launch flow**
   - Create launch.html as entry point
   - Handle authorization parameters
   - Implement OAuth2 authorization code flow
   - Store access tokens securely

2. **Patient context retrieval**
   - Extract patient ID from launch context
   - Validate FHIR server connection
   - Handle authentication errors

3. **FHIR client setup**
   - Configure FHIR R4 client
   - Set up proper headers and authentication
   - Implement error handling for API calls

#### Key Implementation Details:
- **Launch Parameters**: Parse `launch` and `iss` parameters
- **Authorization**: Handle OAuth2 flow with FHIR server
- **Context**: Extract patient context from successful authorization
- **Security**: Proper token handling and validation

#### Deliverables:
- Functional SMART launch sequence
- Authenticated FHIR client
- Patient context availability

### Phase 3: Allergy Data Retrieval and Display
**Estimated Time**: 15-20 minutes

#### Tasks:
1. **FHIR AllergyIntolerance query**
   - Implement search for patient-specific allergies
   - Handle FHIR search parameters correctly
   - Process FHIR Bundle responses

2. **Data processing and display**
   - Parse AllergyIntolerance resources
   - Format JSON for display
   - Implement responsive display logic

3. **Error handling**
   - Detect when no allergies are found
   - Display appropriate user messages
   - Handle FHIR server errors gracefully

#### FHIR Query Details:
```javascript
// Example AllergyIntolerance search
GET [base]/AllergyIntolerance?patient=[patient-id]
```

#### Deliverables:
- Working allergy data retrieval
- JSON display functionality
- Proper error messaging

### Phase 4: Testing and Validation
**Estimated Time**: 10-15 minutes

#### Tasks:
1. **End-to-end testing**
   - Test complete launch sequence
   - Verify allergy display for test patient
   - Validate error handling for patients without allergies

2. **Provider and patient flexibility testing**
   - Test with different providers
   - Test with various patients
   - Ensure robust patient context handling

3. **Cross-browser compatibility**
   - Test in major browsers
   - Verify CORS handling
   - Check responsive behavior

#### Test Scenarios:
- **Happy Path**: Launch → Auth → Display allergies for Ms. Mariana Acuna
- **No Allergies**: Test with patient having no allergy records
- **Error Cases**: Network failures, invalid tokens, server errors
- **Provider Variation**: Login with different available providers

#### Deliverables:
- Verified functionality across test cases
- Documented any limitations or issues
- Ready-to-submit application

## Technical Implementation Details

### SMART on FHIR Flow
1. **Launch**: EHR redirects to `launch.html` with parameters
2. **Authorization**: App redirects to FHIR server's authorization endpoint
3. **Callback**: Server redirects back with authorization code
4. **Token Exchange**: Exchange code for access token
5. **Context**: Retrieve patient context and proceed with FHIR calls

### FHIR AllergyIntolerance Resource
Key elements to display:
- `patient`: Reference to patient
- `substance`: What the patient is allergic to
- `reaction`: Reaction details
- `criticality`: Severity level
- `clinicalStatus`: Active, inactive, resolved

### Error Handling Strategy
- **Network Errors**: Display connection issues
- **Authentication Errors**: Guide user to re-launch
- **No Data**: Clear message about no allergies found
- **FHIR Errors**: Parse and display meaningful error messages

## Optional Enhancements

### Priority 1 (if time permits):
1. **Improved UI/UX**
   - Parse JSON into human-readable format
   - Add basic styling and layout
   - Implement responsive design

2. **Enhanced Error Handling**
   - More detailed error messages
   - Retry mechanisms
   - Better user guidance

### Priority 2 (extended development):
1. **Unit Testing**
   - Jest or similar testing framework
   - Test FHIR client functions
   - Mock SMART launch flow

2. **Advanced Features**
   - Allergy severity indicators
   - Search and filter capabilities
   - Export functionality

## Submission Checklist

### Code Quality:
- [ ] Clean, readable JavaScript code
- [ ] Proper error handling
- [ ] Comments for complex logic
- [ ] Consistent code style

### Functionality:
- [ ] Runs on http://127.0.0.1:8080/
- [ ] Launches via `npm run serve`
- [ ] Works with provided test URL
- [ ] Displays allergies in JSON format
- [ ] Shows error when no allergies found
- [ ] Supports any provider/patient

### Documentation:
- [ ] README with setup instructions
- [ ] Code comments explaining SMART/FHIR integration
- [ ] Any additional notes about implementation choices

### Repository:
- [ ] Clean Git history
- [ ] Proper .gitignore file
- [ ] All necessary files included
- [ ] No sensitive information committed

## Risk Mitigation

### Potential Challenges:
1. **SMART Launch Complexity**: SMART flow can be tricky to implement correctly
   - *Mitigation*: Follow official SMART tutorial closely, use browser dev tools for debugging

2. **FHIR Server Variations**: Different servers may have slight variations
   - *Mitigation*: Test with specified server, implement robust error handling

3. **CORS Issues**: Browser security may block cross-origin requests
   - *Mitigation*: Use http-server with CORS enabled, understand FHIR server CORS policies

4. **Authentication Token Handling**: OAuth2 flow complexity
   - *Mitigation*: Use established patterns, handle token expiration gracefully

### Contingency Plans:
- If SMART integration proves too complex, focus on core FHIR functionality first
- If time runs short, prioritize minimum requirements over enhancements
- Keep implementation simple and functional rather than over-engineered

## Success Criteria

### Minimum Viable Product:
- Application launches successfully via provided URL
- Authenticates with FHIR server
- Retrieves and displays patient allergies
- Handles no-allergy cases appropriately
- Meets all specified technical requirements

### Ideal Outcome:
- Robust error handling and user experience
- Clean, maintainable code
- Additional enhancements that demonstrate technical capability
- Comprehensive documentation

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Setup | 15-20 min | Project structure, npm configuration |
| SMART Integration | 20-25 min | Authentication flow, patient context |
| Data Retrieval | 15-20 min | Allergy display, error handling |
| Testing | 10-15 min | Validation, cross-browser testing |
| **Total** | **60-80 min** | **Complete working application** |

This plan provides a structured approach to developing the SMART on FHIR allergy display application while ensuring all requirements are met within the suggested timeframe.
