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
        visitor_id VARCHAR(50),
        score INTEGER,
        percentage NUMERIC(5, 2),
        question1 VARCHAR(10),
        question2 VARCHAR(10),
        question3 VARCHAR(10),
        question4 VARCHAR(10),
        submission_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create clicks table
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_clicks (
        id SERIAL PRIMARY KEY,
        total_clicks INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Initialize clicks if empty
    const clicks = await sql`SELECT * FROM quiz_clicks LIMIT 1`;
    if (clicks.length === 0) {
      await sql`INSERT INTO quiz_clicks (total_clicks) VALUES (0)`;
      console.log('Initialized quiz_clicks table with 0');
    }

    console.log('Database initialized successfully');
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
        id,
        visitor_id,
        score,
        percentage,
        question1,
        question2,
        question3,
        question4,
        submission_time
      FROM quiz_submissions
      ORDER BY submission_time DESC
    `;

    console.log(`Found ${submissions.length} submissions`);

    if (submissions.length === 0) {
      return res.status(200).send("No submission data available yet. Submit a quiz first.");
    }

    const parser = new Parser();
    const csv = parser.parse(submissions);

    res.header("Content-Type", "text/csv");
    res.attachment("quiz_submissions.csv");
    res.send(csv);
  } catch (err) {
    console.error("Error exporting submissions:", err);
    res.status(500).json({ 
      status: "error", 
      message: "Failed to export data.",
      error: err.message 
    });
  }
});

// Export stats
app.get("/api/export/stats", async (req, res) => {
  try {
    // Get submission stats
    const submissionStats = await sql`
      SELECT 
        COUNT(*) as total_submissions,
        AVG(percentage) as average_percentage
      FROM quiz_submissions
    `;

    // Get clicks
    const clicksData = await sql`SELECT total_clicks FROM quiz_clicks LIMIT 1`;

    const totalSubmissions = parseInt(submissionStats[0]?.total_submissions) || 0;
    const averagePercentage = parseFloat(submissionStats[0]?.average_percentage) || 0;
    const totalClicks = parseInt(clicksData[0]?.total_clicks) || 0;
    
    // Calculate completion rate
    const completionRate = totalClicks > 0 ? (totalSubmissions / totalClicks) * 100 : 0;

    console.log('Stats:', { totalSubmissions, totalClicks, completionRate });

    const statsData = [{
      totalSubmissions,
      averagePercentage: averagePercentage.toFixed(2),
      totalClicks,
      completionRate: completionRate.toFixed(2)
    }];

    const parser = new Parser();
    const csv = parser.parse(statsData);

    res.header("Content-Type", "text/csv");
    res.attachment("quiz_stats.csv");
    res.send(csv);
  } catch (err) {
    console.error("Error exporting stats:", err);
    res.status(500).json({ 
      status: "error", 
      message: "Failed to export stats.",
      error: err.message 
    });
  }
});

// Save click
app.post("/api/save-click", async (req, res) => {
  try {
    // Update clicks
    await sql`
      UPDATE quiz_clicks 
      SET total_clicks = total_clicks + 1, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `;

    // Get updated values
    const clicksResult = await sql`SELECT total_clicks FROM quiz_clicks WHERE id = 1`;
    const totalClicks = parseInt(clicksResult[0]?.total_clicks) || 0;

    const submissionsResult = await sql`SELECT COUNT(*) as count FROM quiz_submissions`;
    const totalSubmissions = parseInt(submissionsResult[0]?.count) || 0;

    const completionRate = totalClicks > 0 ? (totalSubmissions / totalClicks) * 100 : 0;

    console.log('Click saved:', { totalClicks, totalSubmissions, completionRate });

    res.json({ 
      status: "success", 
      totalClicks,
      completionRate: completionRate.toFixed(2)
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

    console.log('Submitting quiz:', { visitorID, score: data.score, percentage: data.percentage });

    // Insert submission
    await sql`
      INSERT INTO quiz_submissions 
        (visitor_id, score, percentage, question1, question2, question3, question4)
      VALUES 
        (${visitorID}, ${data.score}, ${data.percentage}, 
         ${data.question1}, ${data.question2}, ${data.question3}, ${data.question4})
    `;

    // Get updated stats
    const stats = await sql`
      SELECT 
        COUNT(*) as total_submissions,
        AVG(percentage) as average_percentage
      FROM quiz_submissions
    `;

    const clicks = await sql`SELECT total_clicks FROM quiz_clicks WHERE id = 1`;
    
    const totalClicks = parseInt(clicks[0]?.total_clicks) || 0;
    const totalSubmissions = parseInt(stats[0]?.total_submissions) || 0;
    const averagePercentage = parseFloat(stats[0]?.average_percentage) || 0;
    const completionRate = totalClicks > 0 ? (totalSubmissions / totalClicks) * 100 : 0;

    console.log('Quiz submitted successfully:', { totalSubmissions, averagePercentage, completionRate });

    res.json({
      status: "success",
      totalSubmissions,
      averagePercentage: averagePercentage.toFixed(2),
      completionRate: completionRate.toFixed(2)
    });
  } catch (err) {
    console.error("Error submitting quiz:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

exports.handler = serverless(app);