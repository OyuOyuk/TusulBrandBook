import { Router } from "express";
import controllerAuth from "../controller/controller.auth.js";


const router = Router();

router.post("/register",  controllerAuth.register);
router.post("/verify-email", controllerAuth.verifyEmail);

router.post("/loginByEmail", controllerAuth.loginByEmail);
router.get("/auth/google", controllerAuth.googleAuth);
router.get("/auth/google/callback", controllerAuth.googleCallback);
export default router;