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
  start_time INTEGER NOT NULL, -- unix timestamp
  end_time INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('BUSY','SWAPPABLE','SWAP_PENDING')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS swap_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL, -- user who initiated
  requestee_id TEXT NOT NULL,  -- user who owns the target slot
  my_slot_id TEXT NOT NULL,    -- slot offered by requester
  their_slot_id TEXT NOT NULL, -- slot requested from requestee
  status TEXT NOT NULL CHECK(status IN ('PENDING','ACCEPTED','REJECTED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(requester_id) REFERENCES users(id),
  FOREIGN KEY(requestee_id) REFERENCES users(id),
  FOREIGN KEY(my_slot_id) REFERENCES events(id),
  FOREIGN KEY(their_slot_id) REFERENCES events(id)
);
