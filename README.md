# Link Manager API

A robust REST API for the Link Manager application — your personal public link hub.  
Built with Node.js, Express, MongoDB (Mongoose), and JWT authentication.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, CLOUDINARY credentials

# 3. Start development server
npm run dev

# 4. API is available at
http://localhost:5000/api
```

---

## Project Structure

```
src/
├── config/
│   ├── db.js              # MongoDB connection
│   └── cloudinary.js      # Cloudinary + multer setup
├── controllers/
│   ├── authController.js  # Register, login, logout, me
│   ├── linkController.js  # Link CRUD, reorder, analytics
│   └── userController.js  # Public profile, avatar, dashboard
├── middleware/
│   ├── auth.js            # JWT protect & optionalAuth
│   ├── errorHandler.js    # Global error handler
│   ├── rateLimiter.js     # 3-tier rate limiting
│   └── validators.js      # express-validator rules
├── models/
│   ├── User.js            # User schema
│   └── Link.js            # Link schema + click events
├── routes/
│   ├── authRoutes.js
│   ├── linkRoutes.js
│   └── userRoutes.js
├── utils/
│   ├── AppError.js        # Custom error class
│   ├── catchAsync.js      # Async error wrapper
│   └── jwt.js             # Sign & send JWT
├── app.js                 # Express app config
└── server.js              # Entry point
```

---

## API Reference

### Health Check
| Method | Endpoint       | Description        |
|--------|----------------|--------------------|
| GET    | /api/health    | API status check   |

---

### Auth — `/api/auth`
| Method | Endpoint                    | Auth | Description               |
|--------|-----------------------------|------|---------------------------|
| POST   | /api/auth/register          | —    | Create new account        |
| POST   | /api/auth/login             | —    | Login, sets httpOnly cookie|
| POST   | /api/auth/logout            | —    | Clear auth cookie         |
| GET    | /api/auth/me                | ✅   | Get current user          |
| PATCH  | /api/auth/update-password   | ✅   | Change password           |
| GET    | /api/auth/check-username/:u | —    | Check username availability|

**Register body:**
```json
{
  "username": "himal",
  "email": "himal@example.com",
  "password": "Password123",
  "displayName": "Himal"
}
```

**Login body:**
```json
{
  "email": "himal@example.com",
  "password": "Password123"
}
```

---

### Links — `/api/links`
| Method | Endpoint                  | Auth | Description                    |
|--------|---------------------------|------|--------------------------------|
| GET    | /api/links                | ✅   | Get all my links               |
| POST   | /api/links                | ✅   | Create a new link              |
| GET    | /api/links/:id            | ✅   | Get a single link              |
| PATCH  | /api/links/:id            | ✅   | Update a link                  |
| DELETE | /api/links/:id            | ✅   | Delete a link                  |
| PATCH  | /api/links/reorder        | ✅   | Bulk reorder links             |
| GET    | /api/links/:id/analytics  | ✅   | Get click analytics for a link |
| POST   | /api/links/:id/click      | —    | Record a click (public)        |

**Create link body:**
```json
{
  "title": "My GitHub",
  "url": "https://github.com/himal",
  "isActive": true
}
```

**Reorder body:**
```json
{
  "links": [
    { "id": "64a...", "order": 0 },
    { "id": "64b...", "order": 1 },
    { "id": "64c...", "order": 2 }
  ]
}
```

---

### Users — `/api/users`
| Method | Endpoint                    | Auth | Description                      |
|--------|-----------------------------|------|----------------------------------|
| GET    | /api/users/:username        | —    | Public profile + active links    |
| GET    | /api/users/dashboard/stats  | ✅   | Dashboard stats (clicks, counts) |
| PATCH  | /api/users/profile          | ✅   | Update display name & bio        |
| PATCH  | /api/users/avatar           | ✅   | Upload avatar image (multipart)  |
| DELETE | /api/users/avatar           | ✅   | Remove avatar                    |
| DELETE | /api/users/account          | ✅   | Delete account + all links       |

**Update profile body:**
```json
{
  "displayName": "Himal Sharma",
  "bio": "Developer & creator"
}
```

**Avatar upload:** `multipart/form-data` with field name `avatar` (max 3MB, images only)

---

## Response Format

All responses follow a consistent shape:

**Success:**
```json
{
  "status": "success",
  "data": { ... }
}
```

**Error:**
```json
{
  "status": "fail",
  "message": "Descriptive error message"
}
```

---

## Rate Limits

| Tier    | Applies to              | Limit              |
|---------|-------------------------|--------------------|
| Auth    | /register, /login       | 10 req / hour      |
| Public  | click tracking, profiles| 60 req / minute    |
| General | all other /api routes   | 100 req / 15 min   |

---

## Environment Variables

| Variable                  | Required | Description                        |
|---------------------------|----------|------------------------------------|
| PORT                      | —        | Server port (default: 5000)        |
| NODE_ENV                  | ✅       | development / production           |
| MONGO_URI                 | ✅       | MongoDB connection string          |
| JWT_SECRET                | ✅       | Strong random secret               |
| JWT_EXPIRES_IN            | ✅       | e.g. `7d`                          |
| JWT_COOKIE_EXPIRES_IN     | ✅       | Days as number e.g. `7`            |
| CLOUDINARY_CLOUD_NAME     | ✅       | Cloudinary account name            |
| CLOUDINARY_API_KEY        | ✅       | Cloudinary API key                 |
| CLOUDINARY_API_SECRET     | ✅       | Cloudinary API secret              |
| CLIENT_URL                | ✅       | Frontend URL for CORS              |
