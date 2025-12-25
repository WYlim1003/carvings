const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const serverless = require('serverless-http');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY
);

// --- SPACE 1: SAVE DATA (Quiz Submission) ---
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

    if (error) {
      console.error("Supabase Error:", error.message);
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ success: true, message: "Saved to Supabase!" });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- SPACE 2: EXPORT DATA (Get Submissions) ---
app.get('/api/export/submissions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    
    res.json(data);
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-click', async (req, res) => {
  res.json({ success: true, message: "Click saved" });
});

// Export the serverless handler
module.exports = serverless(app);