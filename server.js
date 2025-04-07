const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Simple logging
console.log("Server starting up");

// Middleware
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

app.use(express.json({ limit: '50mb' }));

// Root route
app.get('/', (req, res) => {
  console.log("Root path accessed");
  res.send('Screen AI Assistant Backend is running!');
});

// Simple test endpoint with no authentication
app.post('/api/analyze-screenshot', (req, res) => {
  try {
    console.log("Received request headers:", req.headers);
    
    // Send a test response
    res.json({
      response: "Test successful! This is a bypass response to check connectivity."
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});