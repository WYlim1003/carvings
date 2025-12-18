// api/save-click.js
import { sql, initDatabase } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  await initDatabase();

  try {
    await sql`
      UPDATE quiz_clicks 
      SET total_clicks = total_clicks + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `;

    const clicksResult = await sql`SELECT total_clicks FROM quiz_clicks WHERE id = 1`;
    const totalClicks = parseInt(clicksResult[0]?.total_clicks || 0, 10);

    const submissionsResult = await sql`SELECT COUNT(*) as count FROM quiz_submissions`;
    const totalSubmissions = parseInt(submissionsResult[0]?.count || 0, 10);

    const completionRate = totalClicks > 0 ? (totalSubmissions / totalClicks) * 100 : 0;

    return res.status(200).json({
      status: 'success',
      totalClicks,
      completionRate: completionRate.toFixed(2)
    });
  } catch (err) {
    console.error('Error saving click:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}