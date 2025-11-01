# SlotSwapper

A peer-to-peer time-slot scheduling application that allows users to swap busy calendar slots with other users.

## Overview

SlotSwapper is a full-stack web application where users can:
- Create and manage calendar events
- Mark events as "swappable" to make them available for trading
- Browse other users' swappable time slots in a marketplace
- Request to swap their slot for another user's slot
- Accept or reject incoming swap requests
- Track both incoming and outgoing swap requests

When a swap is accepted, both users' calendars are automatically updated—User A now has User B's slot, and vice versa.

## Design Choices

### Technology Stack
- **Frontend:** React 19 with modern hooks
- **Backend:** Node.js/Express with monolithic server architecture
- **Database:** SQLite with better-sqlite3 (file-based, perfect for deployment)
- **Authentication:** JWT tokens with bcrypt password hashing
- **API Communication:** JSON over HTTP with Bearer token authentication

### Key Design Decisions

1. **SQLite over MongoDB:** Chosen for simplicity, zero configuration, and file-based storage that's perfect for single-server deployment. No separate database server needed.

2. **Monolithic server.js:** All backend routes consolidated in one file for simplicity and easier debugging. Perfect for MVP scale.

3. **UUID Primary Keys:** Avoid sequential ID issues, work well across distributed systems, and provide better security.

4. **Atomic Swap Transaction:** Uses a three-step UPDATE with temporary UUID to ensure data integrity during owner exchange. Prevents race conditions.

5. **Status-Based State Machine:** Events have clear states (BUSY → SWAPPABLE → SWAP_PENDING → BUSY) that make the swap flow intuitive.

6. **Transaction-Based Operations:** All critical operations (request, accept, reject) use database transactions for ACID compliance.

## Features

### User Authentication
-  Sign up with name, email, and password
-  Secure login with JWT tokens
-  Password hashing with bcrypt (10 rounds)
-  Auto-login on page refresh
-  Protected routes requiring authentication

### Event Management
-  Create calendar events with title, start time, and end time
-  View all your events in a list format
-  Toggle events between BUSY and SWAPPABLE status
-  Update and delete your own events
-  Ownership validation on all operations

### Swap Marketplace
-  Browse all available swappable slots from other users
-  Filter out your own slots from marketplace
-  Select your swappable slot as an offer
-  Choose target slot from marketplace
-  Send swap request with single click

### Swap Management
-  View incoming swap requests (from other users)
-  View outgoing swap requests (your sent requests)
-  Accept swap requests (atomic owner exchange)
-  Reject swap requests (slots return to swappable)
-  Real-time status updates

### Core Swap Logic
-  Validation: Both slots must be SWAPPABLE
-  Lock: Both slots set to SWAP_PENDING during request
-  Reject: Slots return to SWAPPABLE status
-  Accept: Owners swapped, both slots set to BUSY
-  Transaction safety: All-or-nothing operations

## ScreenShot
**WEB-** **Mobile-**
<img width="1880" height="747" alt="image" src="https://github.com/user-attachments/assets/1ecd363d-926f-422b-947d-eed30680fd63" />
<img width="1885" height="857" alt="image" src="https://github.com/user-attachments/assets/b0472510-3950-43dd-8793-c609a9063395" />

<img width="396" height="776" alt="image" src="https://github.com/user-attachments/assets/bebbecd2-2d3a-45ef-bb44-223b8fcf092b" />
<img width="392" height="733" alt="image" src="https://github.com/user-attachments/assets/d007ddba-8555-4212-9067-5d94bc1b9bc2" />


## Getting Started

### Prerequisites

- Node.js 14+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd slotswapper
   ```

2. **Set up backend**
   ```bash
   cd backend
   npm install
   ```

3. **Initialize database**
   ```bash
   npm run init-db
   ```
   This creates `slotswapper.db` with the schema.

4. **Set up frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

1. **Start backend server**
   ```bash
   cd backend
   npm start
   ```
   Server runs on `http://localhost:4000`

2. **Start frontend development server**
   ```bash
   cd frontend
   npm start
   ```
   Opens at `http://localhost:3000`

### Environment Variables (Optional)

Create a `.env` file in the `backend` directory:

```env
DB_FILE=./slotswapper.db
JWT_SECRET=your-secret-key-change-in-production
PORT=4000
```

Defaults work for local development.

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/signup` | Create new user account | No |
| POST | `/api/login` | Log in existing user | No |

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Events Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/events` | Get all your events | Yes |
| POST | `/api/events` | Create new event | Yes |
| PUT | `/api/events/:id` | Update event | Yes |
| DELETE | `/api/events/:id` | Delete event | Yes |

**Create Event Request:**
```json
{
  "title": "Team Meeting",
  "startTime": 1704110400,
  "endTime": 1704114000,
  "status": "BUSY"
}
```
*Times are Unix timestamps in seconds*

**Update Event:**
```json
{
  "status": "SWAPPABLE"
}
```

### Swap Operations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/swappable-slots` | Get all swappable slots from other users | Yes |
| POST | `/api/swap-request` | Request a swap | Yes |
| POST | `/api/swap-response/:requestId` | Accept or reject swap | Yes |
| GET | `/api/swap-requests` | Get incoming and outgoing requests | Yes |

**Request Swap:**
```json
{
  "mySlotId": "slot-uuid-1",
  "theirSlotId": "slot-uuid-2"
}
```

**Respond to Swap:**
```json
{
  "accept": true
}
```

**Get Swap Requests Response:**
```json
{
  "incoming": [
    {
      "id": "request-uuid",
      "requester_name": "John Doe",
      "requestee_name": "Jane Smith",
      "my_slot_id": "slot-1",
      "their_slot_id": "slot-2",
      "status": "PENDING",
      "created_at": "2024-01-01 10:00:00"
    }
  ],
  "outgoing": [...]
}
```

### User Info

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/me` | Get current user info | Yes |

**Response:**
```json
{
  "id": "user-uuid",
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Authentication Header

All protected endpoints require Bearer token:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Database Schema

### Users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Events
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('BUSY','SWAPPABLE','SWAP_PENDING')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Swap Requests
```sql
CREATE TABLE swap_requests (
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
```

## Frontend Structure

```
frontend/src/
├── App.js              # Main app with routing logic
├── api.js              # API helper with Bearer token handling
├── styles.css          # Global styles
├── components/
│   ├── Login.js        # Login form
│   ├── Signup.js       # Signup form
│   ├── Dashboard.js    # Event management
│   ├── Marketplace.js  # Browse and request swaps
│   └── Requests.js     # View and respond to swap requests
```

## Security Features

- JWT token-based authentication
- bcrypt password hashing (10 rounds)
- SQL injection protection (parameterized queries)
- CORS enabled for frontend
- Authorization checks on all protected routes
- Ownership validation before modifications

## Testing

### Manual Testing Flow

1. **Create accounts:**
   - Sign up as User A
   - Sign up as User B

2. **Create events:**
   - User A: Create "Team Meeting" on Tuesday 10am (make swappable)
   - User B: Create "Focus Block" on Wednesday 2pm (make swappable)

3. **Request swap:**
   - Login as User A
   - Go to Marketplace
   - See User B's slot
   - Select your Tuesday slot as offer
   - Click "Request Swap"

4. **Accept swap:**
   - Login as User B
   - Go to Requests
   - See incoming request from User A
   - Click "Accept"
   - Verify calendars are swapped

## Assumptions

1. **Timestamps:** All times are stored as Unix timestamps (seconds since epoch)
2. **Timezone:** Application assumes local timezone of the server
3. **Duration:** No validation for minimum event duration
4. **Overlaps:** No validation for overlapping events for same user
5. **Concurrency:** Single swap per slot at a time (enforced by SWAP_PENDING status)

## Known Limitations

1. No timezone handling across different regions
2. No event duration validation
3. No conflict detection for overlapping events
4. No pagination for large event lists
5. No search/filter functionality
6. Basic error messages (could be more user-friendly)
7. No email notifications for swap requests
8. Owner names shown as UUIDs in some views (can be improved with JOINs)

## Acknowledgments

Built with:
- React
- Express.js
- SQLite
- JWT
- bcrypt
