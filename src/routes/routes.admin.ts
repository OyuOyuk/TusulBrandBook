import { Router } from "express";
import { verifyToken } from "../middleware/middleware.auth.js";
import { verifyAdmin } from "../middleware/middleware.admin.js";
import pool from "../db/client.js";

const router = Router();


router.post("/grant-access", verifyToken, verifyAdmin, async (req, res) => {
    const { userId } = req.body;
    await pool.query("UPDATE users SET has_paid = true WHERE id = $1", [userId]);
    res.json({ success: true });
});

export default router