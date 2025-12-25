const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const serverless = require('serverless-http');  // Add this

const app = express();
app.use(express.json());
// Serves your static files (index.html, quiz.js, etc.)
app.use(express.static(path.join(__dirname, '/')));

// Initialize Supabase directly here using environment variables
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY
);

// Quiz Submission Route
app.post('/api/submit-quiz', async (req, res) => {
  const { visitorID, question1, question2, question3, question4, score, percentage } = req.body;
  
  const { data, error } = await supabase
    .from('quiz_submissions')
    .insert([{ 
      visitor_id: visitorID, 
      q1: question1, 
      q2: question2, 
      q3: question3, 
      q4: question4, 
      score, 
      percentage 
    }]);

  if (error) {
    console.error("Supabase Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true, data });
});

// Click Tracking Route
app.post('/api/save-click', async (req, res) => {
  // Logic for tracking retakes or clicks
  res.json({ success: true, message: "Click saved" });
});

// Wrap the app with serverless-http and export it
module.exports = serverless(app);