const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const { Parser } = require('json2csv');
const app = express();
const PORT = process.env.PORT || 3000;

const submissionsFile = path.join(__dirname, "submissions.json");
const clicksFile = path.join(__dirname, "clicks.json");
const statsFile = path.join(__dirname, "quiz_stats.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

fs.pathExists(clicksFile).then(exists => {
  if (!exists) fs.writeJson(clicksFile, { totalClicks: 0 }, { spaces: 2 });
});

fs.pathExists(statsFile).then(exists => {
  if (!exists) {
    fs.writeJson(statsFile, {
      totalSubmissions: 0,
      sumOfPercentages: 0,
      averagePercentage: 0,
      completionRate: 0 
    }, { spaces: 2 });
  }
});

app.get("/export/submissions", async (req, res) => {
    try {
        const submissions = await fs.readJson(submissionsFile).catch(() => {
            console.warn("Submissions file not found, returning empty array.");
            return [];
        });

        if (submissions.length === 0) {
            return res.status(404).send("No submission data to export.");
        }

        const parser = new Parser();
        const csv = parser.parse(submissions);

        // Set headers for file download
        res.header("Content-Type", "text/csv");
        res.attachment("quiz_submissions.csv"); 
        res.send(csv);
        
    } catch (err) {
        console.error("Error exporting submissions data:", err);
        res.status(500).json({ status: "error", message: "Failed to export data." });
    }
});

app.get("/export/stats", async (req, res) => {
    try {
        const stats = await fs.readJson(statsFile).catch(() => {
            console.warn("Stats file not found, returning default stats.");
            return {
                totalSubmissions: 0,
                sumOfPercentages: 0,
                averagePercentage: 0,
                completionRate: 0
            };
        });

        const statsArray = [stats];

        const parser = new Parser();
        const csv = parser.parse(statsArray);

        // Set headers for file download
        res.header("Content-Type", "text/csv");
        res.attachment("quiz_stats.csv"); // New file name
        res.send(csv); 
    } catch (err) {
        console.error("Error reading quiz stats:", err);
        res.status(500).json({ status: "error", message: "Failed to retrieve quiz statistics." });
    }
});

app.post("/save-click", async (req, res) => {
    try {
        const clicksData = await fs.readJson(clicksFile).catch(() => ({ totalClicks: 0 }));
        clicksData.totalClicks += 1;
        await fs.writeJson(clicksFile, clicksData, { spaces: 2 });
        const stats = await fs.readJson(statsFile).catch(() => ({ totalSubmissions: 0, completionRate: 0 }));
        const totalSubmissionsCount = stats.totalSubmissions;
        const totalClicks = clicksData.totalClicks;
        stats.completionRate = totalClicks > 0 
             ? (totalSubmissionsCount / totalClicks) * 100
             : 0;
        await fs.writeJson(statsFile, stats, { spaces: 2});

        res.json({ status: "success", totalClicks: clicksData.totalClicks, completionRate: stats.completionRate });
    } catch (err) {
        console.error("Error saving click:", err);
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.post("/submit-quiz", async (req, res) => {
  try {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ status: "error", message: "No data provided" });
    }

    const submissions = await fs.readJson(submissionsFile).catch(() => []);
    const stats = await fs.readJson(statsFile).catch(() => ({ totalSubmissions: 0, sumOfPercentages: 0, averagePercentage: 0, completionRate: 0 }));
    const submissionIndex = submissions.length;

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

    submissions.push(newSubmission);
    await fs.writeJson(submissionsFile, submissions, { spaces: 2 });

    stats.totalSubmissions += 1;
    stats.sumOfPercentages += newSubmission.percentage;
    stats.averagePercentage = stats.sumOfPercentages / stats.totalSubmissions;

    const clicksData = await fs.readJson(clicksFile).catch(() => ({ totalClicks: 0 }));
    const totalSubmissionsCount = stats.totalSubmissions;
    const totalClicks = clicksData.totalClicks;
    stats.completionRate = totalClicks > 0 
        ? (totalSubmissionsCount / totalClicks) * 100
        : 0;

    await fs.writeJson(statsFile, stats, { spaces: 2});

    res.json({
      status: "success",
      totalSubmissions: stats.totalSubmissions,
      averagePercentage: stats.averagePercentage,
      completionRate: stats.completionRate
    });
  } catch (err) {
    console.error("Error submitting quiz:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});