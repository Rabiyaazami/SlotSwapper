require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
// const bcrypt = require('bcrypt');
const bcrypt = require('bcryptjs');

const sqlite3 = require("sqlite3").verbose();
// const db = new sqlite3.Database("database.db");


const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const DB_FILE = process.env.DB_FILE || './slotswapper.db';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const PORT = process.env.PORT || 4000;

const db = new Database(DB_FILE);
const app = express();
app.use(express.json());
app.use(cors());

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
  const { name, email, password } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  try {
    const stmt = db.prepare('INSERT INTO users (id,name,email,password_hash) VALUES (?,?,?,?)');
    stmt.run(id, name, email, hash);
    const token = signToken({ id, email, name });
    res.json({ token, user: { id, name, email } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already in use' });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
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
app.listen(PORT, () => {
  console.log('Server listening on', PORT);
});
