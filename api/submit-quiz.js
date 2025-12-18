// api/submit-quiz.js
import { sql, initDatabase } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  await initDatabase();

  const data = req.body;
  if (!data) {
    return res.status(400).json({ status: 'error', message: 'No data provided' });
  }

  const visitorID = data.visitorID || `anon-${Math.floor(Math.random() * 1000000)}`;

  try {
    await sql`
      INSERT INTO quiz_submissions 
        (visitor_id, score, percentage, question1, question2, question3, question4)
      VALUES 
        (${visitorID}, ${data.score}, ${data.percentage},
         ${data.question1}, ${data.question2}, ${data.question3}, ${data.question4})
    `;

    const stats = await sql`
      SELECT 
        COUNT(*) as total_submissions,
        AVG(percentage) as average_percentage
      FROM quiz_submissions
    `;

    const clicks = await sql`SELECT total_clicks FROM quiz_clicks WHERE id = 1`;
    const totalClicks = parseInt(clicks[0]?.total_clicks || 0, 10);
    const totalSubmissions = parseInt(stats[0]?.total_submissions || 0, 10);
    const averagePercentage = parseFloat(stats[0]?.average_percentage || 0);
    const completionRate = totalClicks > 0 ? (totalSubmissions / totalClicks) * 100 : 0;

    return res.status(200).json({
      status: 'success',
      totalSubmissions,
      averagePercentage: averagePercentage.toFixed(2),
      completionRate: completionRate.toFixed(2)
    });
  } catch (err) {
    console.error('Error submitting quiz:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}