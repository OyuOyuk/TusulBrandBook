import { Router } from "express";
import controllerAuth from "../controller/controller.auth.js";


const router = Router();

router.post("/register",  controllerAuth.register);
router.post("/loginByEmail", controllerAuth.loginByEmail);

export default router;