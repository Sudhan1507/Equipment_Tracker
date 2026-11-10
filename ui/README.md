# Equipment Checkout — React.js API-connected prototype

## Run
```bash
npm install
npm run dev
```

Backend base URL: `http://localhost:5000`. The Axios client uses `withCredentials: true`; API calls use the exact `/api/...` paths supplied for this prototype.

## Cookie authentication
- `POST /api/auth/login` sends credentials and expects the backend to set the JWT as an `HttpOnly` cookie.
- `GET /api/auth/me` is called on app startup and after login to retrieve the current user information and role.
- The frontend never reads or stores the JWT in localStorage.
- No logout endpoint was provided, so logout clears React user state only. For a fully reliable logout, add a backend endpoint that clears the cookie.

## API integration
- `GET /api/equipment`
- `POST /api/equipment`
- `PUT /api/equipment/:id`
- `DELETE /api/equipment/:id`
- `POST /api/requests`
- `GET /api/requests/mine`
- `GET /api/requests`
- `PATCH /api/requests/:id/approve`
- `PATCH /api/requests/:id/reject`
- `PATCH /api/requests/:id/return`

## Backend configuration needed
Because frontend and API use different ports, configure Express CORS with the exact Vite origin (typically `http://localhost:5173`) and `credentials: true`. Cookie settings must permit this local setup (typically `sameSite: "lax"` for same-site localhost and `httpOnly: true`; do not set `secure: true` on plain local HTTP). Do not use `localhost` in one place and `127.0.0.1` in the other, as cookie behavior can differ.

## Notes
The API contract for request creation is assumed as `{ equipment_id, quantity, reason }`; align it to your backend controller if its field names differ. Equipment form uses `{ equipment_name, description, total_quantity }`. Response parsers accept common `{ data: [...] }`, `{ equipment: [...] }`, or array response formats; adjust as needed to match your exact API response. Demo role buttons are local-only previews and do not authenticate with the server.
