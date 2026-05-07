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

        // Google-only account, no password set
        if (!user.password_hash) throw new Error("Please sign in with Google");

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
    async getGoogleAuthUrl() {
        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
            response_type: "code",
            scope: "email profile",
            access_type: "offline",
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    async handleGoogleCallback(code: string) {
        // Step 1: Exchange code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
                grant_type: "authorization_code",
            }),
        });

        const tokens = await tokenRes.json();
        if (!tokenRes.ok) throw new Error("Failed to exchange Google code for tokens");

        // Step 2: Get user info from Google
        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const googleUser = await userRes.json();
        if (!userRes.ok) throw new Error("Failed to fetch Google user info");

        const { id: googleId, email } = googleUser;

        // Step 3: Find existing user by google_id or email
        const existing = await pool.query(
            "SELECT * FROM users WHERE google_id = $1 OR email = $2",
            [googleId, email]
        );

        let user;

        if (existing.rows.length > 0) {
            user = existing.rows[0];

            // Link google_id if they previously registered with email
            if (!user.google_id) {
                await pool.query("UPDATE users SET google_id = $1 WHERE id = $2", [googleId, user.id]);
            }
        } else {
            // Brand new user — create them without a password
            const result = await pool.query(
                "INSERT INTO users(email, google_id) VALUES ($1, $2) RETURNING id, email, role",
                [email, googleId]
            );
            user = result.rows[0];
        }

        return this.signToken(user.id, user.email, user.role);
    }
}

export default new AuthService;