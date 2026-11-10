const express = require("express");
const { randomUUID } = require("crypto");
const pool = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const { asyncHandler, httpError } = require("../utils/http");

const router = express.Router();
router.use(authenticate);

function parsePositiveInt(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw httpError(400, `${field} must be a positive integer`);
  }
  return number;
}

// GET /api/equipment — both roles
router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, equipment_name, total_quantity, available_quantity,
            created_at, updated_at, created_by, updated_by
     FROM equipment_master ORDER BY equipment_name ASC`
  );
  res.json({ equipment: rows });
}));

// GET /api/equipment/:id — both roles
router.get("/:id", asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, equipment_name, total_quantity, available_quantity,
            created_at, updated_at, created_by, updated_by
     FROM equipment_master WHERE id = ? LIMIT 1`,
    [req.params.id]
  );
  if (!rows.length) throw httpError(404, "Equipment not found");
  res.json({ equipment: rows[0] });
}));

// POST /api/equipment — supervisor only
router.post("/", authorize("SUPERVISOR"), asyncHandler(async (req, res) => {
  const equipmentName = String(req.body.equipment_name || "").trim();
  if (!equipmentName) throw httpError(400, "equipment_name is required");
  if (equipmentName.length > 100) throw httpError(400, "equipment_name must be at most 100 characters");

  const totalQuantity = parsePositiveInt(req.body.total_quantity, "total_quantity");
  const id = randomUUID();

  await pool.execute(
    `INSERT INTO equipment_master
       (id, equipment_name, total_quantity, available_quantity, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, equipmentName, totalQuantity, totalQuantity, req.user.id, req.user.id]
  );

  res.status(201).json({
    message: "Equipment created",
    equipment: {
      id,
      equipment_name: equipmentName,
      total_quantity: totalQuantity,
      available_quantity: totalQuantity
    }
  });
}));

// PUT /api/equipment/:id — supervisor only; preserves currently checked-out quantity
router.put("/:id", authorize("SUPERVISOR"), asyncHandler(async (req, res) => {
  const equipmentName = String(req.body.equipment_name || "").trim();
  if (!equipmentName) throw httpError(400, "equipment_name is required");
  if (equipmentName.length > 100) throw httpError(400, "equipment_name must be at most 100 characters");
  const totalQuantity = parsePositiveInt(req.body.total_quantity, "total_quantity");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT total_quantity, available_quantity
       FROM equipment_master WHERE id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!rows.length) throw httpError(404, "Equipment not found");

    const currentlyCheckedOut = rows[0].total_quantity - rows[0].available_quantity;
    if (totalQuantity < currentlyCheckedOut) {
      throw httpError(400, `total_quantity cannot be less than checked-out quantity (${currentlyCheckedOut})`);
    }

    const availableQuantity = totalQuantity - currentlyCheckedOut;
    await conn.execute(
      `UPDATE equipment_master
       SET equipment_name = ?, total_quantity = ?, available_quantity = ?, updated_by = ?
       WHERE id = ?`,
      [equipmentName, totalQuantity, availableQuantity, req.user.id, req.params.id]
    );

    await conn.commit();
    res.json({
      message: "Equipment updated",
      equipment: {
        id: req.params.id,
        equipment_name: equipmentName,
        total_quantity: totalQuantity,
        available_quantity: availableQuantity
      }
    });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

// DELETE /api/equipment/:id — supervisor only; FK prevents deleting equipment with request history
router.delete("/:id", authorize("SUPERVISOR"), asyncHandler(async (req, res) => {
  const [result] = await pool.execute(
    "DELETE FROM equipment_master WHERE id = ?",
    [req.params.id]
  );
  if (!result.affectedRows) throw httpError(404, "Equipment not found");
  res.json({ message: "Equipment deleted" });
}));

module.exports = router;
