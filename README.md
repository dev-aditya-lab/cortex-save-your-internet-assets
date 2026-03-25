# Cortex - Personal Knowledge Management

Save, organize, search, and rediscover anything from the internet.

## Features
- **Save anything** - articles, tweets, YouTube videos, images, PDFs
- **AI tagging** - auto-generated tags via Groq API
- **Semantic search** - find content by meaning, not just keywords
- **Knowledge graph** - visualize connections between saved items
- **Collections** - organize items into groups
- **Highlights & notes** - annotate saved content
- **Memory resurfacing** - rediscover old saves
- **Browser extension** - save pages with one click

## Setup

### 1. Backend
```bash
cd server
npm install
# Create .env with MONGODB_URI and GROQ_API_KEY
npm run dev
```

### 2. Frontend
```bash
cd client
npm install
npm run dev
```

### 3. Browser Extension
1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` folder
4. Click the Cortex icon on any page to save it

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express + MongoDB + Groq API
- **Extension**: Chrome Manifest V3
- **Graph**: react-force-graph-2d
- **Embeddings**: LLM-generated via Groq (in-memory cosine similarity)

## API Routes
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/items | Save new item |
| GET | /api/items | List all items |
| GET | /api/items/:id | Get single item |
| DELETE | /api/items/:id | Delete item |
| PATCH | /api/items/:id | Update item |
| GET | /api/items/:id/related | Get related items |
| POST | /api/items/:id/highlights | Add highlight |
| DELETE | /api/items/:id/highlights/:hid | Remove highlight |
| POST | /api/collections | Create collection |
| GET | /api/collections | List collections |
| GET | /api/collections/:id | Get collection + items |
| PUT | /api/collections/:id | Update collection |
| DELETE | /api/collections/:id | Delete collection |
| GET | /api/search?q= | Semantic search |
| GET | /api/resurface | Memory resurfacing |
| GET | /api/graph | Knowledge graph data |
