# Contributing to the SMART on FHIR Allergy Display Application

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing to the SMART on FHIR Allergy Display Application.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [FHIR-Specific Considerations](#fhir-specific-considerations)
- [Security Best Practices](#security-best-practices)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please be respectful, inclusive, and considerate in all interactions related to this project.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies with `npm install`
4. Create a new branch for your feature or bugfix
5. Make your changes
6. Test your changes thoroughly
7. Submit a pull request

## Development Environment

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Basic knowledge of FHIR and SMART on FHIR concepts

### Local Development

1. Start the development server:
   ```bash
   npm run serve
   ```

2. Access the application at http://127.0.0.1:8080/

3. For SMART on FHIR testing, use the launch URL:
   ```
   http://127.0.0.1:8080/launch.html?launch=eyJhIjoiMSJ9&iss=https%3A%2F%2Flaunch.smarthealthit.org%2Fv%2Fr4%2Ffhir
   ```

## Coding Standards

This project follows these coding standards:

### JavaScript

- Use ES6+ features where appropriate
- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use meaningful variable and function names
- Add JSDoc comments for all functions and complex code blocks
- Avoid global variables
- Use modules for code organization

### HTML/CSS

- Follow semantic HTML5 practices
- Use CSS classes for styling, not inline styles
- Ensure responsive design principles are followed
- Maintain accessibility standards (WCAG 2.1)

### File Structure

- Keep related files together
- Use descriptive file names
- Organize code logically within the existing structure

## Pull Request Process

1. Ensure your code adheres to the coding standards
2. Update documentation as necessary
3. Include tests for new functionality
4. Ensure all tests pass
5. Update the README.md with details of changes if applicable
6. The pull request will be merged once it has been reviewed and approved

## Testing Guidelines

### Types of Tests

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test interactions between components
- **End-to-End Tests**: Test complete workflows

### Testing Standards

- Write tests for all new functionality
- Ensure existing tests pass
- Test across multiple browsers
- Include edge cases and error scenarios
- Document test procedures

## Documentation

Good documentation is essential for this project. Please follow these guidelines:

- Use JSDoc comments for all functions
- Keep the README.md up to date
- Document any non-obvious code
- Include examples where helpful
- Update documentation when changing functionality

## FHIR-Specific Considerations

When working with FHIR resources:

- Follow the [FHIR R4](https://hl7.org/fhir/R4/) specification
- Use proper resource validation
- Handle FHIR-specific error cases
- Test with realistic FHIR data
- Consider SMART on FHIR security implications

### FHIR Resource Handling

- Use proper typing for FHIR resources
- Handle missing or optional fields gracefully
- Follow FHIR search parameter conventions
- Respect resource references and containment

## Security Best Practices

Security is critical for healthcare applications:

- Never store authentication tokens in localStorage (use sessionStorage)
- Implement proper CORS handling
- Validate all user inputs
- Handle PHI (Protected Health Information) according to regulations
- Follow OAuth2 best practices
- Use HTTPS for all communications
- Implement proper error handling that doesn't expose sensitive information

## Versioning

This project uses [SemVer](http://semver.org/) for versioning:

- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible functionality additions
- PATCH version for backwards-compatible bug fixes

## Additional Resources

- [FHIR Documentation](https://hl7.org/fhir/)
- [SMART on FHIR Documentation](http://docs.smarthealthit.org/)
- [SMART App Launch Framework](http://hl7.org/fhir/smart-app-launch/)
