const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const serverless = require('serverless-http');

const app = express();
app.use(express.json());

// Initialize Supabase with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Quiz Submission Route
app.post('/api/submit-quiz', async (req, res) => {
    console.log('--- Submission Received ---');
    try {
        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase credentials missing in Vercel environment.');
        }

        // Destructure with aliases to handle both naming styles (q1 vs question1)
        const { 
            visitorID, 
            question1, q1, 
            question2, q2, 
            question3, q3, 
            question4, q4, 
            score, 
            percentage 
        } = req.body;

        // Use whichever name is available
        const finalQ1 = question1 || q1;
        const finalQ2 = question2 || q2;
        const finalQ3 = question3 || q3;
        const finalQ4 = question4 || q4;

        // Validation with specific logging
        if (!visitorID) return res.status(400).json({ success: false, error: "Missing visitorID" });
        if (finalQ1 === undefined) return res.status(400).json({ success: false, error: "Missing Question 1" });

        const insertData = {
            visitor_id: visitorID,
            q1: finalQ1,
            q2: finalQ2,
            q3: finalQ3,
            q4: finalQ4,
            score: parseInt(score) || 0,
            percentage: parseFloat(percentage) || 0
        };

        console.log('Inserting to Supabase:', insertData);

        // Perform insert (Removed .select() to prevent RLS hangs)
        const { error } = await supabase
            .from('quiz_submissions')
            .insert([insertData]);

        if (error) {
            console.error('Supabase Error:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }

        console.log('Success: Data saved.');
        return res.status(200).json({ success: true, message: "Quiz submitted!" });

    } catch (err) {
        console.error('Server Exception:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Click Tracking Route
app.post('/api/save-click', async (req, res) => {
    return res.status(200).json({ success: true, message: "Click tracked" });
});

// Helper for CSV
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
        const values = headers.map(header => {
            const val = String(row[header] || '');
            return val.includes(',') ? `"${val.replace(/"/g, '""')}"` : val;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
}

// Export Routes
app.get('/api/export/submissions', async (req, res) => {
    try {
        const { data, error } = await supabase.from('quiz_submissions').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const csv = convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=submissions.csv');
        return res.status(200).send('\ufeff' + csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/export/stats', async (req, res) => {
    try {
        const { data, error } = await supabase.from('quiz_submissions').select('score, percentage, created_at');
        if (error) throw error;
        const csv = convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=stats.csv');
        return res.status(200).send('\ufeff' + csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.all('*', (req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.path });
});

module.exports = serverless(app);