// api/export/submissions.js
import { sql, initDatabase } from '../../lib/db.js';
import { Parser } from 'json2csv';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  await initDatabase();

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

    if (submissions.length === 0) {
      return res.status(200).send('No submission data available yet. Submit a quiz first.');
    }

    const parser = new Parser();
    const csv = parser.parse(submissions);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="quiz_submissions.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    console.error('Error exporting submissions:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to export data.', error: err.message });
  }
}