require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const DB_FILE = process.env.DB_FILE || './slotswapper.db';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const PORT = process.env.PORT || 4000;

// Initialize database if it doesn't exist or tables don't exist
const db = new Database(DB_FILE);

// Check if tables exist, if not, create them
try {
  const userTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!userTable) {
    console.log('Initializing database...');
    const migrations = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');
    db.exec(migrations);
    console.log('Database initialized successfully');
  }
} catch (error) {
  console.error('Database initialization error:', error);
  // If migrations.sql doesn't exist, create tables directly
  try {
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        title TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('BUSY','SWAPPABLE','SWAP_PENDING')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS swap_requests (
        id TEXT PRIMARY KEY,
        requester_id TEXT NOT NULL,
        requestee_id TEXT NOT NULL,
        my_slot_id TEXT NOT NULL,
        their_slot_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('PENDING','ACCEPTED','REJECTED')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(requester_id) REFERENCES users(id),
        FOREIGN KEY(requestee_id) REFERENCES users(id),
        FOREIGN KEY(my_slot_id) REFERENCES events(id),
        FOREIGN KEY(their_slot_id) REFERENCES events(id)
      );
    `);
    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating database tables:', err);
  }
}
const app = express();

// CORS configuration - allow requests from frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', timestamp: new Date().toISOString() });
});

// --- Auth helpers ---
function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = h.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// --- Auth endpoints ---
app.post('/api/signup', async (req, res) => {
  try {
    console.log('Signup request received:', { name: req.body.name, email: req.body.email });
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    try {
      const stmt = db.prepare('INSERT INTO users (id,name,email,password_hash) VALUES (?,?,?,?)');
      stmt.run(id, name, email, hash);
      const token = signToken({ id, email, name });
      console.log('Signup successful for:', email);
      res.json({ token, user: { id, name, email } });
    } catch (dbError) {
      console.error('Database error during signup:', dbError);
      if (dbError.message && dbError.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      res.status(500).json({ error: 'Database error: ' + dbError.message });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    console.log('Login request received for:', req.body.email);
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      console.log('Login failed: Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken(user);
    console.log('Login successful for:', email);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// --- Events CRUD (protected) ---
app.get('/api/events', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM events WHERE owner_id = ? ORDER BY start_time').all(req.user.id);
  res.json(rows);
});

app.post('/api/events', authMiddleware, (req, res) => {
  const { title, startTime, endTime, status } = req.body;
  if (!title || !startTime || !endTime) return res.status(400).json({ error: 'Missing fields' });
  const id = uuidv4();
  const s = status || 'BUSY';
  db.prepare('INSERT INTO events (id, owner_id, title, start_time, end_time, status) VALUES (?,?,?,?,?,?)')
    .run(id, req.user.id, title, startTime, endTime, s);
  const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  res.json(ev);
});

app.put('/api/events/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  if (existing.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your event' });
  const { title, startTime, endTime, status } = req.body;
  db.prepare(`UPDATE events SET title = COALESCE(?, title), start_time = COALESCE(?, start_time),
    end_time = COALESCE(?, end_time), status = COALESCE(?, status) WHERE id = ?`)
    .run(title, startTime, endTime, status, id);
  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  res.json(updated);
});

app.delete('/api/events/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Event not found' });
  if (existing.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your event' });
  db.prepare('DELETE FROM events WHERE id = ?').run(id);
  res.json({ ok: true });
});

// --- GET /api/swappable-slots (other users' slots that are SWAPPABLE) ---
app.get('/api/swappable-slots', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT e.*, u.name AS owner_name 
    FROM events e 
    JOIN users u ON e.owner_id = u.id 
    WHERE e.status = ? AND e.owner_id != ? 
    ORDER BY e.start_time
  `).all('SWAPPABLE', req.user.id);
  res.json(rows);
});

// --- POST /api/swap-request ---
app.post('/api/swap-request', authMiddleware, (req, res) => {
  const { mySlotId, theirSlotId } = req.body;
  if (!mySlotId || !theirSlotId) return res.status(400).json({ error: 'Missing slot ids' });

  // Validate: mySlot must belong to requester and be SWAPPABLE
  const mySlot = db.prepare('SELECT * FROM events WHERE id = ?').get(mySlotId);
  const theirSlot = db.prepare('SELECT * FROM events WHERE id = ?').get(theirSlotId);
  if (!mySlot || !theirSlot) return res.status(404).json({ error: 'Slot not found' });
  if (mySlot.owner_id !== req.user.id) return res.status(403).json({ error: 'mySlot not owned by you' });
  if (mySlot.status !== 'SWAPPABLE') return res.status(400).json({ error: 'mySlot not SWAPPABLE' });
  if (theirSlot.status !== 'SWAPPABLE') return res.status(400).json({ error: 'theirSlot not SWAPPABLE' });
  if (theirSlot.owner_id === req.user.id) return res.status(400).json({ error: 'Cannot request your own slot' });

  // Create swap request and set both slots to SWAP_PENDING
  const id = uuidv4();
  const insert = db.prepare(`INSERT INTO swap_requests (id, requester_id, requestee_id, my_slot_id, their_slot_id, status)
    VALUES (?,?,?,?,?,?)`);
  const updateSlot = db.prepare('UPDATE events SET status = ? WHERE id = ?');

  const tx = db.transaction(() => {
    insert.run(id, req.user.id, theirSlot.owner_id, mySlotId, theirSlotId, 'PENDING');
    updateSlot.run('SWAP_PENDING', mySlotId);
    updateSlot.run('SWAP_PENDING', theirSlotId);
  });

  try {
    tx();
    const reqRow = db.prepare('SELECT * FROM swap_requests WHERE id = ?').get(id);
    res.json(reqRow);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not create swap request' });
  }
});

// --- POST /api/swap-response/:requestId ---
app.post('/api/swap-response/:requestId', authMiddleware, (req, res) => {
  const requestId = req.params.requestId;
  const { accept } = req.body; // boolean
  if (typeof accept !== 'boolean') return res.status(400).json({ error: 'accept must be boolean' });

  const swapReq = db.prepare('SELECT * FROM swap_requests WHERE id = ?').get(requestId);
  if (!swapReq) return res.status(404).json({ error: 'SwapRequest not found' });

  // Only the requestee (owner of their_slot) may accept/reject
  if (swapReq.requestee_id !== req.user.id) return res.status(403).json({ error: 'Not authorized to respond' });

  const mySlot = db.prepare('SELECT * FROM events WHERE id = ?').get(swapReq.my_slot_id);
  const theirSlot = db.prepare('SELECT * FROM events WHERE id = ?').get(swapReq.their_slot_id);
  if (!mySlot || !theirSlot) return res.status(500).json({ error: 'Slots missing' });

  // If accept = false => set swap_req REJECTED and set event statuses back to SWAPPABLE
  if (!accept) {
    const tx = db.transaction(() => {
      db.prepare('UPDATE swap_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('REJECTED', requestId);
      db.prepare('UPDATE events SET status = ? WHERE id IN (?,?)').run('SWAPPABLE', mySlot.id, theirSlot.id);
    });
    tx();
    return res.json({ status: 'REJECTED' });
  }

  // Accept => we must swap owner_id of the two events and set their status back to BUSY
  const txAccept = db.transaction(() => {
    // Mark swap request accepted
    db.prepare('UPDATE swap_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('ACCEPTED', requestId);

    // Swap owners
    const ownerA = mySlot.owner_id;    // original requester
    const ownerB = theirSlot.owner_id; // original requestee

    // Use temporary owner id to swap
    const tempOwner = uuidv4(); // unique placeholder not in users table
    db.prepare('UPDATE events SET owner_id = ? WHERE id = ?').run(tempOwner, mySlot.id);
    db.prepare('UPDATE events SET owner_id = ? WHERE id = ?').run(ownerA, theirSlot.id);
    db.prepare('UPDATE events SET owner_id = ? WHERE id = ?').run(ownerB, mySlot.id);

    // Set statuses back to BUSY
    db.prepare('UPDATE events SET status = ? WHERE id IN (?,?)').run('BUSY', mySlot.id, theirSlot.id);
  });

  try {
    txAccept();
    return res.json({ status: 'ACCEPTED' });
  } catch (e) {
    console.error('Accept transaction failed', e);
    // best-effort rollback handled by better-sqlite3 transaction
    return res.status(500).json({ error: 'Transaction failed' });
  }
});

// --- Requests listing (incoming & outgoing) ---
app.get('/api/swap-requests', authMiddleware, (req, res) => {
  // incoming = where requestee_id == me
  const incoming = db.prepare(`
    SELECT sr.*, u1.name AS requester_name, u2.name AS requestee_name,
           e1.title AS my_slot_title, e1.start_time AS my_slot_start, e1.end_time AS my_slot_end,
           e2.title AS their_slot_title, e2.start_time AS their_slot_start, e2.end_time AS their_slot_end
    FROM swap_requests sr 
    JOIN users u1 ON u1.id = sr.requester_id 
    JOIN users u2 ON u2.id = sr.requestee_id
    JOIN events e1 ON e1.id = sr.my_slot_id
    JOIN events e2 ON e2.id = sr.their_slot_id
    WHERE sr.requestee_id = ? 
    ORDER BY sr.created_at DESC
  `).all(req.user.id);
  
  const outgoing = db.prepare(`
    SELECT sr.*, u1.name AS requester_name, u2.name AS requestee_name,
           e1.title AS my_slot_title, e1.start_time AS my_slot_start, e1.end_time AS my_slot_end,
           e2.title AS their_slot_title, e2.start_time AS their_slot_start, e2.end_time AS their_slot_end
    FROM swap_requests sr 
    JOIN users u1 ON u1.id = sr.requester_id 
    JOIN users u2 ON u2.id = sr.requestee_id
    JOIN events e1 ON e1.id = sr.my_slot_id
    JOIN events e2 ON e2.id = sr.their_slot_id
    WHERE sr.requester_id = ? 
    ORDER BY sr.created_at DESC
  `).all(req.user.id);
  
  res.json({ incoming, outgoing });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// --- server start ---
const server = app.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 SlotSwapper Backend Server`);
  console.log(`✅ Server listening on http://localhost:${PORT}`);
  console.log(`🌐 Also accessible at http://127.0.0.1:${PORT}`);
  console.log(`📦 Database: ${DB_FILE}`);
  console.log('=================================');
  console.log('Testing health endpoint...');
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error('Please stop the other process or change the PORT in .env');
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
