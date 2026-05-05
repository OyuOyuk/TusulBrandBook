import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

class GroqFunctions{
        
    async askGroq<T>(prompt: string): Promise<T> {
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
            {
                role: "system",
                content:
                "You are a brand strategy and design expert. You ONLY respond with raw valid JSON. No markdown, no backticks, no explanation, no extra text before or after. Just the JSON object itself.",
            },
            { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 1024,
    });
     const raw = response.choices[0]?.message?.content ?? "";
    const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

    return JSON.parse(cleaned) as T;

    }
    async askGroqVision<T>(prompt: string, imageBase64: string, mimeType: string): Promise<T> {
        const response = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
            {
                role: "system",
                content:
                "You are a brand strategy and design expert. You ONLY respond with raw valid JSON. No markdown, no backticks, no explanation, no extra text before or after. Just the JSON object itself.",
            },
            {
                role: "user",
                content: [
                {
                    type: "image_url",
                    image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                },
                {
                    type: "text",
                    text: prompt,
                },
                ],
            },
            ],
            temperature: 0.7,
            max_tokens: 1024,
        });

        const raw = response.choices[0]?.message?.content ?? "";
        const cleaned = raw
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();

        return JSON.parse(cleaned) as T;
        

        }}

export default new GroqFunctions