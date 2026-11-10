const express = require("express");
const { randomUUID } = require("crypto");
const pool = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const { asyncHandler, httpError } = require("../utils/http");

const router = express.Router();
router.use(authenticate);

function positiveInt(value, field) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw httpError(400, `${field} must be a positive integer`);
  }
  return n;
}

// POST /api/requests — technician only
router.post(
  "/",
  authorize("TECHNICIAN"),
  asyncHandler(async (req, res) => {
    const equipmentId = String(req.body.equipment_id || "");
    const quantity = positiveInt(req.body.quantity, "requested_quantity");

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [equipmentRows] = await conn.execute(
        `SELECT id, equipment_name, available_quantity
       FROM equipment_master WHERE id = ? FOR UPDATE`,
        [equipmentId],
      );
      if (!equipmentRows.length) throw httpError(404, "Equipment not found");

      if (quantity > equipmentRows[0].available_quantity) {
        throw httpError(
          400,
          `Only ${equipmentRows[0].available_quantity} unit(s) currently available`,
        );
      }

      const id = randomUUID();
      await conn.execute(
        `INSERT INTO equipment_requests
       (id, technician_id, equipment_id, requested_quantity, approved_quantity,
        returned_quantity, req_status, created_by)
       VALUES (?, ?, ?, ?, 0, 0, 'PENDING', ?)`,
        [id, req.user.id, equipmentId, quantity, req.user.id],
      );

      await conn.commit();
      res.status(201).json({
        message: "Equipment request submitted",
        request: {
          id,
          technician_id: req.user.id,
          equipment_id: equipmentId,
          requested_quantity: quantity,
          approved_quantity: 0,
          returned_quantity: 0,
          req_status: "PENDING",
        },
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }),
);

// GET /api/requests/mine — technician's own requests
router.get(
  "/mine",
  authorize("TECHNICIAN"),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT r.id, r.technician_id, r.equipment_id, e.equipment_name,
            r.requested_quantity, r.approved_quantity, r.returned_quantity,
            r.req_status, r.created_at, r.updated_at
     FROM equipment_requests r
     JOIN equipment_master e ON e.id = r.equipment_id
     WHERE r.technician_id = ?
     ORDER BY r.created_at DESC`,
      [req.user.id],
    );
    res.json({ requests: rows });
  }),
);

// GET /api/requests — supervisor sees all requests
router.get(
  "/",
  authorize("SUPERVISOR"),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT r.id, r.technician_id, u.user_name, u.fname, u.lname, u.email,
            r.equipment_id, e.equipment_name, r.requested_quantity,
            r.approved_quantity, r.returned_quantity, r.req_status,
            r.created_at, r.updated_at
     FROM equipment_requests r
     JOIN user_master u ON u.id = r.technician_id
     JOIN equipment_master e ON e.id = r.equipment_id
     ORDER BY r.created_at DESC`,
    );
    res.json({ requests: rows });
  }),
);

// PATCH /api/requests/:id/approve — supervisor only
router.patch(
  "/:id/approve",
  authorize("SUPERVISOR"),
  asyncHandler(async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [requests] = await conn.execute(
        `SELECT id, equipment_id, requested_quantity, req_status
       FROM equipment_requests WHERE id = ? FOR UPDATE`,
        [req.params.id],
      );
      if (!requests.length) throw httpError(404, "Request not found");
      const request = requests[0];
      if (request.req_status !== "PENDING") {
        throw httpError(
          409,
          `Only PENDING requests can be approved (current status: ${request.req_status})`,
        );
      }

      const [equipmentRows] = await conn.execute(
        `SELECT available_quantity FROM equipment_master WHERE id = ? FOR UPDATE`,
        [request.equipment_id],
      );
      if (!equipmentRows.length) throw httpError(404, "Equipment not found");
      const available = equipmentRows[0].available_quantity;
      if (request.requested_quantity > available) {
        throw httpError(
          409,
          `Insufficient stock. Only ${available} unit(s) available`,
        );
      }

      await conn.execute(
        `UPDATE equipment_master
       SET available_quantity = available_quantity - ?
       WHERE id = ?`,
        [request.requested_quantity, request.equipment_id],
      );
      await conn.execute(
        `UPDATE equipment_requests
       SET approved_quantity = requested_quantity, req_status = 'APPROVED'
       WHERE id = ?`,
        [req.params.id],
      );

      await conn.commit();
      res.json({ message: "Request approved and stock updated" });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }),
);

// PATCH /api/requests/:id/reject — supervisor only
router.patch(
  "/:id/reject",
  authorize("SUPERVISOR"),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      "SELECT req_status FROM equipment_requests WHERE id = ?",
      [req.params.id],
    );
    if (!rows.length) throw httpError(404, "Request not found");
    if (rows[0].req_status !== "PENDING") {
      throw httpError(
        409,
        `Only PENDING requests can be rejected (current status: ${rows[0].req_status})`,
      );
    }

    const [result] = await pool.execute(
      `UPDATE equipment_requests SET req_status = 'REJECTED'
     WHERE id = ? AND req_status = 'PENDING'`,
      [req.params.id],
    );
    if (!result.affectedRows)
      throw httpError(409, "Request status changed; refresh and try again");
    res.json({ message: "Request rejected; stock was not changed" });
  }),
);

// PATCH /api/requests/:id/return — supervisor only; supports partial returns
// Body: { "quantity": 2 }
router.patch(
  "/:id/return",
  authorize("SUPERVISOR"),
  asyncHandler(async (req, res) => {
    const quantity = positiveInt(req.body.quantity, "quantity");
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        `SELECT id, equipment_id, approved_quantity, returned_quantity, req_status
       FROM equipment_requests WHERE id = ? FOR UPDATE`,
        [req.params.id],
      );
      if (!rows.length) throw httpError(404, "Request not found");
      const request = rows[0];

      if (request.req_status !== "APPROVED") {
        throw httpError(409, "Only APPROVED requests can be returned");
      }

      const outstanding = request.approved_quantity - request.returned_quantity;
      if (quantity > outstanding) {
        throw httpError(
          400,
          `Cannot return ${quantity}; only ${outstanding} unit(s) remain outstanding`,
        );
      }

      const [equipmentRows] = await conn.execute(
        `SELECT total_quantity, available_quantity
       FROM equipment_master WHERE id = ? FOR UPDATE`,
        [request.equipment_id],
      );
      if (!equipmentRows.length) throw httpError(404, "Equipment not found");

      const newAvailable = equipmentRows[0].available_quantity + quantity;
      if (newAvailable > equipmentRows[0].total_quantity) {
        throw httpError(409, "Return would exceed total equipment quantity");
      }

      const newReturned = request.returned_quantity + quantity;
      const newStatus =
        newReturned === request.approved_quantity ? "RETURNED" : "APPROVED";

      await conn.execute(
        "UPDATE equipment_master SET available_quantity = ? WHERE id = ?",
        [newAvailable, request.equipment_id],
      );
      await conn.execute(
        `UPDATE equipment_requests
       SET returned_quantity = ?, req_status = ?
       WHERE id = ?`,
        [newReturned, newStatus, req.params.id],
      );

      await conn.commit();
      res.json({
        message: "Equipment return recorded",
        returned_quantity: newReturned,
        outstanding_quantity: request.approved_quantity - newReturned,
        req_status: newStatus,
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }),
);

module.exports = router;
