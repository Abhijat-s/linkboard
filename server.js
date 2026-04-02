const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure db directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

// Init DB
const db = new Database(path.join(dbDir, 'links.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    author TEXT DEFAULT 'Anonymous',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET all links
app.get('/api/links', (req, res) => {
  const links = db.prepare('SELECT * FROM links ORDER BY created_at DESC').all();
  res.json(links);
});

// POST new link
app.post('/api/links', (req, res) => {
  const { title, url, description, author } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'Title and URL are required' });

  // Basic URL validation
  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

  const result = db.prepare(
    'INSERT INTO links (title, url, description, author) VALUES (?, ?, ?, ?)'
  ).run(title, url.trim(), description || '', author || 'Anonymous');

  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(link);
});

// DELETE a link
app.delete('/api/links/:id', (req, res) => {
  db.prepare('DELETE FROM links WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`LinkBoard running on port ${PORT}`));
