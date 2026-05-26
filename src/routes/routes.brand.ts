import { Router } from "express";
import GenerationController from "../controller/controller.brand.js";
import multer from "multer";
import { verifyPayment } from "../middleware/middleware.verify.js";
import { verifyToken } from "../middleware/middleware.auth.js";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPEG, and WebP images are allowed."));
  },
});
const router = Router();




router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    logoGenerationEnabled: !!process.env.HF_TOKEN,
  });
});
router.post("/text",verifyToken ,upload.single("logo"), GenerationController.fromText);

router.post("/logo",verifyToken  ,upload.single("logo"), GenerationController.fromLogo);

router.post("/prompt",verifyToken , upload.single("logo"), GenerationController.fromPrompt);
router.get("/history", verifyToken, GenerationController.getHistory);
router.get('/book/:id', verifyToken, GenerationController.getBrandBook);
router.post('/edit/:id', verifyToken, GenerationController.editBrandBook);

export default router