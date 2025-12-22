const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(express.json());
app.use(express.static('public')); // Or wherever your HTML files are

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 1. Submit Quiz Route
app.post('/api/submit-quiz', async (req, res) => {
  const { visitorID, question1, question2, question3, question4, score, percentage } = req.body;

  const { data, error } = await supabase
    .from('quiz_submissions')
    .insert([{ 
      visitor_id: visitorID, 
      q1: question1, q2: question2, q3: question3, q4: question4, 
      score, percentage 
    }]);

  if (error) return res.status(500).json(error);
  res.json({ success: true, data });
});

// 2. Save Click Route (Incrementing a counter)
app.post('/api/save-click', async (req, res) => {
  // In Supabase, you can use an RPC function or a simple update
  const { data, error } = await supabase
    .rpc('increment_clicks'); // You will create this function in Supabase

  if (error) return res.status(500).json(error);
  res.json({ success: true });
});

module.exports = app;