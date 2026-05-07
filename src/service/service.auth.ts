import jwt from "jsonwebtoken";
import pool from "../db/client.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendOtpEmail } from "../utils/mailer.js";

const saltRounds = 10;
const OTP_EXPIRY_MINUTES = 10;

class AuthService {
    private generateOtp(): string {
        return crypto.randomInt(100000, 999999).toString();
    }

    async register(email: string, password: string) {
        // Check if already a real user
        const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existing.rows.length > 0) throw new Error("Email already in use");

        // Invalidate any previous pending OTPs for this email
        await pool.query("UPDATE pending_otps SET used = TRUE WHERE email = $1", [email]);

        const password_hash = await bcrypt.hash(password, saltRounds);
        const code = this.generateOtp();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES* 60 * 1000);

        await pool.query(
            "INSERT INTO pending_otps(email, password_hash, code, expires_at) VALUES ($1, $2, $3, $4)",
            [email, password_hash, code, expiresAt]
        );

        await sendOtpEmail(email, code);
    }

    async verifyEmail(email: string, code: string) {
        const otpResult = await pool.query(
            `SELECT id, password_hash FROM pending_otps
            WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
            ORDER BY expires_at DESC LIMIT 1`,
            [email, code]
        );

        if (otpResult.rows.length === 0) throw new Error("Invalid or expired OTP");

        const { id: otpId, password_hash } = otpResult.rows[0];

        // Mark OTP used and create user in a transaction
        await pool.query("BEGIN");
        try {
            await pool.query("UPDATE pending_otps SET used = TRUE WHERE id = $1", [otpId]);
            const result = await pool.query(
                "INSERT INTO users(email, password_hash) VALUES ($1, $2) RETURNING id, email, role",
                [email, password_hash]
            );
            await pool.query("COMMIT");

            const user = result.rows[0];
            return this.signToken(user.id, user.email, user.role);
        } catch (err) {
            await pool.query("ROLLBACK");
            throw err;
        }
    }

    async loginByEmail(email: string, password: string) {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) throw new Error("No such user");

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) throw new Error("Wrong password");

        return this.signToken(user.id, user.email, user.role);
    }

    private signToken(userId: string, email: string, role: string) {
        return jwt.sign(
            { userId, email, role },
            process.env.JWT_SECRET!,
            { expiresIn: process.env.JWT_EXPIRES_IN as any }
        );
    }
    async cleanExpiredOtps() {
        await pool.query(
            "DELETE FROM otps WHERE used = TRUE OR expires_at < NOW()"
    );
}
}

export default new AuthService;