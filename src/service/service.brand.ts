import GroqFunctions from "../groq.js"
import type{
  TextBrandInput,
  LogoBrandInput,
  QuickBrandInput,
  BrandDNA,
  Palette,
  Typography,
  BrandBook,
  SSEEvent,
} from "../types/index.js";
import { v4 as uuidv4 } from "uuid";
import pool from "../db/client.js";


type EmitFn = (event: SSEEvent) => void;


async function generatePalette(dna: BrandDNA, notes?: string): Promise<Palette> {
  return GroqFunctions.askGroq<Palette>(`
    Design a brand color palette based on this brand DNA:
    ${JSON.stringify(dna, null, 2)}
    ${notes ? `\nIMPORTANT — the user has specific design requests, treat these as highest priority:\n"${notes}"\nIf they conflict with the rules below, the user's request wins.` : ""}

    You MUST follow these color theory rules strictly:

    HARMONY RULE — pick ONE of these schemes and stick to it:
    - Analogous: colors that sit 30-60° apart on the color wheel (calm, cohesive)
    - Complementary: one dominant hue + its opposite on the wheel (bold, high contrast)
    - Triadic: three hues evenly spaced 120° apart (vibrant but balanced)
    - Split-complementary: one dominant + two colors 150° away (safer than complementary)

    CONTRAST RULE — the background and primary MUST have enough contrast to be readable.
    - If primary is dark (value < 40%), background must be light (value > 85%)
    - If primary is light (value > 60%), background must be dark (value < 30%)
    - Never pair two saturated colors of similar value as primary + background

    SATURATION RULE:
    - Primary and secondary: medium to high saturation (40-80%)
    - Neutral: very low saturation (0-15%), used for body text and borders
    - Accent: highest saturation of the set, used SPARINGLY for CTAs only
    - Background: very low saturation (0-10%), almost white or almost black

    MOOD MAPPING:
    - energetic/bold → warm hues (reds, oranges, yellows), high saturation
    - calm/minimal → cool hues (blues, greens), low-medium saturation
    - luxury/elegant → deep jewel tones or near-blacks with gold/warm accent
    - playful/friendly → bright, warm, high saturation with light background
    - futuristic/tech → deep cool darks (navy, slate) with electric accent

    Era: "${dna.era}" — adjust warmth accordingly:
    - contemporary: clean, slightly desaturated
    - retro: warm, slightly muted/earthy
    - futuristic: very dark bg, electric neon accent
    - timeless: neutral base, single strong accent

    Avoidances: ${dna.avoidances.join(", ")}

    Return ONLY this JSON, no other text:
    {
      "primary":    { "hex": "#XXXXXX", "name": "color name", "usage": "main brand color, headings, nav" },
      "secondary":  { "hex": "#XXXXXX", "name": "color name", "usage": "supporting sections, cards" },
      "accent":     { "hex": "#XXXXXX", "name": "color name", "usage": "CTAs, links, highlights only" },
      "neutral":    { "hex": "#XXXXXX", "name": "color name", "usage": "body text, borders, icons" },
      "background": { "hex": "#XXXXXX", "name": "color name", "usage": "page background, large surfaces" }
    }
  `);
}


async function generateTypography(dna: BrandDNA, notes?: string): Promise<Typography> {
  return GroqFunctions.askGroq<Typography>(`
    Recommend a Google Fonts typography system for this brand:
    ${JSON.stringify(dna, null, 2)}
    ${notes ? `\nIMPORTANT — the user has specific design requests, treat these as highest priority:\n"${notes}"\nIf they conflict with the rules below, the user's request wins.` : ""}

    You MUST follow these typography pairing rules strictly:

    PAIRING RULE — pick ONE of these proven pairing strategies:
    - Serif heading + Sans-serif body: classic, highly readable, works for almost any brand
      e.g. Playfair Display + Inter, Cormorant Garamond + Lato, Merriweather + Open Sans
    - Sans-serif heading + Sans-serif body: modern and clean, use DIFFERENT weights/widths
      e.g. Montserrat (700) + Inter (400), Raleway + Source Sans 3, Oswald + Nunito
    - Display/Decorative heading + Simple sans body: expressive brands only
      e.g. Righteous + Inter, Bebas Neue + Open Sans, Abril Fatface + Lato
    - NEVER pair two serif fonts or two decorative fonts together — they clash

    ERA MAPPING — match the font personality to the brand era:
    - contemporary: geometric sans (Inter, DM Sans, Plus Jakarta Sans, Outfit)
    - timeless: classic serif heading (Playfair Display, Cormorant, Libre Baskerville)
    - retro: slab serif or vintage display (Roboto Slab, Arvo, Alfa Slab One, Righteous)
    - futuristic: stark geometric sans, possibly monospace accent (Space Grotesk, Exo 2)

    PERSONALITY MAPPING:
    - elegant/luxury → high contrast serif heading (Cormorant Garamond, Bodoni Moda)
    - bold/innovative → strong geometric sans (Montserrat ExtraBold, Raleway Heavy)
    - friendly/playful → rounded sans (Nunito, Poppins, Quicksand)
    - trustworthy/corporate → neutral humanist sans (Inter, Source Sans 3, Lato)
    - creative/artistic → expressive display heading (Abril Fatface, Bebas Neue)

    ACCENT FONT RULE:
    - If heading is serif → accent should be a simple monospace or small-caps sans
    - If heading is sans → accent can be a light italic or condensed version
    - Accent is only used for labels, tags, captions — must be readable at 11-12px
    - Good accent choices: Space Mono, JetBrains Mono, Roboto Condensed, DM Mono

    SIZING & SPACING RULES:
    - Heading: 40-56px, weight 600-800, tight letter spacing (-0.02 to -0.04em)
    - Body: 15-17px, weight 300-400, comfortable line height (1.6-1.8)
    - Accent: 11-13px, weight 500-600, wide letter spacing (0.08-0.15em) for legibility

    ONLY use fonts available FREE on fonts.google.com.
    Avoidances: ${dna.avoidances.join(", ")}

    Return ONLY this JSON, no other text:
    {
      "heading": {
        "family": "Exact Google Fonts name",
        "weight": "700",
        "size": "48px",
        "letterSpacing": "-0.03em",
        "usage": "Page titles, section headers, hero text"
      },
      "body": {
        "family": "Exact Google Fonts name",
        "weight": "400",
        "size": "16px",
        "lineHeight": "1.7",
        "usage": "Body copy, descriptions, paragraphs"
      },
      "accent": {
        "family": "Exact Google Fonts name",
        "weight": "500",
        "size": "12px",
        "letterSpacing": "0.1em",
        "usage": "Labels, tags, captions, eyebrow text"
      }
    }
  `);
}

async function generateLogoPrompt(dna: BrandDNA, companyName: string): Promise<string> {
  const result = await GroqFunctions.askGroq<{ prompt: string }>(`
    Write an image generation prompt for a professional logo for this brand.

    Company: ${companyName}
    Brand DNA: ${JSON.stringify(dna, null, 2)}

    Requirements:
    - Describe visual style, shapes, colors, and composition
    - Include "no text, no words, no letters" (icon-only logo)
    - Include "white background, vector style, professional logo design"
    - Keep it under 80 words total

    Return ONLY this JSON shape, nothing else:
    { "prompt": "your detailed image generation prompt here" }
  `);
  return result.prompt;
}
async function editPalette(dna: BrandDNA, currentPalette: Palette, notes: string): Promise<Palette> {
    return GroqFunctions.askGroq<Palette>(`
        A user wants to edit their existing brand color palette.
        
        Current palette they want to modify:
        ${JSON.stringify(currentPalette, null, 2)}

        Brand DNA (keep this in mind):
        ${JSON.stringify(dna, null, 2)}

        User's edit request:
        "${notes}"

        IMPORTANT: Only change what the user explicitly asks for. 
        Keep everything else as close to the original as possible.
        Still follow all color theory rules.

        Return ONLY this JSON, no other text:
        {
          "primary":    { "hex": "#XXXXXX", "name": "color name", "usage": "main brand color, headings, nav" },
          "secondary":  { "hex": "#XXXXXX", "name": "color name", "usage": "supporting sections, cards" },
          "accent":     { "hex": "#XXXXXX", "name": "color name", "usage": "CTAs, links, highlights only" },
          "neutral":    { "hex": "#XXXXXX", "name": "color name", "usage": "body text, borders, icons" },
          "background": { "hex": "#XXXXXX", "name": "color name", "usage": "page background, large surfaces" }
        }
    `);
}

async function editTypography(dna: BrandDNA, currentTypography: Typography, notes: string): Promise<Typography> {
    return GroqFunctions.askGroq<Typography>(`
        A user wants to edit their existing brand typography.

        Current typography they want to modify:
        ${JSON.stringify(currentTypography, null, 2)}

        Brand DNA (keep this in mind):
        ${JSON.stringify(dna, null, 2)}

        User's edit request:
        "${notes}"

        IMPORTANT: Only change what the user explicitly asks for.
        Keep everything else as close to the original as possible.
        Still follow all typography pairing rules.

        Return ONLY this JSON, no other text:
        {
          "heading": { "family": "...", "weight": "700", "size": "48px", "letterSpacing": "-0.03em", "usage": "..." },
          "body":    { "family": "...", "weight": "400", "size": "16px", "lineHeight": "1.7", "usage": "..." },
          "accent":  { "family": "...", "weight": "500", "size": "12px", "letterSpacing": "0.1em", "usage": "..." }
        }
    `);
}

class GenerationService {
        
    async generateFromText(input: TextBrandInput ,
    companyName: string, userId: string,
    emit: EmitFn): Promise<BrandBook>  {
            
            let brandDNA: BrandDNA;
            let resolvedCompanyName = companyName;
            let logoExplanation;
            const notes = "notes" in input ? input.notes : undefined;
            if(input.imageBase64 != null){
                logoExplanation = await GroqFunctions.askGroqVision(` Analyze this logo image and extract the brand's visual DNA.
                ${input.companyName ? `Company name for context: ${input.companyName}` : ""}
                Look closely at the colors, shapes, typography style, and overall aesthetic.
             `  , input.imageBase64,
                input.mimeType ?? ''
                );      
            }
            

            brandDNA = await GroqFunctions.askGroq<BrandDNA>(`
                Analyze this brand information and extract its visual DNA.

                Company: ${input.companyName}
                Industry: ${input.industry}
                Core values: ${input.values}
                Target audience: ${input.audience}
                Desired vibe/adjectives: ${input.vibe}
                ${logoExplanation ? `Logo visual analysis: ${logoExplanation}\nFactor this into the DNA.` : ""}

                Return ONLY this JSON shape, nothing else:
                {
                "personality": ["adjective1", "adjective2", "adjective3"],
                "mood": "single mood word",
                "era": "contemporary | retro | futuristic | timeless",
                "industry": "inferred industry category",
                "avoidances": ["visual thing to avoid 1", "visual thing to avoid 2"]
                }
            `);
            emit({ step: "analyzing", progress: 30, message:"Brand DNA extracted.", data: brandDNA });
            emit({ step: "palette", progress: 40, message: "Generating colors and fonts..." });

            const [palette, typography] = await Promise.all([
                generatePalette(brandDNA, notes),
                generateTypography(brandDNA, notes),
            ]);   
            emit({ step: "palette", progress: 70, message: "Colors and fonts ready.", data: { palette, typography } });
            let logoPrompt = '';
            if(input.generateLogo == true){
                emit({ step: "logo_prompt", progress: 85, message: "Crafting logo concept..." });

                logoPrompt = await generateLogoPrompt(brandDNA, resolvedCompanyName);

                emit({
                    step: "logo_prompt",
                    progress: 95,
                    message: "Logo concept ready. Call /api/brand/generate-logo to generate the image.",
                    data: { logoPrompt },
                });
                

            }
            
            const brandBook: BrandBook = {
                    id: uuidv4(),
                    companyName: resolvedCompanyName,
                    brandDNA,
                    palette,
                    typography,
                    logoUrl: null,
                    logoPrompt,
                    createdAt: new Date().toISOString(),
                };
            
            await pool.query(`INSERT INTO brand_books ( user_id, company_name, brand_dna, palette, typography, logo_url, logo_prompt)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [userId, brandBook.companyName, JSON.stringify(brandBook.brandDNA), JSON.stringify(brandBook.palette), JSON.stringify(brandBook.typography), brandBook.logoUrl, brandBook.logoPrompt])
            // await pool.query('UPDATE users SET has_paid = false WHERE id = $1', [userId])
            return brandBook
        }
    async generateFromLogo(input: LogoBrandInput, companyName: string,
         userId: string, emit: EmitFn
        ): Promise<BrandBook>{
            emit({ step: "analyzing", progress: 10, message: "Analyzing brand identity..." });

            let brandDNA: BrandDNA;
            let resolvedCompanyName = companyName;
            const notes = "notes" in input ? input.notes : undefined;
            brandDNA = await GroqFunctions.askGroqVision<BrandDNA>(
                `
                Analyze this logo image and extract the brand's visual DNA.
                ${input.companyName ? `Company name for context: ${input.companyName}` : ""}

                Look closely at the colors, shapes, typography style, and overall aesthetic.

                Return ONLY this JSON shape, nothing else:
                {
                "personality": ["adjective1", "adjective2", "adjective3"],
                "mood": "single mood word",
                "era": "contemporary | retro | futuristic | timeless",
                "industry": "inferred industry category",
                "avoidances": ["visual thing to avoid 1", "visual thing to avoid 2"]
                }
                `,
            input.imageBase64,
            input.mimeType
        );
        emit({ step: "analyzing", progress: 30, message: "Logo analyzed — brand DNA extracted from your image.", data: brandDNA });
        emit({ step: "palette", progress: 40, message: "Generating colors and fonts..." });
        const [palette, typography] = await Promise.all([
            generatePalette(brandDNA, notes),
            generateTypography(brandDNA, notes),
        ]);
        emit({ step: "palette", progress: 70, message: "Colors and fonts ready.", data: { palette, typography } });

        let logoPrompt = '';
            if(input.generateLogo == true){
                emit({ step: "logo_prompt", progress: 85, message: "Crafting logo concept..." });

                logoPrompt = await generateLogoPrompt(brandDNA, resolvedCompanyName);

                emit({
                    step: "logo_prompt",
                    progress: 95,
                    message: "Logo concept ready. Call /api/brand/generate-logo to generate the image.",
                    data: { logoPrompt },
                });
                

            }
        
        const brandBook: BrandBook = {
            id: uuidv4(),
            companyName: resolvedCompanyName,
            brandDNA,
            palette,
            typography,
            logoUrl: null,
            logoPrompt,
            createdAt: new Date().toISOString(),
        };
        await pool.query(`INSERT INTO brand_books ( user_id, company_name, brand_dna, palette, typography, logo_url, logo_prompt)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `,[ userId, brandBook.companyName, JSON.stringify(brandBook.brandDNA), JSON.stringify(brandBook.palette), JSON.stringify(brandBook.typography), brandBook.logoUrl, brandBook.logoPrompt])

         emit({
                    step: "logo_prompt",
                    progress: 100,
                    message: "Logo concept ready. Call /api/brand/generate-logo to generate the image.",
                    data: { logoPrompt },
                });
        // await pool.query('UPDATE users SET has_paid = false WHERE id = $1', [userId])
        return brandBook;
        }

    async generateFromPrompt(input: QuickBrandInput, userId: string,emit: EmitFn ): Promise<BrandBook> {
            emit({ step: "analyzing", progress: 10, message: "Analyzing brand identity..." });
            let brandDNA: BrandDNA;
            let logoExplanation;

            if(input.imageBase64 != null){
                logoExplanation = await GroqFunctions.askGroqVision(` Analyze this logo image and extract the brand's visual DNA.
                Look closely at the colors, shapes, typography style, and overall aesthetic.
             `  , input.imageBase64,
                input.mimeType ?? ''
                );      
            }
            

            const notes = "notes" in input ? input.notes : undefined;
            const result =  await GroqFunctions.askGroq<{ companyName: string; dna: BrandDNA }>(`
                A user described their brand in one sentence:
                "${input.prompt}"
                ${input.notes ? `\nExtra design notes from the user: "${input.notes}"` : ""}
                ${logoExplanation ? `Logo visual analysis: ${logoExplanation}\nFactor this into the DNA.` : ""}

                Extract as much brand information as you can from this description.
                If a company name is mentioned, use it. Otherwise invent a fitting one.

                Return ONLY this JSON, no other text:
                {
                "companyName": "extracted or invented company name",
                "dna": {
                    "personality": ["adjective1", "adjective2", "adjective3"],
                    "mood": "single mood word",
                    "era": "contemporary | retro | futuristic | timeless",
                    "industry": "inferred industry category",
                    "avoidances": ["visual thing to avoid 1", "visual thing to avoid 2"]
                }
                }
            `);
            brandDNA = result.dna;
            let resolvedCompanyName = result.companyName;

                
            emit({ step: "analyzing", progress: 30, message: "Brand DNA extracted.", data: brandDNA });

            emit({ step: "palette", progress: 40, message: "Generating colors and fonts..." });

            const [palette, typography] = await Promise.all([
                generatePalette(brandDNA, notes),
                generateTypography(brandDNA, notes),
            ]);
            emit({ step: "palette", progress: 70, message: "Colors and fonts ready.", data: { palette, typography } });

            let logoPrompt = '';

            if(input.generateLogo == true){
                emit({ step: "logo_prompt", progress: 85, message: "Crafting logo concept..." });

                logoPrompt = await generateLogoPrompt(brandDNA, resolvedCompanyName);

                emit({
                    step: "logo_prompt",
                    progress: 95,
                    message: "Logo concept ready. Call /api/brand/generate-logo to generate the image.",
                    data: { logoPrompt },
                });
                

            }

            const brandBook: BrandBook = {
                id: uuidv4(),
                companyName: resolvedCompanyName,
                brandDNA,
                palette,
                typography,
                logoUrl: null,
                logoPrompt,
                createdAt: new Date().toISOString(),
            };
            await pool.query(`INSERT INTO brand_books ( user_id, company_name, brand_dna, palette, typography, logo_url, logo_prompt)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [userId, brandBook.companyName, JSON.stringify(brandBook.brandDNA), JSON.stringify(brandBook.palette), JSON.stringify(brandBook.typography), brandBook.logoUrl, brandBook.logoPrompt])
            // await pool.query('UPDATE users SET has_paid = false WHERE id = $1', [userId])
            return brandBook;
    }   
    async getHistory(userId: string){
        const history = await pool.query(`SELECT * FROM brand_books
            WHERE user_id = $1
            ORDER BY created_at DESC
            `, [userId])
        return history.rows

        
    }
    async editBrandBook(userId: string, id: string, notes: string) {
        const result = await pool.query(
            `SELECT * FROM brand_books WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        if (result.rows.length === 0) throw new Error("Brand book not found");
        
        const book = result.rows[0];
        if (book.edits_remaining <= 0) throw new Error("No edits remaining");

        const [palette, typography] = await Promise.all([
            editPalette(book.brand_dna, book.palette, notes),
            editTypography(book.brand_dna, book.typography, notes),
        ]);

        const updated = await pool.query(
            `UPDATE brand_books 
            SET palette = $1, typography = $2, edits_remaining = edits_remaining - 1
            WHERE id = $3
            RETURNING *`,
            [JSON.stringify(palette), JSON.stringify(typography), id]
        );

        return updated.rows[0];
    }
}

export default new GenerationService