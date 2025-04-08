const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// Import the Google Generative AI package properly
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Define your API key (the one your extension should use)
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'test-key123';

// Set up Google Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBoH-912W6sxw1vwCCWy_86eIqWcs-baB0';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Detailed startup logging
console.log("Server starting up");
console.log("Environment variables loaded:", GEMINI_API_KEY ? "Gemini API key exists" : "Gemini API key missing");
console.log("API_SECRET_KEY for client authentication:", API_SECRET_KEY ? "exists" : "missing");

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for testing (restrict this in production)
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

app.use(express.json({ limit: '50mb' }));

// Add a simple route for the root path to help with testing
app.get('/', (req, res) => {
  console.log("Root path accessed");
  res.send('Screen AI Assistant Backend is running!');
});

// Route for analyzing screenshots with Gemini
app.post('/api/analyze-screenshot', async (req, res) => {
  try {
    console.log("Received request to analyze screenshot");
    
    // Check API key from extension
    const receivedApiKey = req.headers['x-api-key'];
    console.log('API key validation:', receivedApiKey === API_SECRET_KEY);
    
    if (!receivedApiKey || receivedApiKey !== API_SECRET_KEY) {
      console.log('Authentication failed - Invalid API key');
      return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }
    
    console.log('Authentication successful!');
    
    const { imageData } = req.body;
    
    if (!imageData) {
      console.log("Error: Missing image data");
      return res.status(400).json({ error: 'Missing image data' });
    }
    
    console.log("Image data received, length:", imageData.length);
    
    try {
      // Initialize the Gemini Pro Vision model
      const model = genAI.getGenerativeModel({ 
        model: "gemini-pro-vision",
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1500,
        }
      });
      
      console.log("Preparing request for Gemini API");
      
      // Extract the base64 data from the data URL
      const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
      
      // Prepare the prompt parts
      const promptParts = [
        {
          text: "You are a helpful senior developer who's providing advice on the code/problem shown in this screenshot. Analyze the code/task and explain how to solve it in a completely natural, human-like way - as if you're a real person casually thinking through the problem out loud. Your response should:\n\n1. Include a complete, working code solution that can be directly copied and used\n2. Explain your thought process in a conversational, slightly informal way (use 'I', contractions like 'I'd', 'we're', etc.)\n3. Include some natural verbal patterns like 'hmm', 'let's see', 'actually', and occasional self-correction\n4. Mention realistic alternative approaches you considered but didn't go with\n5. Format your code neatly with markdown\n6. Don't be too polished - add a few casual asides or comments that show personality\n\nRemember to make your response feel like it's coming from a real human developer, not an AI. Keep the solution practical and implement a complete solution that actually solves the problem."
        },
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Data
          }
        }
      ];

      console.log("Sending request to Gemini API");
      
      // Generate content with the Gemini model
      const result = await model.generateContent({
        contents: [{ role: "user", parts: promptParts }]
      });
      
      console.log("Received response from Gemini API");
      const response = await result.response;
      const text = response.text();
      
      console.log("Response text preview:", text.substring(0, 100) + "...");
      
      // Send response back to client
      res.json({
        response: text
      });
      
      console.log("Successfully sent response back to client");
    } catch (geminiError) {
      console.error('Error calling Gemini API:', geminiError.message);
      
      if (geminiError.response) {
        console.error('Gemini API Error Response:', {
          status: geminiError.response.status,
          statusText: geminiError.response.statusText,
          data: geminiError.response.data
        });
        
        return res.status(500).json({
          error: `Gemini API Error: ${geminiError.message}`,
          details: geminiError.response?.data || "No additional error details available"
        });
      } else {
        console.error('Error with Gemini request:', geminiError);
        return res.status(500).json({
          error: 'Error with Gemini request',
          details: geminiError.message
        });
      }
    }
  } catch (error) {
    console.error('Error processing screenshot:', error.message);
    
    // Send appropriate error message
    res.status(500).json({
      error: 'Server error processing request',
      details: error.message
    });
    
    console.log("Sent error response to client");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});