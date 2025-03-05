const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Read the example HTML file
const htmlContent = fs.readFileSync(path.join(__dirname, 'example.html'), 'utf8');

// API endpoint
const API_URL = 'http://localhost:3000/api/html/process';

// Test data
const testData = {
  htmlContent,
  siteName: 'TechInnovate Solutions',
  keywords: ['artificial intelligence', 'machine learning', 'digital transformation', 'cloud computing', 'cybersecurity']
};

// Make the API request
async function testApi() {
  console.log('Sending request to API...');
  
  try {
    const response = await axios.post(API_URL, testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response received!');
    console.log('Status:', response.status);
    console.log('Stats:', response.data.stats);
    
    // Save the modified HTML to a file
    fs.writeFileSync(path.join(__dirname, 'modified.html'), response.data.modifiedHtml);
    console.log('Modified HTML saved to modified.html');
  } catch (error) {
    console.error('Error calling API:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testApi(); 