const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const serverless = require('serverless-http');

const app = express();

// 1. Critical: Support JSON parsing
app.use(express.json());

// 2. Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY
);

// 3. Quiz Submission Route (Ensure the path is exactly /api/submit-quiz)
app.post('/api/submit-quiz', async (req, res) => {
  try {
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

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Server Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/save-click', async (req, res) => {
  res.json({ success: true, message: "Click saved" });
});

// Remove app.use(express.static...) - Vercel handles this automatically via your folder structure

module.exports = serverless(app);