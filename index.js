const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const serverless = require('serverless-http');

const app = express();
app.use(express.json());

// Initialize Supabase with environment variables
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY
);

// CORS headers for API routes
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Quiz Submission Route
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
      }])
      .select();

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Quiz submitted successfully!",
      data 
    });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Click Tracking Route
app.post('/api/save-click', async (req, res) => {
  try {
    // You can implement click tracking here if needed
    return res.status(200).json({ 
      success: true, 
      message: "Click tracked",
      totalClicks: 1 
    });
  } catch (err) {
    console.error("Click tracking error:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Export Submissions Data
app.get('/api/export/submissions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Export Error:", error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Export Error:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Export Stats Data
app.get('/api/export/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('score, percentage, created_at');

    if (error) {
      console.error("Stats Error:", error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    // Calculate statistics
    const stats = {
      totalSubmissions: data.length,
      averageScore: data.reduce((acc, item) => acc + item.score, 0) / data.length || 0,
      averagePercentage: data.reduce((acc, item) => acc + item.percentage, 0) / data.length || 0,
      submissions: data
    };

    return res.status(200).json(stats);
  } catch (err) {
    console.error("Stats Error:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export wrapped with serverless-http for Vercel
module.exports = serverless(app);