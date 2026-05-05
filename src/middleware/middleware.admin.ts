import { type Request, type Response, type NextFunction } from "express";

export const verifyAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role !== "admin") {
        res.status(403).json({ success: false, message: "Admins only" });
        return;
    }
    next();
};