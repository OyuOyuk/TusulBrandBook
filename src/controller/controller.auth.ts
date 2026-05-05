import type { Request, Response, NextFunction } from "express";
import AuthService from "../service/service.auth.js";

class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { email,username, password } = req.body;
            if (!email || !username || !password) {
                return res.status(400).json({ success: false, message: "Email and password required" });
            }
            
            const token = await AuthService.register(email,username, password);
            return res.status(201).json({ success: true, token });
        } catch (error: any) {

            if (error.message === "Email already in use" || error.message === "Username already in use") {
                return res.status(409).json({ success: false, message: error.message });
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
            next(error);
        }
    }
    async loginByName(req: Request, res: Response, next: NextFunction) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ success: false, message: "Email and password required" });
            }
            const token = await AuthService.loginByName(username, password);
            return res.status(200).json({ success: true, token });
        } catch (error: any) {
            if (error.message === "No such user" || error.message === "Wrong password") {
                return res.status(401).json({ success: false, message: "Invalid email or password" });
            }
            next(error);
        }
    }
}

export default new AuthController;