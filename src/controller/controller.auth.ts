import type { Request, Response, NextFunction } from "express";
import AuthService from "../service/service.auth.js";

class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ success: false, message: "Email and password required" });
            }

            await AuthService.register(email, password);
            return res.status(200).json({
                success: true,
                message: "OTP sent to your email. Please verify to complete registration.",
            });
        } catch (error: any) {
            if (error.message === "Email already in use") {
                return res.status(409).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    async verifyEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, code } = req.body;
            if (!email || !code) {
                return res.status(400).json({ success: false, message: "Email and OTP code required" });
            }

            const token = await AuthService.verifyEmail(email, code);
            return res.status(200).json({ success: true, token });
        } catch (error: any) {
            if (error.message === "Invalid or expired OTP") {
                return res.status(400).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    async loginByEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ success: false, message: "Email and password required" });
            }

            const token = await AuthService.loginByEmail(email, password);
            return res.status(200).json({ success: true, token });
        } catch (error: any) {
            if (error.message === "No such user" || error.message === "Wrong password") {
                return res.status(401).json({ success: false, message: "Invalid email or password" });
            }
            if (error.message === "Please sign in with Google") {
                return res.status(400).json({ success: false, message: error.message });
            }
            next(error);
        }
    }
    async googleAuth(req: Request, res: Response, next: NextFunction) {
        try {
            const url = await AuthService.getGoogleAuthUrl();
            return res.redirect(url);
        } catch (error) {
            next(error);
        }
    }

    async googleCallback(req: Request, res: Response, next: NextFunction) {
        try {
            const { code } = req.query;
            if (!code || typeof code !== "string") {
                return res.status(400).json({ success: false, message: "Missing Google auth code" });
            }

            const token = await AuthService.handleGoogleCallback(code);

            // Redirect to frontend with JWT in query param
            return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController;