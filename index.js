const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Standard Vercel environment variables
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY
);

// SPACE 1: SAVE DATA (Quiz Submission)
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
    res.status(200).json({ success: true, message: "Saved to Supabase!" });
  } catch (err) {
    console.error("Supabase Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// SPACE 2: EXPORT DATA (Get Submissions)
app.get('/api/export/submissions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export the app directly for Vercel
module.exports = app;