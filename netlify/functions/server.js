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

const express = require("express");
const serverless = require("serverless-http");
const { Parser } = require('json2csv');
const { neon } = require('@neondatabase/serverless');

const app = express();
app.use(express.json());

// Initialize Neon database
const sql = neon(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL);

// Initialize database tables
async function initDatabase() {
  try {
    // Create submissions table
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_submissions (
        id SERIAL PRIMARY KEY,
        visitor_id TEXT,
        score INTEGER,
        percentage REAL,
        question1 TEXT,
        question2 TEXT,
        question3 TEXT,
        question4 TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create clicks table
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_clicks (
        id SERIAL PRIMARY KEY,
        total_clicks INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Initialize clicks if empty
    const clicks = await sql`SELECT * FROM quiz_clicks LIMIT 1`;
    if (clicks.length === 0) {
      await sql`INSERT INTO quiz_clicks (total_clicks) VALUES (0)`;
    }

    console.log('Database initialized');
  } catch (err) {
    console.error('Database init error:', err);
  }
}

// Initialize on startup
initDatabase();

// Export submissions
app.get("/api/export/submissions", async (req, res) => {
  try {
    const submissions = await sql`
      SELECT 
        id as submission_index,
        visitor_id,
        score,
        percentage,
        question1,
        question2,
        question3,
        question4,
        timestamp
      FROM quiz_submissions
      ORDER BY timestamp DESC
    `;

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
  }
});

// Export stats
app.get("/api/export/stats", async (req, res) => {
  try {
    const [stats] = await sql`
      SELECT 
        COUNT(*) as total_submissions,
        AVG(percentage) as average_percentage,
        (SELECT total_clicks FROM quiz_clicks LIMIT 1) as total_clicks
      FROM quiz_submissions
    `;

    const totalSubmissions = parseInt(stats.total_submissions) || 0;
    const totalClicks = parseInt(stats.total_clicks) || 0;
    const completionRate = totalClicks > 0 ? (totalSubmissions / totalClicks) * 100 : 0;

    const statsData = [{
      totalSubmissions,
      averagePercentage: parseFloat(stats.average_percentage) || 0,
      totalClicks,
      completionRate
    }];

    const parser = new Parser();
    const csv = parser.parse(statsData);

    res.header("Content-Type", "text/csv");
    res.attachment("quiz_stats.csv");
    res.send(csv);
  } catch (err) {
    console.error("Error exporting stats:", err);
    res.status(500).json({ status: "error", message: "Failed to export stats." });
  }
});

// Save click
app.post("/api/save-click", async (req, res) => {
  try {
    await sql`
      UPDATE quiz_clicks 
      SET total_clicks = total_clicks + 1, 
          updated_at = NOW()
    `;

    const [result] = await sql`SELECT total_clicks FROM quiz_clicks LIMIT 1`;
    const totalClicks = parseInt(result.total_clicks);

    const [stats] = await sql`SELECT COUNT(*) as count FROM quiz_submissions`;
    const totalSubmissions = parseInt(stats.count);

    const completionRate = totalClicks > 0 ? (totalSubmissions / totalClicks) * 100 : 0;

    res.json({ 
      status: "success", 
      totalClicks,
      completionRate 
    });
  } catch (err) {
    console.error("Error saving click:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Submit quiz
app.post("/api/submit-quiz", async (req, res) => {
  try {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ status: "error", message: "No data provided" });
    }

    const visitorID = data.visitorID || `anon-${Math.floor(Math.random() * 1000000)}`;

    // Insert submission
    await sql`
      INSERT INTO quiz_submissions 
        (visitor_id, score, percentage, question1, question2, question3, question4)
      VALUES 
        (${visitorID}, ${data.score}, ${data.percentage}, 
         ${data.question1}, ${data.question2}, ${data.question3}, ${data.question4})
    `;

    // Get stats
    const [stats] = await sql`
      SELECT 
        COUNT(*) as total_submissions,
        AVG(percentage) as average_percentage
      FROM quiz_submissions
    `;

    const [clicks] = await sql`SELECT total_clicks FROM quiz_clicks LIMIT 1`;
    const totalClicks = parseInt(clicks.total_clicks);
    const totalSubmissions = parseInt(stats.total_submissions);
    const completionRate = totalClicks > 0 ? (totalSubmissions / totalClicks) * 100 : 0;

    res.json({
      status: "success",
      totalSubmissions,
      averagePercentage: parseFloat(stats.average_percentage) || 0,
      completionRate
    });
  } catch (err) {
    console.error("Error submitting quiz:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

exports.handler = serverless(app);