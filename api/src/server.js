require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const authRoutes = require("./routes/auth.routes");
const equipmentRoutes = require("./routes/equipment.routes");
const requestRoutes = require("./routes/requests.routes");
const cookieParser = require("cookie-parser");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", async (_, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/requests", requestRoutes);

app.use((_, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, _, res, next) => {
  if (res.headersSent) return next(err);

  // MariaDB/MySQL constraint and duplicate-key errors
  if (err.code === "ER_DUP_ENTRY") {
    return res
      .status(409)
      .json({ message: "A record with this value already exists" });
  }
  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    return res
      .status(400)
      .json({ message: "Referenced user or equipment does not exist" });
  }
  if (err.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(409).json({
      message: "Cannot delete this record because it has related records",
    });
  }

  const status = Number(err.status) || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 ? "Internal server error" : err.message,
  });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => {
  console.log(`Equipment Checkout API listening on port ${port}`);
});
