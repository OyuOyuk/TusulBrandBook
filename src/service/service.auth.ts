import jwt from "jsonwebtoken";
import pool from "../db/client.js";
import bcrypt from "bcrypt";

const saltRounds = 10;

class AuthService {
    async register(email: string, password: string) {
        const existingEmail = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existingEmail.rows.length > 0) throw new Error("Email already in use");
       
        const password_hash = await bcrypt.hash(password, saltRounds);
        const result = await pool.query(
            "INSERT INTO users(email, password_hash) VALUES ($1, $2) RETURNING id, email, role",
            [email, password_hash]
        );
        const user = result.rows[0];
        return this.signToken(user.id, user.email, user.role);
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
            { userId,  email , role },
            process.env.JWT_SECRET!,
            { expiresIn: process.env.JWT_EXPIRES_IN as any}
        );
    }
}

export default new AuthService;