# Lexora

Lexora is a modern English dictionary and vocabulary-learning web application featuring clean typography, resilient audio pronunciation, persistent user accounts, and a signature Lavender Claymorphism design.

## Features

- **Instant Dictionary Search:** Look up word definitions, phonetics, parts of speech, examples, synonyms, and antonyms with resilient pronunciation audio and native speech fallback.
- **Persistent User Accounts:** Secure authentication with HttpOnly cookies, session management, and encrypted password hashing.
- **Saved Favorites:** Save and manage favorite words with real-time cloud synchronization to MongoDB Atlas.
- **Search History:** Automatic recents tracking with deduplication, per-user isolation, and one-click removal.
- **Word of the Day:** Deterministic daily curated vocabulary with background cache and definitions.
- **Vocabulary Practice Quiz:** Interactive practice modal with multiple-choice questions to test word knowledge.
- **Lavender Claymorphism UI:** Soft, tactile claymorphic components with smooth transitions and full Light / Dark theme support.

## Architecture & Tech Stack

- **Frontend:** React, Vite, Lucide Icons, Pure CSS Claymorphism Design System.
- **Backend:** Node.js, Express, Mongoose, Zod validation, Helmet security headers, Express Rate Limiter.
- **Database:** MongoDB Atlas with TTL word cache and indexed collections.
- **Deployment:** Vercel (Frontend SPA) + Render (Backend Web Service).

## Project Structure

```
Lexora/
├── backend/                # Node.js + Express REST API
│   ├── config/             # Environment loader and database connection
│   ├── controllers/        # Route controllers (auth, dictionary, user, system)
│   ├── middleware/         # Security, CSRF, auth guard, rate limiters
│   ├── models/             # Mongoose schemas (User, Favorite, History, Cache, DailyWord)
│   ├── routes/             # Express API routes
│   ├── services/           # Dictionary upstream proxy & daily word logic
│   └── test/               # Automated unit & integration tests
├── frontend/               # React + Vite client
│   ├── public/             # Static icons and favicon
│   ├── src/                # UI components, pages, hooks, services, and styles
│   └── test/               # Frontend unit & integration tests
├── .gitignore              # Git ignore rules for secrets and build artifacts
└── README.md               # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB Atlas cluster or local MongoDB instance

### 1. Clone the repository

```bash
git clone https://github.com/Ehtesham-27/Lexora.git
cd Lexora
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Configure your `.env` with your MongoDB URI, JWT secret, and port:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/lexora?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_min_32_characters
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
npm start
```

### 3. Frontend Setup

In a separate terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

Configure `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the frontend development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Testing

Run backend tests:
```bash
cd backend && npm test
```

Run frontend tests:
```bash
cd frontend && npm test
```

## License

MIT
