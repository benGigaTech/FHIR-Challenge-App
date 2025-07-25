# Troubleshooting and Testing Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Common Issues and Solutions](#common-issues-and-solutions)
3. [Testing Procedures](#testing-procedures)
4. [Error Messages Reference](#error-messages-reference)
5. [Debugging Tools](#debugging-tools)
6. [Environment-Specific Issues](#environment-specific-issues)
7. [Performance Optimization](#performance-optimization)
8. [Security Considerations](#security-considerations)
9. [Reporting Bugs](#reporting-bugs)

## Introduction

This document provides comprehensive guidance for troubleshooting common issues and testing the SMART on FHIR Allergy Display Application. It is intended for developers, testers, and technical support personnel who need to diagnose and resolve problems with the application.

## Common Issues and Solutions

### Authentication Problems

#### Issue: OAuth 2.0 Authorization Failures
- **Symptoms**: "Authentication Error" message, unable to access patient data
- **Possible Causes**:
  - Invalid client ID or secret
  - Expired tokens
  - Incorrect redirect URI
  - CORS issues
- **Solutions**:
  - Verify client registration in the FHIR server
  - Check token expiration and refresh logic
  - Ensure redirect URIs match exactly
  - Verify CORS headers are properly configured

#### Issue: Session Timeout
- **Symptoms**: Application works initially but then loses authentication
- **Possible Causes**:
  - Token expiration without refresh
  - Browser session storage cleared
- **Solutions**:
  - Implement token refresh mechanism
  - Check session storage handling
  - Add session timeout warnings

### FHIR API Connection Issues

#### Issue: Unable to Connect to FHIR Server
- **Symptoms**: "FHIR Server Error" message, no data loading
- **Possible Causes**:
  - Network connectivity problems
  - FHIR server downtime
  - Incorrect endpoint URLs
- **Solutions**:
  - Check network connectivity
  - Verify FHIR server status
  - Confirm endpoint URLs in configuration
  - Implement retry logic with exponential backoff

#### Issue: Slow Data Retrieval
- **Symptoms**: Long loading times, timeout errors
- **Possible Causes**:
  - Large data sets
  - Network latency
  - Inefficient queries
- **Solutions**:
  - Implement pagination
  - Add loading indicators
  - Optimize FHIR search parameters
  - Cache frequently accessed data

### Data Display Issues

#### Issue: Missing or Incomplete Allergy Data
- **Symptoms**: Some allergies not showing, incomplete information
- **Possible Causes**:
  - Incomplete FHIR resources
  - Unsupported FHIR extensions
  - Data mapping errors
- **Solutions**:
  - Add validation for required fields
  - Implement fallback display logic
  - Log and report malformed resources

#### Issue: Missing or Incomplete Medication Request Data
- **Symptoms**: Medication requests not showing or missing details (medication name, dosage, status)
- **Possible Causes**:
  - Incomplete MedicationRequest resources
  - Missing medication references
  - Complex dosage instructions not parsed correctly
- **Solutions**:
  - Implement robust medication reference resolution
  - Add fallback display for complex dosage instructions
  - Handle both contained and referenced medications

#### Issue: Formatting Problems
- **Symptoms**: Data displayed incorrectly, misaligned elements
- **Possible Causes**:
  - CSS conflicts
  - Responsive design issues
  - Long text overflow
- **Solutions**:
  - Review CSS specificity
  - Test on multiple screen sizes
  - Implement text truncation with tooltips

## Testing Procedures

### Automated Testing

#### Unit Tests
- **Purpose**: Test individual functions and components
- **Tools**: Jest, Mocha
- **Key Areas**:
  - FHIR resource parsing
  - Authentication logic
  - Error handling
  - Data formatting

**Running Unit Tests**:
```bash
npm test
```

#### Integration Tests
- **Purpose**: Test interactions between components
- **Tools**: Playwright, Cypress
- **Key Areas**:
  - API integration
  - Authentication flow
  - Data rendering

**Running Integration Tests**:
```bash
npm run test:integration
```

#### End-to-End Tests
- **Purpose**: Test complete user workflows
- **Tools**: Playwright
- **Key Areas**:
  - Launch sequence
  - Authentication
  - Allergy display
  - Error handling

**Running E2E Tests**:
```bash
npm run test:e2e
```

### Manual Testing Checklist

#### Launch and Authentication
- [ ] Application launches from EHR context
- [ ] OAuth 2.0 flow completes successfully
- [ ] Patient context is correctly retrieved
- [ ] Session persistence works as expected

#### Data Retrieval and Display
- [ ] All patient allergies are displayed
- [ ] Allergy details are complete and accurate
- [ ] "No allergies" message appears when appropriate
- [ ] All patient medication requests are displayed
- [ ] Medication request details (medication name, status, dosage) are complete and accurate
- [ ] Status indicators are correctly colored based on medication status
- [ ] "No medication requests" message appears when appropriate
- [ ] Error states are handled gracefully

#### Browser Compatibility
- [ ] Application works in Chrome
- [ ] Application works in Firefox
- [ ] Application works in Safari
- [ ] Application works in Edge
- [ ] Application is responsive on different screen sizes

#### Performance
- [ ] Initial load time is acceptable (<3 seconds)
- [ ] UI remains responsive during data loading
- [ ] Memory usage remains stable during extended use

## Error Messages Reference

### Authentication Errors

| Error Code | Message | Cause | Resolution |
|------------|---------|-------|------------|
| AUTH-001 | "Authentication failed" | Invalid credentials | Verify client ID and secret |
| AUTH-002 | "Session expired" | Token timeout | Re-authenticate |
| AUTH-003 | "Invalid scope" | Missing required scopes | Update registration with proper scopes |

### FHIR API Errors

| Error Code | Message | Cause | Resolution |
|------------|---------|-------|------------|
| FHIR-001 | "Unable to connect to FHIR server" | Network/server issue | Check connectivity and server status |
| FHIR-002 | "Resource not found" | Invalid resource ID | Verify resource exists |
| FHIR-003 | "Search failed" | Invalid search parameters | Check search parameter syntax |

### Application Errors

| Error Code | Message | Cause | Resolution |
|------------|---------|-------|------------|
| APP-001 | "No patient context" | Missing launch context | Ensure proper launch sequence |
| APP-002 | "Failed to render allergies" | Data processing error | Check browser console for details |
| APP-003 | "Failed to render medication requests" | Data processing error | Check browser console for details |
| APP-004 | "Medication reference resolution failed" | Unable to resolve medication references | Verify medication references exist and are accessible |
| APP-005 | "Browser not supported" | Incompatible browser | Use supported browser version |

## Debugging Tools

### Browser Developer Tools

#### Console Logging
The application uses structured logging with different levels:
- `console.error()` - Critical errors requiring immediate attention
- `console.warn()` - Potential issues that don't block functionality
- `console.info()` - Important application state changes
- `console.debug()` - Detailed debugging information (only in development mode)

#### Network Monitoring
Use the Network tab to:
- Monitor FHIR API requests
- Check request/response headers
- Verify authentication tokens
- Measure response times

### Application Debugging Features

#### Debug Mode
Enable debug mode by adding `?debug=true` to the URL. This will:
- Show detailed logging in the console
- Display additional debugging information in the UI
- Enable performance metrics

#### Test Harness
A test harness is available for development and testing:
```
/test-harness.html
```

This provides:
- Mock patient data
- Simulated error conditions
- Authentication bypass for testing
- Performance testing tools

## Environment-Specific Issues

### Development Environment

#### Local FHIR Server Setup
- Use [HAPI FHIR](https://hapifhir.io/) for local development
- Configure CORS to allow localhost connections
- Seed test data using the provided scripts:
```bash
npm run seed-test-data
```

#### Common Development Issues
- CORS errors when connecting to FHIR servers
- Missing dependencies after fresh clone
- OAuth redirect issues with localhost

### Testing Environment

#### Test Data Requirements
- Test patients must have various allergy configurations:
  - Multiple allergies of different types
  - No allergies
  - Critical allergies
  - Resolved allergies

#### Sandbox Configuration
- Configure the application to use a FHIR sandbox:
```json
{
  "fhirServer": "https://launch.smarthealthit.org/v/r4/fhir",
  "clientId": "test_client_id"
}
```

### Production Environment

#### Deployment Checklist
- [ ] Verify SSL/TLS configuration
- [ ] Confirm proper client registration with production FHIR server
- [ ] Test with actual EHR integration
- [ ] Validate performance with production-level data volumes

#### Monitoring
- Set up logging and error tracking
- Configure alerts for critical errors
- Monitor performance metrics

## Performance Optimization

### Loading Performance

#### Strategies for Faster Initial Load
- Minimize JavaScript bundle size
- Implement code splitting
- Use pagination for large allergy lists
- Cache patient context when appropriate

#### Measuring Performance
Use the built-in performance monitoring:
```javascript
// In browser console
app.performance.getMetrics();
```

### Memory Management

#### Preventing Memory Leaks
- Clear event listeners when components are destroyed
- Avoid circular references in data structures
- Use weak references for caching

#### Memory Profiling
Use Chrome DevTools Memory tab to:
- Take heap snapshots
- Compare memory usage over time
- Identify memory leaks

## Security Considerations

### Data Protection

#### Secure Storage
- Never store PHI in localStorage
- Use sessionStorage with appropriate timeout
- Clear sensitive data when session ends

#### Transmission Security
- Verify all API calls use HTTPS
- Validate server certificates
- Implement proper CORS policies

### Vulnerability Testing

#### Security Testing Checklist
- [ ] Verify proper OAuth 2.0 implementation
- [ ] Check for XSS vulnerabilities
- [ ] Test CORS configuration
- [ ] Validate input sanitization
- [ ] Verify no sensitive data in logs

## Reporting Bugs

### Bug Report Template

When reporting bugs, include:

1. **Environment Information**:
   - Browser name and version
   - Operating system
   - Application version
   - FHIR server being used

2. **Steps to Reproduce**:
   - Detailed, sequential steps
   - Test patient information (de-identified)
   - Expected vs. actual behavior

3. **Evidence**:
   - Screenshots
   - Console logs
   - Network request/response data

### Submitting Reports

Submit bug reports through:
- GitHub Issues: [Repository Issues](https://github.com/example/smart-fhir-app/issues)
- Email: support@example.com
- Internal ticketing system (for organization users)

---

*This documentation was last updated on July 25, 2025.*
