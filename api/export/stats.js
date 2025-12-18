// api/export/stats.js
import { sql, initDatabase } from '../../lib/db.js';
import { Parser } from 'json2csv';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  await initDatabase();

  try {
    const submissionStats = await sql`
      SELECT 
        COUNT(*) as total_submissions,
        AVG(percentage) as average_percentage
      FROM quiz_submissions
    `;

    const clicksData = await sql`SELECT total_clicks FROM quiz_clicks LIMIT 1`;

    const totalSubmissions = parseInt(submissionStats[0]?.total_submissions || 0, 10);
    const averagePercentage = parseFloat(submissionStats[0]?.average_percentage || 0);
    const totalClicks = parseInt(clicksData[0]?.total_clicks || 0, 10);
    const completionRate = totalClicks > 0 ? (totalSubmissions / totalClicks) * 100 : 0;

    const statsData = [{
      totalSubmissions,
      averagePercentage: averagePercentage.toFixed(2),
      totalClicks,
      completionRate: completionRate.toFixed(2)
    }];

    const parser = new Parser();
    const csv = parser.parse(statsData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="quiz_stats.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    console.error('Error exporting stats:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to export stats.', error: err.message });
  }
}