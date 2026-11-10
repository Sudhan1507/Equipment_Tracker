const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { asyncHandler, httpError } = require("../utils/http");

const router = express.Router();

// POST /api/auth/login

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      throw httpError(400, "Email and password are required");
    }

    if (!process.env.JWT_SECRET) {
      throw httpError(500, "JWT_SECRET is not configured");
    }

    const [rows] = await pool.execute(
      `SELECT id, user_name, fname, lname, email,
              password_hash, role_type, is_active
       FROM user_master
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    const user = rows[0];

    if (
      !user ||
      !user.is_active ||
      !(await bcrypt.compare(password, user?.password_hash || ""))
    ) {
      throw httpError(401, "Invalid email or password");
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role_type },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
    );

    // Set JWT as an HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/",
    });

    // Do not return the JWT in the JSON response
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        user_name: user.user_name,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        role_type: user.role_type,
      },
    });
  }),
);

// GET /api/auth/me
router.get("/me", require("../middleware/auth").authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
