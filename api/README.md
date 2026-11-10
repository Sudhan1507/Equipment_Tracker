# Equipment Checkout API

Node.js + Express + MariaDB/MySQL backend for the Equipment Checkout task.

## 1. Requirements

- Node.js 18+
- MariaDB 10.4+ or MySQL
- Your `equipment_checkout` database and the three tables from your finalized schema

## 2. Setup

```bash
npm install
```

Copy `.env.example` to `.env`, then set the database credentials and a long random `JWT_SECRET`.

Example:
```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=replace_this_with_a_long_random_secret
JWT_EXPIRES_IN=8h
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=equipment_checkout
```

## 3. Create users

Create a supervisor:
```bash
node scripts/create-user.js supervisor supervisor@example.com "StrongPassword123" "Super" "Visor"
```

Create a technician:
```bash
node scripts/create-user.js technician technician@example.com "StrongPassword123" "Tech" "Nician"
```

This script hashes passwords with bcrypt. Do not store plaintext passwords.

## 4. Run

```bash
npm run dev
```

Health check: `GET http://localhost:5000/api/health`

## 5. API endpoints

All routes except `POST /api/auth/login` and `GET /api/health` require:
`Authorization: Bearer <token>`

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Any authenticated user | Current user |
| GET | `/api/equipment` | Both | List equipment and stock |
| GET | `/api/equipment/:id` | Both | Equipment details |
| POST | `/api/equipment` | Supervisor | Create equipment |
| PUT | `/api/equipment/:id` | Supervisor | Update equipment |
| DELETE | `/api/equipment/:id` | Supervisor | Delete equipment without request history |
| POST | `/api/requests` | Technician | Create request |
| GET | `/api/requests/mine` | Technician | List own requests |
| GET | `/api/requests` | Supervisor | List all requests |
| PATCH | `/api/requests/:id/approve` | Supervisor | Approve and decrement stock |
| PATCH | `/api/requests/:id/reject` | Supervisor | Reject; stock unchanged |
| PATCH | `/api/requests/:id/return` | Supervisor | Record a full or partial return |

## 6. Example request bodies

Login:
```json
{ "email": "tech@example.com", "password": "StrongPassword123" }
```

Create equipment:
```json
{ "equipment_name": "Laptop", "total_quantity": 10 }
```

Update equipment:
```json
{ "equipment_name": "Laptop", "total_quantity": 12 }
```

Create request:
```json
{ "equipment_id": "PASTE-EQUIPMENT-UUID", "requested_quantity": 2 }
```

Return two units:
```json
{ "quantity": 2 }
```

## 7. Business rules implemented

- Server-side JWT authentication and role-based authorization.
- Inactive accounts cannot log in or use existing tokens.
- Positive integer validation for quantities.
- Requests cannot exceed stock at submission time.
- Stock is decremented only on approval, inside a transaction with row locks.
- Approval only works for PENDING requests and cannot be repeated.
- Rejections do not change stock.
- Returns can be partial; returning more than the outstanding quantity is rejected.
- Equipment total quantity cannot be reduced below currently checked-out quantity.
- Equipment with request history cannot be deleted due to foreign-key restrictions.

## Notes

- This is a focused interview-task MVP, not a fully hardened production service.
- For production, add rate limiting, request validation schemas, audit logging, pagination, automated tests, and a refresh-token/session strategy.
- Ensure your actual database schema includes `created_by` and nullable `updated_by` on `equipment_master`, plus the foreign keys described in your schema.
