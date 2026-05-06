import type { Request, Response, NextFunction } from "express";
import AuthService from "../service/service.auth.js";

class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            if (!email  || !password) {
                return res.status(400).json({ success: false, message: "Email and password required" });
            }
            
            const token = await AuthService.register(email, password);
            return res.status(201).json({ success: true, token });
        } catch (error: any) {

            if (error.message === "Email already in use" ) {
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
 
}

export default new AuthController;