import type { Request, Response } from "express";
import type { SSEEvent } from "../types/index.js";

export function SSEEvent(res: Response){
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    function emit(event: SSEEvent) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    function close() {
        res.write(`data: ${JSON.stringify({ step: "done", progress: 100, message: "Complete!" })}\n\n`);
        res.end();
    }

    function error(message: string) {
        res.write(`data: ${JSON.stringify({ step: "error", progress: 0, message })}\n\n`);
        res.end();
    }

    return { emit, close, error };
}
