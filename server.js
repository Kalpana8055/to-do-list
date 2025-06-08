const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Import Pool
const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL Connection Pool
const pool = new Pool({
    user: process.env.DB_USER || 'user',
    host: process.env.DB_HOST || 'localhost', // 'postgres' when running in Docker Compose
    database: process.env.DB_NAME || 'tasks_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

// Test DB connection
pool.connect((err, client, done) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Successfully connected to PostgreSQL database!');
    client.release();
});

app.use(cors());
app.use(express.json());

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:5001'; // 'http://embedding-service:5001' in Docker Compose

// Function to get embedding from Python service
const getEmbedding = async (text) => {
    try {
        console.log(`Requesting embedding for text: "${text}" from ${EMBEDDING_SERVICE_URL}/embed`);
        const response = await fetch(`${EMBEDDING_SERVICE_URL}/embed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Embedding service error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        return data.embedding;
    } catch (error) {
        console.error("Error getting embedding:", error.message);
        throw new Error("Failed to generate embedding"); // Re-throw a generic error
    }
};

// GET all tasks
app.get('/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, title, description, status FROM tasks ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// POST a new task
app.post('/tasks', async (req, res) => {
    const { title, description, status } = req.body;
    if (!title || !description || !status) {
        return res.status(400).json({ message: 'Title, description, and status are required' });
    }

    try {
        const embedding = await getEmbedding(description); // Get embedding for description
        const result = await pool.query(
            'INSERT INTO tasks(title, description, status, embedding) VALUES($1, $2, $3, $4) RETURNING id, title, description, status',
            [title, description, status, JSON.stringify(embedding)] // pgvector expects array as string
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding task:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// PUT (update) an existing task
app.put('/tasks/:id', async (req, res) => {
    const taskId = parseInt(req.params.id);
    const { title, description, status } = req.body;

    let updateFields = [];
    let queryParams = [taskId];
    let queryIndex = 2;
    let embedding = null;

    if (title) {
        updateFields.push(`title = $${queryIndex++}`);
        queryParams.push(title);
    }
    if (status) {
        updateFields.push(`status = $${queryIndex++}`);
        queryParams.push(status);
    }
    // If description is updated, generate new embedding
    if (description) {
        updateFields.push(`description = $${queryIndex++}`);
        queryParams.push(description);
        try {
            embedding = await getEmbedding(description);
            updateFields.push(`embedding = $${queryIndex++}`);
            queryParams.push(JSON.stringify(embedding)); // pgvector expects array as string
        } catch (err) {
            console.warn(`Could not generate embedding for updated description: ${err.message}`);
            // Decide how to handle this: fail the request, or update without embedding?
            // For now, we'll continue without updating the embedding if it fails
        }
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    try {
        const result = await pool.query(
            `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $1 RETURNING id, title, description, status`,
            queryParams
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// DELETE a task
app.delete('/tasks/:id', async (req, res) => {
    const taskId = parseInt(req.params.id);
    try {
        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [taskId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }
        res.status(204).send();
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Vector Search Endpoint
app.get('/tasks/search', async (req, res) => {
    const queryText = req.query.q;
    if (!queryText) {
        return res.status(400).json({ message: 'Query parameter "q" is required for search' });
    }

    try {
        const queryEmbedding = await getEmbedding(queryText);
        // Using L2 distance (<->) for similarity search
        const result = await pool.query(
            `SELECT id, title, description, status, embedding <-> $1 AS distance
             FROM tasks
             ORDER BY distance ASC
             LIMIT 3`,
            [JSON.stringify(queryEmbedding)] // pgvector expects array as string
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error performing vector search:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
