import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(connectionString);

export async function initDatabase() {
  // Submissions table
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

  // Clicks table
  await sql`
    CREATE TABLE IF NOT EXISTS quiz_clicks (
      id SERIAL PRIMARY KEY,
      total_clicks INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Ensure row exists
  const clicks = await sql`SELECT * FROM quiz_clicks LIMIT 1`;
  if (clicks.length === 0) {
    await sql`INSERT INTO quiz_clicks (total_clicks) VALUES (0)`;
  }
}