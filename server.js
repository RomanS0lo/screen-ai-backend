const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Define your API key (the one your extension should use)
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'test-key123';

// Detailed startup logging
console.log("Server starting up");
console.log("Environment variables loaded:", process.env.ANTHROPIC_API_KEY ? "API key exists" : "API key missing");
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

// Route for proxying requests to Anthropic
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
    
    // Check if ANTHROPIC_API_KEY exists
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is missing!");
      return res.status(500).json({ error: 'Server configuration error: Missing API key' });
    }
    
    console.log("Anthropic API Key:", process.env.ANTHROPIC_API_KEY.substring(0, 15) + "...");
    console.log("Preparing payload for Anthropic API");
    
    // Prepare payload for Anthropic API
    const payload = {
      model: "claude-3-opus-20240229", // Or whichever model you prefer
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "You are a helpful senior developer who's providing advice on the code/problem shown in this screenshot. Analyze the code/task and explain how to solve it in a completely natural, human-like way - as if you're a real person casually thinking through the problem out loud. Your response should:\n\n1. Include a complete, working code solution that can be directly copied and used\n2. Explain your thought process in a conversational, slightly informal way (use 'I', contractions like 'I'd', 'we're', etc.)\n3. Include some natural verbal patterns like 'hmm', 'let's see', 'actually', and occasional self-correction\n4. Mention realistic alternative approaches you considered but didn't go with\n5. Format your code neatly with markdown\n6. Don't be too polished - add a few casual asides or comments that show personality\n\nRemember to make your response feel like it's coming from a real human developer, not an AI. Keep the solution practical and implement a complete solution that actually solves the problem."
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageData.replace(/^data:image\/png;base64,/, "")
              }
            }
          ]
        }
      ]
    };

    console.log("Sending request to Anthropic API with model:", payload.model);
    
    try {
      // Make request to Anthropic API
      const response = await axios.post('https://api.anthropic.com/v1/messages', payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        timeout: 60000 // 60 second timeout to handle long processing times
      });

      console.log("Received response from Anthropic API with status:", response.status);
      console.log("Response type:", response.data.content[0].type);
      console.log("Response text preview:", response.data.content[0].text.substring(0, 100) + "...");
      
      // Send response back to client
      res.json({
        response: response.data.content[0].text
      });
      
      console.log("Successfully sent response back to client");
    } catch (anthropicError) {
      console.error('Error calling Anthropic API:', anthropicError.message);
      
      if (anthropicError.response) {
        console.error('Anthropic API Error Response:', {
          status: anthropicError.response.status,
          statusText: anthropicError.response.statusText,
          data: anthropicError.response.data
        });
        
        return res.status(anthropicError.response.status).json({
          error: `Anthropic API Error: ${anthropicError.response.status} - ${anthropicError.response.statusText}`,
          details: anthropicError.response.data
        });
      } else if (anthropicError.request) {
        console.error('No response received from Anthropic:', anthropicError.request);
        return res.status(500).json({
          error: 'No response received from Anthropic API',
          details: 'The request was made but no response was received'
        });
      } else {
        console.error('Error setting up Anthropic request:', anthropicError.message);
        return res.status(500).json({
          error: 'Error setting up Anthropic request',
          details: anthropicError.message
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