const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const serverless = require('serverless-http');

const app = express();
app.use(express.json());

// Initialize Supabase with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
}

const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);

// CORS headers for API routes
app.use((req, res, next) => {
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
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase not configured - missing environment variables');
      console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING');
      console.error('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'MISSING');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Supabase credentials not set. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment variables.'
      });
    }

    const { visitorID, question1, question2, question3, question4, score, percentage } = req.body;
    
    console.log('=== QUIZ SUBMISSION REQUEST ===');
    console.log('Received quiz submission:', { visitorID, question1, question2, question3, question4, score, percentage });
    console.log('Supabase URL:', supabaseUrl ? 'Configured' : 'Missing');
    console.log('Supabase Key:', supabaseAnonKey ? 'Configured' : 'Missing');
    
    // Validate required fields
    if (!visitorID || question1 === undefined || question2 === undefined || question3 === undefined || question4 === undefined) {
      console.error('Missing required fields in request');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: visitorID and all question answers are required'
      });
    }

    // Prepare data for insertion
    const insertData = { 
      visitor_id: visitorID, 
      q1: question1, 
      q2: question2, 
      q3: question3, 
      q4: question4, 
      score: parseInt(score) || 0, 
      percentage: parseFloat(percentage) || 0
    };
    
    console.log('Inserting data:', insertData);
    
    const { data, error } = await supabase
      .from('quiz_submissions')
      .insert([insertData])
      .select();

    if (error) {
      console.error("=== SUPABASE ERROR ===");
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", JSON.stringify(error, null, 2));
      console.error("Error hint:", error.hint);
      
      // Provide more helpful error messages
      let errorMessage = error.message || 'Database error occurred';
      if (error.code === 'PGRST116') {
        errorMessage = 'Table "quiz_submissions" not found. Please check your Supabase database schema.';
      } else if (error.code === '23505') {
        errorMessage = 'Duplicate entry. This submission may have already been recorded.';
      } else if (error.code === '42501') {
        errorMessage = 'Permission denied. Please check Supabase Row Level Security (RLS) policies for the quiz_submissions table.';
      } else if (error.code === '42P01') {
        errorMessage = 'Table does not exist. Please create the quiz_submissions table in Supabase.';
      }
      
      return res.status(500).json({ 
        success: false, 
        error: errorMessage,
        errorCode: error.code,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }

    console.log('=== QUIZ SUBMITTED SUCCESSFULLY ===');
    console.log('Returned data:', JSON.stringify(data, null, 2));
    
    return res.status(200).json({ 
      success: true, 
      message: "Quiz submitted successfully!",
      data 
    });
  } catch (err) {
    console.error("=== SERVER EXCEPTION ===");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ 
      success: false, 
      error: err.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
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

// Helper function to convert array of objects to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV header row
  const csvRows = [headers.join(',')];
  
  // Create CSV data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// Export Submissions Data
app.get('/api/export/submissions', async (req, res) => {
  try {
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Supabase credentials not set.'
      });
    }

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

    // Convert to CSV
    const csv = convertToCSV(data || []);
    
    // Set headers for CSV download
    const filename = `quiz-submissions-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Add BOM for Excel compatibility with special characters and send CSV
    return res.status(200).send('\ufeff' + csv);
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
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Supabase credentials not set.'
      });
    }

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
    const totalSubmissions = data.length;
    const averageScore = data.reduce((acc, item) => acc + (item.score || 0), 0) / totalSubmissions || 0;
    const averagePercentage = data.reduce((acc, item) => acc + (item.percentage || 0), 0) / totalSubmissions || 0;

    // Convert to CSV format
    const csvRows = ['Metric,Value,Date'];
    csvRows.push(`Total Submissions,${totalSubmissions},`);
    csvRows.push(`Average Score,${averageScore.toFixed(2)},`);
    csvRows.push(`Average Percentage,${averagePercentage.toFixed(2)},`);
    csvRows.push(','); // Empty row
    csvRows.push('Individual Results,,');
    csvRows.push('Score,Percentage,Date');
    
    data.forEach(item => {
      const score = item.score || '';
      const percentage = item.percentage || '';
      const date = item.created_at ? new Date(item.created_at).toLocaleString() : '';
      csvRows.push(`${score},${percentage},"${date}"`);
    });

    const csv = csvRows.join('\n');
    
    // Set headers for CSV download
    const filename = `quiz-stats-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Add BOM for Excel compatibility with special characters and send CSV
    return res.status(200).send('\ufeff' + csv);
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

// Debug route to check what path Vercel is passing
app.all('*', (req, res) => {
  console.log('Unmatched route:', req.method, req.path, req.url);
  res.status(404).json({ 
    error: 'Route not found', 
    method: req.method, 
    path: req.path, 
    url: req.url 
  });
});

// Export wrapped with serverless-http for Vercel
module.exports = serverless(app);

