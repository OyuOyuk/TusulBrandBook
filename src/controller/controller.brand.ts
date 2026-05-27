import type { Router, Request, Response } from "express";
import GenerationService from "../service/service.brand.js";
import multer from "multer";
import { error } from "node:console";
import { SSEEvent } from "../middleware/middleware.sse.js";
import type { TextBrandInput, LogoBrandInput, QuickBrandInput } from "../types/index.js";
import serviceBrand from "../service/service.brand.js";
import e from "cors";

function extractImage(req: Request): { imageBase64: string; mimeType: LogoBrandInput["mimeType"] } | undefined {
  if (!req.file) return undefined;
  return {
    imageBase64: req.file.buffer.toString("base64"),
    mimeType: req.file.mimetype as LogoBrandInput["mimeType"],
  };
}
class GenerationController{
    async fromText( req: Request, res: Response){
        try{
            let { companyName, industry, values, audience, vibe, generateLogo, notes } = req.body;
            if (!companyName || !industry || !values || !audience || !vibe) {
                res.status(400).json({
                    error: "Missing required fields: companyName, industry, values, audience, vibe",
                    });
                return;
            }
            if(generateLogo == null){
                generateLogo = false
            }
            const { emit, close, error } = SSEEvent(res);
            const image = extractImage(req);
            const input: TextBrandInput = { companyName, industry, values, audience, vibe, generateLogo, notes, ...image, };
            const brandBook = await GenerationService.generateFromText(input, companyName,req.user?.userId!, emit);
            emit({ step: "done", progress: 100, message: "Brand book complete!", data: brandBook });
            close();
        }catch(err){
            console.error("[from-text] generation error:", err);
            error(err instanceof Error ? err.message : "Generation failed. Please try again.");
        }
    }
    async fromPrompt (req: Request, res: Response) {

        
        try {
            let { prompt, generateLogo, notes } = req.body;

            if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
                res.status(400).json({
                error: "Missing or too short prompt. Describe your brand in at least one sentence.",
                });
                return;
            }
            if (generateLogo == null){
                generateLogo = false;
            }
            const image = extractImage(req);
            const { emit, close, error } = SSEEvent(res);

            const input: QuickBrandInput = { prompt: prompt.trim(),generateLogo, notes, ...image};
            const brandBook = await GenerationService.generateFromPrompt(input, req.user?.userId!, emit);
            emit({ step: "done", progress: 100, message: "Brand book complete!", data: brandBook });
            close();
        } catch (err) {
            console.error("[quick] generation error:", err);
            error(err instanceof Error ? err.message : "Generation failed. Please try again.");
        }
        }
    async fromLogo (req: Request, res: Response){
        if (!req.file) {
            res.status(400).json({ error: "No logo image uploaded. Send the file under the key 'logo'." });
            return;
        }

        const companyName: string = req.body.companyName ?? "Unknown Brand";
        const generateLogo: boolean = req.body.generateLogo ?? false;
        const { emit, close, error } = SSEEvent(res);

        try {
            const imageBase64 = req.file.buffer.toString("base64");
            const mimeType = req.file.mimetype as LogoBrandInput["mimeType"];

            const input: LogoBrandInput = { imageBase64, mimeType, companyName,  generateLogo,  notes: req.body.notes};
            const brandBook = await GenerationService.generateFromLogo(input, companyName,req.user?.userId!, emit);
            emit({ step: "done", progress: 100, message: "Brand book complete!", data: brandBook });
            close();
        } catch (err) {
            console.error("[from-logo] generation error:", err);
            error(err instanceof Error ? err.message : "Generation failed. Please try again.");
        }
        }

    async getHistory(req: Request, res: Response){
        try{
            const userId = req.user?.userId
            const history = await serviceBrand.getHistory(userId!);
            res.status(200).json({ success: true, data: history });
        }catch(err){
            console.error("error :", err);
            res.status(500).json({ success: false, message: "Failed to fetch history" });
        }
    }
    async editBrandBook(req: Request, res: Response) {
        try {
            const id  = req.params.id as string;
            const { notes } = req.body;
            if (!id) {
                res.status(400).json({ success: false, message: "Brand book id required" });
                return;
            }
            if (!notes) {
                res.status(400).json({ success: false, message: "notes required" });
                return;
            }
            const updated = await GenerationService.editBrandBook(req.user?.userId!, id, notes);
            res.status(200).json({ success: true, data: updated });
        } catch (err: any) {
            if (err.message === "No edits remaining") {
                res.status(403).json({ success: false, message: err.message });
                return;
            }
            if (err.message === "Brand book not found") {
                res.status(404).json({ success: false, message: err.message });
                return;
            }
            res.status(500).json({ success: false, message: "Edit failed" });
        }
    }
    async getBrandBook(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    const brandBook = await serviceBrand.getBrandBook(userId!, id);
    if (!brandBook) {
      res.status(404).json({ success: false, message: "Brand book not found" });
      return;
    }
    res.status(200).json({ success: true, data: brandBook });
  } catch (err) {
    console.error("[getBrandBook] error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch brand book" });
  }
}
}
export default new GenerationController