const jwt = require("jsonwebtoken");
const pool = require("../db");
const { httpError } = require("../utils/http");

async function authenticate(req, res, next) {
  try {
    // Read JWT from HttpOnly cookie first.
    // Support Bearer tokens for compatibility if needed.
    const cookieToken = req.cookies?.token;

    const header = req.headers.authorization || "";
    const [scheme, bearerToken] = header.split(" ");

    const token = cookieToken || (scheme === "Bearer" ? bearerToken : null);

    if (!token) {
      throw httpError(401, "Authentication token is required");
    }

    if (!process.env.JWT_SECRET) {
      throw httpError(500, "JWT_SECRET is not configured");
    }

    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw httpError(401, "Invalid or expired token");
    }

    const [rows] = await pool.execute(
      `SELECT id, user_name, fname, lname, email, role_type, is_active
       FROM user_master
       WHERE id = ?
       LIMIT 1`,
      [payload.sub],
    );

    if (!rows.length || !rows[0].is_active) {
      throw httpError(401, "User account is inactive or does not exist");
    }

    req.user = rows[0];

    next();
  } catch (error) {
    next(error);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(httpError(401, "Authentication required"));
    }

    if (!roles.includes(req.user.role_type)) {
      return next(
        httpError(403, "You do not have permission to perform this action"),
      );
    }

    next();
  };
}

module.exports = { authenticate, authorize };
