import { Router } from "express";
import BrandRouter from "./routes.brand.js"
import AuthRouter from "./routes.auth.js"
import AdminRouter from "./routes.admin.js"
import GroqFunctions from "../groq.js"
const router = Router();

router.use("/brand", BrandRouter )
router.use("/auth",  AuthRouter)
router.use("/admin", AdminRouter);
router.get("/test-fast", async (_req, res) => {
  try {
    const result = await GroqFunctions.askGroq(
      `Return ONLY this JSON: { "test": "ok" }`,
      "llama-3.1-8b-instant"
    );
    res.json({ success: true, result });
  } catch (err) {
    res.json({ success: false, error: String(err) });
  }
});

export default router