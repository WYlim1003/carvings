// const express = require("express");
// const serverless = require("serverless-http");
// const { Parser } = require('json2csv');

// const app = express();
// app.use(express.json());

// const storage = {
//   submissions: [],
//   clicks: { totalClicks: 0 },
//   stats: {
//     totalSubmissions: 0,
//     sumOfPercentages: 0,
//     averagePercentage: 0,
//     completionRate: 0
//   }
// };

// app.get("/api/export/submissions", async (req, res) => {
//   try {
//     if (storage.submissions.length === 0) {
//       return res.status(404).send("No submission data to export.");
//     }

//     const parser = new Parser();
//     const csv = parser.parse(storage.submissions);

//     res.header("Content-Type", "text/csv");
//     res.attachment("quiz_submissions.csv");
//     res.send(csv);
//   } catch (err) {
//     console.error("Error exporting submissions:", err);
//     res.status(500).json({ status: "error", message: "Failed to export data." });
//   }
// });

// app.get("/api/export/stats", async (req, res) => {
//   try {
//     const statsArray = [storage.stats];
//     const parser = new Parser();
//     const csv = parser.parse(statsArray);

//     res.header("Content-Type", "text/csv");
//     res.attachment("quiz_stats.csv");
//     res.send(csv);
//   } catch (err) {
//     console.error("Error exporting stats:", err);
//     res.status(500).json({ status: "error", message: "Failed to export stats." });
//   }
// });

// app.post("/api/save-click", async (req, res) => {
//   try {
//     storage.clicks.totalClicks += 1;
    
//     const totalSubmissions = storage.stats.totalSubmissions;
//     const totalClicks = storage.clicks.totalClicks;
    
//     storage.stats.completionRate = totalClicks > 0 
//       ? (totalSubmissions / totalClicks) * 100
//       : 0;

//     res.json({ 
//       status: "success", 
//       totalClicks: storage.clicks.totalClicks,
//       completionRate: storage.stats.completionRate 
//     });
//   } catch (err) {
//     console.error("Error saving click:", err);
//     res.status(500).json({ status: "error", message: err.message });
//   }
// });

// app.post("/api/submit-quiz", async (req, res) => {
//   try {
//     const data = req.body;
//     if (!data) {
//       return res.status(400).json({ status: "error", message: "No data provided" });
//     }

//     const submissionIndex = storage.submissions.length;
//     const visitorID = data.visitorID || `anon-${Math.floor(Math.random() * 1000000)}`;
    
//     const newSubmission = {
//       submissionIndex,
//       timestamp: new Date().toISOString(),
//       visitorID,
//       score: data.score || 0,
//       percentage: data.percentage || 0,
//       question1: data.question1 || null,
//       question2: data.question2 || null,
//       question3: data.question3 || null,
//       question4: data.question4 || null
//     };

//     storage.submissions.push(newSubmission);
    
//     storage.stats.totalSubmissions += 1;
//     storage.stats.sumOfPercentages += newSubmission.percentage;
//     storage.stats.averagePercentage = storage.stats.sumOfPercentages / storage.stats.totalSubmissions;
    
//     const totalClicks = storage.clicks.totalClicks;
//     storage.stats.completionRate = totalClicks > 0 
//       ? (storage.stats.totalSubmissions / totalClicks) * 100
//       : 0;

//     res.json({
//       status: "success",
//       totalSubmissions: storage.stats.totalSubmissions,
//       averagePercentage: storage.stats.averagePercentage,
//       completionRate: storage.stats.completionRate
//     });
//   } catch (err) {
//     console.error("Error submitting quiz:", err);
//     res.status(500).json({ status: "error", message: err.message });
//   }
// });

// exports.handler = serverless(app);

// netlify/functions/server.js
// Unified Backend for Quiz Submissions, Clicks, and Exports (using Express + Neon DB)

const express = require("express");
const serverless = require("serverless-http");
const { Parser } = require('json2csv'); // For CSV export
const { Client } = require('pg');       // REQUIRED: For Neon connection

const app = express();
app.use(express.json());

// --- Database Connection Utility ---
// Function to get a database client and connect
async function getDbClient() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("Database connection not configured.");
    }
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Essential for external connections like Netlify to Neon
    });
    await client.connect();
    return client;
}

// =================================================================
// 1. STATS CALCULATION (Reads directly from Neon)
// =================================================================

// Function to fetch and calculate all statistics live from the database
async function calculateStats(client) {
    // Aggregation query to get total submissions, sum of scores, and total clicks
    const query = `
        SELECT 
            (SELECT COUNT(*) FROM submissions) AS total_submissions,
            COALESCE(SUM(percentage), 0) AS sum_of_percentages
        FROM submissions;
        
        -- Separate query for clicks count
        SELECT COUNT(*) FROM clicks;
    `;
    
    // The client.query will execute the two SELECT statements above
    const [submissionStatsResult, clickStatsResult] = await client.query(query);

    const totalSubmissions = parseInt(submissionStatsResult.rows[0].total_submissions || 0);
    const sumOfPercentages = parseFloat(submissionStatsResult.rows[0].sum_of_percentages || 0);
    const totalClicks = parseInt(clickStatsResult.rows[0].count || 0);

    const averagePercentage = totalSubmissions > 0 ? (sumOfPercentages / totalSubmissions) : 0;
    const completionRate = totalClicks > 0 ? (totalSubmissions / totalClicks) * 100 : 0;

    return {
        totalSubmissions: totalSubmissions,
        averagePercentage: averagePercentage.toFixed(2),
        completionRate: completionRate.toFixed(2),
        totalClicks: totalClicks
    };
}


// =================================================================
// 2. API ENDPOINTS (Database Operations)
// =================================================================

// GET /api/export/submissions - Exports all submissions to CSV
app.get("/api/export/submissions", async (req, res) => {
    let client;
    try {
        client = await getDbClient();
        
        // Fetch ALL submissions from the database
        const result = await client.query('SELECT * FROM submissions ORDER BY submission_time ASC');
        const submissions = result.rows;

        if (submissions.length === 0) {
            return res.status(404).send("No submission data to export.");
        }

        const parser = new Parser();
        const csv = parser.parse(submissions);

        res.header("Content-Type", "text/csv");
        res.attachment("quiz_submissions.csv");
        res.send(csv);
    } catch (err) {
        console.error("Error exporting submissions:", err);
        res.status(500).json({ status: "error", message: "Failed to export data." });
    } finally {
        if (client) await client.end();
    }
});


// GET /api/export/stats - Exports current stats to CSV
app.get("/api/export/stats", async (req, res) => {
    let client;
    try {
        client = await getDbClient();
        
        // Calculate stats live from the database
        const stats = await calculateStats(client);
        
        const parser = new Parser();
        const csv = parser.parse([stats]);

        res.header("Content-Type", "text/csv");
        res.attachment("quiz_stats.csv");
        res.send(csv);
    } catch (err) {
        console.error("Error exporting stats:", err);
        res.status(500).json({ status: "error", message: "Failed to export stats." });
    } finally {
        if (client) await client.end();
    }
});


// POST /api/save-click - Logs a retake click to the 'clicks' table
app.post("/api/save-click", async (req, res) => {
    let client;
    try {
        client = await getDbClient();
        
        const data = req.body; 
        const action = data.action || 'retake'; 
        const visitorID = (data.visitorID || null)?.substring(0, 50);

        // SQL INSERT to the persistent 'clicks' table
        const query = `INSERT INTO clicks (action_type, visitor_id) VALUES ($1, $2)`;
        await client.query(query, [action, visitorID]);
        
        // Recalculate and return live stats after the click is saved
        const stats = await calculateStats(client);

        res.json({ 
            status: "success", 
            totalClicks: stats.totalClicks,
            completionRate: stats.completionRate 
        });
    } catch (err) {
        console.error("Error saving click:", err);
        res.status(500).json({ status: "error", message: err.message });
    } finally {
        if (client) await client.end();
    }
});


// POST /api/submit-quiz - Saves a full quiz submission to the 'submissions' table
app.post("/api/submit-quiz", async (req, res) => {
    let client;
    try {
        client = await getDbClient();
        
        const data = req.body;
        if (!data || !data.score) {
            return res.status(400).json({ status: "error", message: "No score provided" });
        }

        const visitorID = (data.visitorID || `anon-${Math.floor(Math.random() * 1000000)}`).substring(0, 50);
        
        // SQL INSERT to the persistent 'submissions' table
        const insertQuery = `
            INSERT INTO submissions (visitor_id, score, percentage, question1, question2, question3, question4)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const insertValues = [
            visitorID, 
            data.score || 0, 
            data.percentage || 0, 
            data.question1 || null, 
            data.question2 || null, 
            data.question3 || null, 
            data.question4 || null
        ];
        await client.query(insertQuery, insertValues);
        
        // Recalculate and return live stats after the submission is saved
        const stats = await calculateStats(client);

        res.json({
            status: "success",
            totalSubmissions: stats.totalSubmissions,
            averagePercentage: stats.averagePercentage,
            completionRate: stats.completionRate
        });
    } catch (err) {
        console.error("Error submitting quiz:", err);
        res.status(500).json({ status: "error", message: err.message });
    } finally {
        if (client) await client.end();
    }
});

// Wrap the Express app for Netlify Functions export
exports.handler = serverless(app);