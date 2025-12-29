const express = require('express');
const serverless = require('serverless-http');

const app = express();
app.use(express.json());

// Simple CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// TEST ROUTE - No Supabase
app.post('/api/submit-quiz', async (req, res) => {
    console.log('DEBUG: Request received!', req.body);
    
    // We return success IMMEDIATELY without waiting for a database
    return res.status(200).json({ 
        success: true, 
        message: "ROUTING WORKS! If you see this, your Vercel setup is correct. The problem is Supabase connection." 
    });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

module.exports = serverless(app);