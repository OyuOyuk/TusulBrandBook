import { Router } from "express";
import BrandRouter from "./routes.brand.js"
import AuthRouter from "./routes.auth.js"
import AdminRouter from "./routes.admin.js"
const router = Router();

router.use("/brand", BrandRouter )
router.use("/auth",  AuthRouter)
router.use("/admin", AdminRouter);


export default router