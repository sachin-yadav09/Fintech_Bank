## Fintech Bank Frontend

### Requirements
- Node.js + npm

### Setup
1. Create a `.env` file from the example:
   - Copy `.env.example` → `.env`
2. Install dependencies:
   - `npm install`
3. Run the dev server:
   - `npm run dev`

### Build
- `npm run build`
- `npm run preview`

### Environment variables
- **`VITE_API_URL`**: Backend API base URL (dev often `http://127.0.0.1:8000/api/v1/`)
- **`VITE_STRIPE_PUBLISHABLE_KEY`**: Stripe publishable key (safe to expose to browser)
- **`VITE_BASE_PATH`**: Optional base path for serving the app under a subpath (used by Vite `base`)