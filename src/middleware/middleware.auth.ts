import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string;  email: string; role: string };
    }
  }
}

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];
    if (!token) {
        res.status(401).json({ success: false, message: "No token provided" });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
        req.user = decoded as { userId: string; email: string; role: string };
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: "Invalid token" });
    }
};