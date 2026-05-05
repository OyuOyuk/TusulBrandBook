import { type Request, type Response, type NextFunction } from "express"
import pool from "../db/client.js";


export const verifyPayment = async(req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId
    const result = await pool.query("SELECT has_paid FROM users WHERE id = $1", [userId]); 

    if (result.rows[0]?.has_paid !== true) {
        res.status(403).json({ success: false, message: "Please purchase to generate" });
        return;
    }
    next();
}