const { Client } = require('pg');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        return { statusCode: 500, body: 'Database connection not configured.' };
    }

    let client;
    try {
        const data = JSON.parse(event.body);
        const { visitorID, score, q1, q2, q3, q4 } = data; 
        
        if (!visitorID || score === undefined || !q1 || !q2 || !q3 || !q4) {
             return { statusCode: 400, body: JSON.stringify({ error: 'Missing required quiz data.' }) };
        }
        
        client = new Client({
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false } 
        });
        await client.connect();

        const query = `
            INSERT INTO submissions (visitor_id, score, question1, question2, question3, question4)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        const values = [visitorID, score, q1, q2, q3, q4];

        await client.query(query, values);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Submission saved to Neon successfully!' }),
        };

    } catch (error) {
        console.error('Database Insertion Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to save submission due to a server error.' }),
        };
    } finally {
        if (client) {
            await client.end();
        }
    }
};