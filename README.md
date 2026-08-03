# Student Management System (Full-Stack — Week 2)

A full-stack Student Management System built with:
- **Frontend:** HTML, CSS, JavaScript (vanilla, connects to backend via `fetch`)
- **Backend:** Node.js + Express.js (REST API)
- **Database:** MongoDB (Mongoose ODM)

Implements full **CRUD** (Create, Read, Update, Delete) for student records.

---

## Project Structure

```
student-management-system/
├── backend/
│   ├── models/
│   │   └── Student.js        # Mongoose schema
│   ├── routes/
│   │   └── studentRoutes.js  # REST API routes (CRUD)
│   ├── server.js             # Express app entry point
│   ├── package.json
│   └── .env.example          # Copy to .env and edit
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js              # Calls the REST API with fetch()
```

The backend also serves the `frontend` folder as static files, so the whole
app runs from a single server on one port — no separate frontend server or
CORS setup needed for local use.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ installed
- MongoDB running locally, **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

---

## Setup & Run

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` and set your `MONGO_URI` (local MongoDB or Atlas connection string).

### 3. Start MongoDB (if running locally)
```bash
mongod
```

### 4. Start the server
```bash
npm start
# or, for auto-reload during development:
npm run dev
```

### 5. Open the app
Visit **http://localhost:5000** in your browser. The frontend loads
automatically and talks to the API at `/api/students`.

---

## REST API Reference

| Method | Endpoint              | Description                          |
|--------|------------------------|---------------------------------------|
| GET    | `/api/students`        | Get all students (supports `?search=`) |
| GET    | `/api/students/:id`    | Get a single student by ID            |
| POST   | `/api/students`        | Create a new student                  |
| PUT    | `/api/students/:id`    | Update an existing student            |
| DELETE | `/api/students/:id`    | Delete a student                      |
| GET    | `/api/health`          | API health check                      |

### Example: Create a student
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priya Sharma",
    "email": "priya@example.com",
    "rollNumber": "CS2026-001",
    "course": "B.Tech CSE",
    "age": 20,
    "phone": "9876543210"
  }'
```

### Student data model
| Field          | Type   | Required | Notes                    |
|----------------|--------|----------|---------------------------|
| name           | String | Yes      |                            |
| email          | String | Yes      | Must be unique             |
| rollNumber     | String | Yes      | Must be unique             |
| course         | String | Yes      |                            |
| age            | Number | No       | 10–100                     |
| phone          | String | No       |                            |
| address        | String | No       |                            |
| enrollmentDate | Date   | No       | Defaults to creation time  |

---

## Features

- Full CRUD via REST API
- Server-side validation (required fields, unique email/roll number, email format)
- Live search/filter by name, roll number, or course
- Clean, responsive UI with inline edit and delete confirmation
- Centralized error handling with meaningful JSON error messages

## Using MySQL instead of MongoDB

The task description allows either database. This build uses MongoDB with
Mongoose because it maps naturally to a single `Student` document. If you'd
rather use MySQL, swap `models/Student.js` and the Mongoose calls in
`routes/studentRoutes.js` for a MySQL table + a client such as `mysql2` — the
routes, request/response shapes, and frontend won't need to change.

## Optional: React frontend

The task also allows React.js for the frontend. The current frontend is
plain HTML/CSS/JS calling the same REST endpoints, so it can be swapped for
a React app (e.g. with `axios` or `fetch` in `useEffect`) without changing
the backend at all — each API call in `script.js` maps directly to a React
data-fetching hook.
