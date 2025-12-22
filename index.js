const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Initialize Supabase directly here
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY
);

app.post('/api/submit-quiz', async (req, res) => {
  const { visitorID, question1, question2, question3, question4, score, percentage } = req.body;
  
  const { data, error } = await supabase
    .from('quiz_submissions')
    .insert([{ 
      visitor_id: visitorID, 
      q1: question1, q2: question2, q3: question3, q4: question4, 
      score, percentage 
    }]);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, data });
});

// Important for Vercel
module.exports = app;