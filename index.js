const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY
);

// --- SPACE 1: SAVE DATA (Quiz Submission) ---
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

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: "Saved to Supabase!" });
});

// --- SPACE 2: EXPORT DATA (Get Submissions) ---
app.get('/api/export/submissions', async (req, res) => {
  const { data, error } = await supabase
    .from('quiz_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  
  // This sends the data as a JSON file for your admin buttons
  res.json(data);
});

module.exports = app;