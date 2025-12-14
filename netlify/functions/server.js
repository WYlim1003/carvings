const express = require("express");
const serverless = require("serverless-http");
const { Parser } = require('json2csv');

const app = express();
app.use(express.json());

const storage = {
  submissions: [],
  clicks: { totalClicks: 0 },
  stats: {
    totalSubmissions: 0,
    sumOfPercentages: 0,
    averagePercentage: 0,
    completionRate: 0
  }
};

app.get("/api/export/submissions", async (req, res) => {
  try {
    if (storage.submissions.length === 0) {
      return res.status(404).send("No submission data to export.");
    }

    const parser = new Parser();
    const csv = parser.parse(storage.submissions);

    res.header("Content-Type", "text/csv");
    res.attachment("quiz_submissions.csv");
    res.send(csv);
  } catch (err) {
    console.error("Error exporting submissions:", err);
    res.status(500).json({ status: "error", message: "Failed to export data." });
  }
});

app.get("/api/export/stats", async (req, res) => {
  try {
    const statsArray = [storage.stats];
    const parser = new Parser();
    const csv = parser.parse(statsArray);

    res.header("Content-Type", "text/csv");
    res.attachment("quiz_stats.csv");
    res.send(csv);
  } catch (err) {
    console.error("Error exporting stats:", err);
    res.status(500).json({ status: "error", message: "Failed to export stats." });
  }
});

app.post("/api/save-click", async (req, res) => {
  try {
    storage.clicks.totalClicks += 1;
    
    const totalSubmissions = storage.stats.totalSubmissions;
    const totalClicks = storage.clicks.totalClicks;
    
    storage.stats.completionRate = totalClicks > 0 
      ? (totalSubmissions / totalClicks) * 100
      : 0;

    res.json({ 
      status: "success", 
      totalClicks: storage.clicks.totalClicks,
      completionRate: storage.stats.completionRate 
    });
  } catch (err) {
    console.error("Error saving click:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/api/submit-quiz", async (req, res) => {
  try {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ status: "error", message: "No data provided" });
    }

    const submissionIndex = storage.submissions.length;
    const visitorID = data.visitorID || `anon-${Math.floor(Math.random() * 1000000)}`;
    
    const newSubmission = {
      submissionIndex,
      timestamp: new Date().toISOString(),
      visitorID,
      score: data.score || 0,
      percentage: data.percentage || 0,
      question1: data.question1 || null,
      question2: data.question2 || null,
      question3: data.question3 || null,
      question4: data.question4 || null
    };

    storage.submissions.push(newSubmission);
    
    storage.stats.totalSubmissions += 1;
    storage.stats.sumOfPercentages += newSubmission.percentage;
    storage.stats.averagePercentage = storage.stats.sumOfPercentages / storage.stats.totalSubmissions;
    
    const totalClicks = storage.clicks.totalClicks;
    storage.stats.completionRate = totalClicks > 0 
      ? (storage.stats.totalSubmissions / totalClicks) * 100
      : 0;

    res.json({
      status: "success",
      totalSubmissions: storage.stats.totalSubmissions,
      averagePercentage: storage.stats.averagePercentage,
      completionRate: storage.stats.completionRate
    });
  } catch (err) {
    console.error("Error submitting quiz:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

exports.handler = serverless(app);

netlify/functions/server.js
Unified Backend for Quiz Submissions, Clicks, and Exports (using Express + Neon DB)