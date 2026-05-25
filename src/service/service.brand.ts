import { v4 as uuidv4 } from "uuid";
import pool from "../db/client.js";
import GroqFunctions from "../groq.js";
import {
  generatePalette,
  generateTypography,
  generateLogoPrompt,
  generateColorSystem,
  generateTypographySystem,
  generateLogoGuidelines,
  generateGraphicElements,
  generatePhotographyStyle,
  generateWebUsageMap,
  generateBrandVoice,
  generateAssetGuidelines,
  editPalette,
  editTypography,
} from "../generation.js";
import type {
  TextBrandInput,
  LogoBrandInput,
  QuickBrandInput,
  BrandDNA,
  BrandBook,
  SSEEvent,
} from "../types/index.js";

type EmitFn = (event: SSEEvent) => void;

// Helper function to safely pause execution and prevent API bottleneck saturation
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateExtendedSections(
  dna: BrandDNA,
  companyName: string,
  palette: ReturnType<typeof generatePalette> extends Promise<infer T> ? T : never,
  typography: ReturnType<typeof generateTypography> extends Promise<infer T> ? T : never,
  emit: EmitFn
) {
  // 1. Define sequential tasks instead of resolving them instantly with Promise.all
  const tasks = [
    {
      name: "colorSystem",
      run: () => generateColorSystem(dna, palette),
      onDone: () => emit({ step: "voice", progress: 62, message: "✓ Color system generated." }),
    },
    {
      name: "typographySystem",
      run: () => generateTypographySystem(dna, typography),
      onDone: () => emit({ step: "voice", progress: 65, message: "✓ Typography system generated." }),
    },
    {
      name: "logoGuidelines",
      run: () => generateLogoGuidelines(dna, companyName),
      onDone: () => emit({ step: "voice", progress: 68, message: "✓ Logo guidelines generated." }),
    },
    {
      name: "graphicElements",
      run: () => generateGraphicElements(dna),
      onDone: () => emit({ step: "voice", progress: 71, message: "Graphic elements generated." }),
    },
    {
      name: "photographyStyle",
      run: () => generatePhotographyStyle(dna),
      onDone: () => emit({ step: "voice", progress: 74, message: "Photography style generated." }),
    },
    {
      name: "webUsageMap",
      run: () => generateWebUsageMap(dna, palette, typography),
      onDone: () => emit({ step: "voice", progress: 77, message: "Web usage map generated." }),
    },
    {
      name: "brandVoice",
      run: () => generateBrandVoice(dna, companyName),
      onDone: () => emit({ step: "voice", progress: 80, message: "Brand voice generated." }),
    },
    {
      name: "assetGuidelines",
      run: () => generateAssetGuidelines(dna, palette),
      onDone: () => emit({ step: "voice", progress: 83, message: "Asset guidelines generated." }),
    },
  ];

  const results: Record<string, any> = {};

  for (const task of tasks) {
    results[task.name] = await task.run();
    task.onDone();
    await sleep(200);
  }

  return {
    colorSystem: results.colorSystem,
    typographySystem: results.typographySystem,
    logoGuidelines: results.logoGuidelines,
    graphicElements: results.graphicElements,
    photographyStyle: results.photographyStyle,
    webUsageMap: results.webUsageMap,
    brandVoice: results.brandVoice,
    assetGuidelines: results.assetGuidelines,
  };
}

// ── Shared: persist brand book to DB ─────────────────────────────────────────

async function insertBrandBook(
  userId: string,
  book: BrandBook
): Promise<void> {
  await pool.query(
    `INSERT INTO brand_books (
      user_id, company_name,
      brand_dna, palette, typography, logo_url, logo_prompt,
      color_system, typography_system, logo_guidelines,
      graphic_elements, photography_style, web_usage_map,
      brand_voice, asset_guidelines
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14, $15
    )`,
    [
      userId,
      book.companyName,
      JSON.stringify(book.brandDNA),
      JSON.stringify(book.palette),
      JSON.stringify(book.typography),
      book.logoUrl,
      book.logoPrompt,
      JSON.stringify(book.colorSystem),
      JSON.stringify(book.typographySystem),
      JSON.stringify(book.logoGuidelines),
      JSON.stringify(book.graphicElements),
      JSON.stringify(book.photographyStyle),
      JSON.stringify(book.webUsageMap),
      JSON.stringify(book.brandVoice),
      JSON.stringify(book.assetGuidelines),
    ]
  );
}

class GenerationService {

  async generateFromText(
    input: TextBrandInput,
    companyName: string,
    userId: string,
    emit: EmitFn
  ): Promise<BrandBook> {
    emit({ step: "analyzing", progress: 10, message: "Analyzing brand identity..." });

    const notes = input.notes;
    let logoExplanation: string | undefined;

    if (input.imageBase64) {
      logoExplanation = await GroqFunctions.askGroqVision(
        `Analyze this logo image and extract the brand's visual DNA.
         ${input.companyName ? `Company name: ${input.companyName}` : ""}
         Look closely at colors, shapes, typography style, and overall aesthetic.`,
        input.imageBase64,
        input.mimeType ?? ""
      );
    }

    const brandDNA = await GroqFunctions.askGroq<BrandDNA>(`
      Analyze this brand information and extract its visual DNA.
      Company: ${input.companyName}
      Industry: ${input.industry}
      Core values: ${input.values}
      Target audience: ${input.audience}
      Desired vibe/adjectives: ${input.vibe}
      ${logoExplanation ? `Logo visual analysis: ${logoExplanation}\nFactor this into the DNA.` : ""}
      Return ONLY this JSON:
      {
        "personality": ["adjective1", "adjective2", "adjective3"],
        "mood": "single mood word",
        "era": "contemporary | retro | futuristic | timeless",
        "industry": "inferred industry category",
        "avoidances": ["visual thing to avoid 1", "visual thing to avoid 2"]
      }
    `);

    emit({ step: "analyzing", progress: 25, message: "Brand DNA extracted.", data: brandDNA });
    emit({ step: "palette", progress: 35, message: "Generating colors and fonts..." });

    // Sequenced generation processing for foundational assets
    const palette = await generatePalette(brandDNA, notes);
    await sleep(200);
    const typography = await generateTypography(brandDNA, notes);

    emit({ step: "palette", progress: 55, message: "Colors and fonts ready.", data: { palette, typography } });
    emit({ step: "voice", progress: 60, message: "Building brand voice and web guidelines..." });

    const extended = await generateExtendedSections(brandDNA, companyName, palette, typography, emit);

    emit({ step: "guidelines", progress: 85, message: "Design guidelines complete.", data: extended });

    let logoPrompt = "";
    if (input.generateLogo) {
      emit({ step: "guidelines", progress: 90, message: "Crafting logo concept..." });
      logoPrompt = await generateLogoPrompt(brandDNA, companyName);
    }

    const brandBook: BrandBook = {
      id: uuidv4(),
      companyName,
      createdAt: new Date().toISOString(),
      brandDNA,
      palette,
      typography,
      logoUrl: null,
      logoPrompt,
      ...extended,
    };

    await insertBrandBook(userId, brandBook);

    emit({ step: "done", progress: 100, message: "Brand book complete.", data: brandBook });
    return brandBook;
  }

  async generateFromLogo(
    input: LogoBrandInput,
    companyName: string,
    userId: string,
    emit: EmitFn
  ): Promise<BrandBook> {
    emit({ step: "analyzing", progress: 10, message: "Analyzing logo..." });

    const notes = input.notes;

    const brandDNA = await GroqFunctions.askGroqVision<BrandDNA>(
      `Analyze this logo image and extract the brand's visual DNA.
       ${input.companyName ? `Company name: ${input.companyName}` : ""}
       Look closely at colors, shapes, typography style, and overall aesthetic.
       Return ONLY this JSON:
       {
         "personality": ["adjective1", "adjective2", "adjective3"],
         "mood": "single mood word",
         "era": "contemporary | retro | futuristic | timeless",
         "industry": "inferred industry category",
         "avoidances": ["visual thing to avoid 1", "visual thing to avoid 2"]
       }`,
      input.imageBase64,
      input.mimeType
    );

    emit({ step: "analyzing", progress: 25, message: "Logo analyzed — brand DNA extracted.", data: brandDNA });
    emit({ step: "palette", progress: 35, message: "Generating colors and fonts..." });

    const palette = await generatePalette(brandDNA, notes);
    await sleep(200);
    const typography = await generateTypography(brandDNA, notes);

    emit({ step: "palette", progress: 55, message: "Colors and fonts ready.", data: { palette, typography } });
    emit({ step: "voice", progress: 60, message: "Building brand voice and web guidelines..." });

    const extended = await generateExtendedSections(brandDNA, companyName, palette, typography, emit);

    emit({ step: "guidelines", progress: 85, message: "Design guidelines complete.", data: extended });

    let logoPrompt = "";
    if (input.generateLogo) {
      emit({ step: "guidelines", progress: 90, message: "Crafting logo concept..." });
      logoPrompt = await generateLogoPrompt(brandDNA, companyName);
    }

    const brandBook: BrandBook = {
      id: uuidv4(),
      companyName,
      createdAt: new Date().toISOString(),
      brandDNA,
      palette,
      typography,
      logoUrl: null,
      logoPrompt,
      ...extended,
    };

    await insertBrandBook(userId, brandBook);

    emit({ step: "done", progress: 100, message: "Brand book complete.", data: brandBook });
    return brandBook;
  }

  async generateFromPrompt(
    input: QuickBrandInput,
    userId: string,
    emit: EmitFn
  ): Promise<BrandBook> {
    emit({ step: "analyzing", progress: 10, message: "Analyzing brand identity..." });

    const notes = input.notes;
    let logoExplanation: string | undefined;

    if (input.imageBase64) {
      logoExplanation = await GroqFunctions.askGroqVision(
        `Analyze this logo image and extract the brand's visual DNA.
         Look closely at colors, shapes, typography style, and overall aesthetic.`,
        input.imageBase64,
        input.mimeType ?? ""
      );
    }

    const result = await GroqFunctions.askGroq<{ companyName: string; dna: BrandDNA }>(`
      A user described their brand in one sentence: "${input.prompt}"
      ${input.notes ? `\nExtra design notes: "${input.notes}"` : ""}
      ${logoExplanation ? `Logo visual analysis: ${logoExplanation}\nFactor this into the DNA.` : ""}
      Extract brand info. If a company name is mentioned, use it; otherwise invent a fitting one.
      Return ONLY this JSON:
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

    const brandDNA = result.dna;
    const companyName = result.companyName;

    emit({ step: "analyzing", progress: 25, message: "Brand DNA extracted.", data: brandDNA });
    emit({ step: "palette", progress: 35, message: "Generating colors and fonts..." });

    const palette = await generatePalette(brandDNA, notes);
    await sleep(200);
    const typography = await generateTypography(brandDNA, notes);

    emit({ step: "palette", progress: 55, message: "Colors and fonts ready.", data: { palette, typography } });
    emit({ step: "voice", progress: 60, message: "Building brand voice and web guidelines..." });

    const extended = await generateExtendedSections(brandDNA, companyName, palette, typography, emit);

    emit({ step: "guidelines", progress: 85, message: "Design guidelines complete.", data: extended });

    let logoPrompt = "";
    if (input.generateLogo) {
      emit({ step: "guidelines", progress: 90, message: "Crafting logo concept..." });
      logoPrompt = await generateLogoPrompt(brandDNA, companyName);
    }

    const brandBook: BrandBook = {
      id: uuidv4(),
      companyName,
      createdAt: new Date().toISOString(),
      brandDNA,
      palette,
      typography,
      logoUrl: null,
      logoPrompt,
      ...extended,
    };

    await insertBrandBook(userId, brandBook);

    emit({ step: "done", progress: 100, message: "Brand book complete.", data: brandBook });
    return brandBook;
  }

  async getHistory(userId: string) {
    const result = await pool.query(
      `SELECT * FROM brand_books WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async editBrandBook(userId: string, id: string, notes: string) {
    const result = await pool.query(
      `SELECT * FROM brand_books WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) throw new Error("Brand book not found");

    const book = result.rows[0];
    if (book.edits_remaining <= 0) throw new Error("No edits remaining");

    const palette = await editPalette(book.brand_dna, book.palette, notes);
    await sleep(200);
    const typography = await editTypography(book.brand_dna, book.typography, notes);

    // Regenerate dependent sections sequentially on user manual edits
    await sleep(200);
    const colorSystem = await generateColorSystem(book.brand_dna, palette);
    await sleep(200);
    const typographySystem = await generateTypographySystem(book.brand_dna, typography);
    await sleep(200);
    const webUsageMap = await generateWebUsageMap(book.brand_dna, palette, typography);
    await sleep(200);
    const assetGuidelines = await generateAssetGuidelines(book.brand_dna, palette);

    const updated = await pool.query(
      `UPDATE brand_books
       SET palette            = $1,
           typography         = $2,
           color_system       = $3,
           typography_system  = $4,
           web_usage_map      = $5,
           asset_guidelines   = $6,
           edits_remaining    = edits_remaining - 1
       WHERE id = $7
       RETURNING *`,
      [
        JSON.stringify(palette),
        JSON.stringify(typography),
        JSON.stringify(colorSystem),
        JSON.stringify(typographySystem),
        JSON.stringify(webUsageMap),
        JSON.stringify(assetGuidelines),
        id,
      ]
    );

    return updated.rows[0];
  }
}

export default new GenerationService();