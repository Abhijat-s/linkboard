const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db', 'links.db');

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let db;
const initSqlJs = require('sql.js');

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  db.run(`CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    author TEXT DEFAULT 'Anonymous',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  saveDB();
}

function saveDB() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function allRows(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/links', (req, res) => {
  res.json(allRows('SELECT * FROM links ORDER BY created_at DESC'));
});

app.post('/api/links', (req, res) => {
  const { title, url, description, author } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'Title and URL are required' });
  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }
  db.run('INSERT INTO links (title, url, description, author) VALUES (?, ?, ?, ?)',
    [title, url.trim(), description || '', author || 'Anonymous']);
  saveDB();
  res.status(201).json(allRows('SELECT * FROM links ORDER BY id DESC LIMIT 1')[0]);
});

app.delete('/api/links/:id', (req, res) => {
  db.run('DELETE FROM links WHERE id = ?', [Number(req.params.id)]);
  saveDB();
  res.json({ success: true });
});

initDB().then(() => app.listen(PORT, () => console.log(`LinkBoard running on port ${PORT}`)));
