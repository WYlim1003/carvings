const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Parser } = require('json2csv');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY
);

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

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, data });
});

// 2. Export Route (for your admin buttons)
app.get('/api/export/submissions', async (req, res) => {
  const { data, error } = await supabase.from('quiz_submissions').select('*');
  if (error) return res.status(500).send("Export failed");

  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(data);
  res.header('Content-Type', 'text/csv');
  res.attachment('submissions.csv');
  res.send(csv);
});

module.exports = app;