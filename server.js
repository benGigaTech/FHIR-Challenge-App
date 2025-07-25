/**
 * Custom server script for SMART on FHIR application
 * Displays both index and launch URLs when starting the server
 * Includes hardcoded FHIR server URL and launch context from PRD
 */

const http = require('http-server');
const chalk = require('chalk');
const path = require('path');
const os = require('os');

// Configuration
const PORT = 8080;
const DIRECTORY = './src';
const CORS = true;

// Hardcoded FHIR server URL and launch context from PRD
const FHIR_SERVER_URL = 'https://r4.smarthealthit.org';
const LAUNCH_CONTEXT = 'eyJhIjoiMSJ9';
const ISSUER_URL = 'https://launch.smarthealthit.org/v/r4/fhir';

// Full launch URL with parameters
const FULL_LAUNCH_URL = `launch.html?launch=${LAUNCH_CONTEXT}&iss=${encodeURIComponent(ISSUER_URL)}`;

// Get local IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  Object.keys(interfaces).forEach((interfaceName) => {
    interfaces[interfaceName].forEach((iface) => {
      // Skip over internal and non-ipv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    });
  });

  return addresses;
}

// Start the server
const server = http.createServer({
  root: path.resolve(DIRECTORY),
  cors: CORS,
  cache: -1,
  showDir: true,
  autoIndex: true,
  // Ensure localhost is properly recognized for secure context
  host: 'localhost'
});

server.listen(PORT, () => {
  const localIps = getLocalIpAddresses();
  const localhost = '127.0.0.1';
  
  console.log(chalk.green('\n✓ Server started successfully!\n'));
  console.log(chalk.cyan('Available URLs:'));
  console.log(chalk.yellow('\nIMPORTANT: Use the localhost URLs for proper SMART on FHIR authorization (secure context required)'));
  
  // Display localhost URLs
  console.log(chalk.bold('\nLocalhost (USE THESE URLS):'));
  console.log(`  Index URL: ${chalk.blue(`http://localhost:${PORT}/index.html`)}`);
  console.log(`  Basic Launch URL: ${chalk.blue(`http://localhost:${PORT}/launch.html`)}`);
  console.log(`  Full Launch URL: ${chalk.blue(`http://localhost:${PORT}/${FULL_LAUNCH_URL}`)}`);
  
  // Display network URLs if available
  if (localIps.length > 0) {
    console.log(chalk.bold('\nNetwork (NOT RECOMMENDED - secure context issues):'));
    console.log(chalk.yellow('  Network URLs may not work with SMART on FHIR due to secure context requirements'));
    localIps.forEach(ip => {
      console.log(`  Index URL: ${chalk.gray(`http://${ip}:${PORT}/index.html`)}`);
      console.log(`  Basic Launch URL: ${chalk.gray(`http://${ip}:${PORT}/launch.html`)}`);
      console.log(`  Full Launch URL: ${chalk.gray(`http://${ip}:${PORT}/${FULL_LAUNCH_URL}`)}`);
    });
  }
  
  console.log(chalk.bold('\nSMART on FHIR Testing:'));
  console.log(`  Using FHIR Server: ${chalk.green(FHIR_SERVER_URL)}`);
  console.log(`  Using Launch Context: ${chalk.green(LAUNCH_CONTEXT)}`);
  console.log(`  Using Issuer URL: ${chalk.green(ISSUER_URL)}`);
  console.log(`  Ready to test with the Full Launch URL above\n`);

  
  console.log(chalk.yellow('Press Ctrl+C to stop the server\n'));
});
