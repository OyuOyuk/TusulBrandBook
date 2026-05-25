import GroqFunctions, { MODELS } from "./groq.js";
import GeminiFunctions from "./gemini.js";
import type {
  BrandDNA,
  Palette,
  Typography,
  ColorSystem,
  TypographySystem,
  LogoGuidelines,
  GraphicElements,
  PhotographyStyle,
  WebUsageMap,
  BrandVoice,
  AssetGuidelines,
} from "./types/index.js";

async function getColorName(hex: string): Promise<string> {
  try {
    const clean = hex.replace("#", "");
    const res = await fetch(`https://www.thecolorapi.com/id?hex=${clean}&format=json`);
    const data = await res.json();
    return data.name?.value ?? hex; // fallback to hex if name missing
  } catch {
    return hex; // if API is down, just use hex
  }
}

async function nameSwatches(palette: Palette): Promise<Palette> {
  const keys = ["primary", "secondary", "accent", "neutral", "background"] as const;
  const named = await Promise.all(
    keys.map(key => getColorName(palette[key].hex))
  );
  const result = { ...palette };
  keys.forEach((key, i) => {
    result[key] = { ...result[key], name: named[i] ?? result[key].hex };
  });
  return result;
}

export async function generatePalette(dna: BrandDNA, notes?: string): Promise<Palette> {
  const raw = await GroqFunctions.askGroq<Palette>(`
    Design a brand color palette based on this brand DNA:
    ${JSON.stringify(dna, null, 2)}
    ${notes ? `\nUser design notes (highest priority, overrides rules below):\n"${notes}"` : ""}

    HARMONY — pick ONE: Analogous (30-60° apart) | Complementary (opposite hues) |
    Triadic (120° apart) | Split-complementary (150° away).

    CONTRAST — background + primary must be readable:
    - Dark primary (value <40%) → light background (value >85%)
    - Light primary (value >60%) → dark background (value <30%)

    SATURATION: primary/secondary 40-80% | neutral 0-15% | accent highest | background 0-10%

    MOOD MAP: energetic/bold → warm + high sat | calm/minimal → cool + low-med sat |
    luxury → jewel tones + gold accent | playful → bright warm + light bg | futuristic → deep cool + neon accent

    ERA "${dna.era}": contemporary → slightly desaturated | retro → warm muted |
    futuristic → dark bg + electric accent | timeless → neutral + single strong accent

    Avoidances: ${dna.avoidances.join(", ")}

    Return ONLY this JSON, nothing else:
    {
      "primary":    { "hex": "#XXXXXX", "name": "color name", "usage": "main brand color, headings, nav" },
      "secondary":  { "hex": "#XXXXXX", "name": "color name", "usage": "supporting sections, cards" },
      "accent":     { "hex": "#XXXXXX", "name": "color name", "usage": "CTAs, links, highlights only" },
      "neutral":    { "hex": "#XXXXXX", "name": "color name", "usage": "body text, borders, icons" },
      "background": { "hex": "#XXXXXX", "name": "color name", "usage": "page background, large surfaces" }
    }
  `, MODELS.quality);


  return nameSwatches(raw);}

export async function generateTypography(dna: BrandDNA, notes?: string): Promise<Typography> {
  return GroqFunctions.askGroq<Typography>(`
    Recommend a Google Fonts typography system for this brand:
    ${JSON.stringify(dna, null, 2)}
    ${notes ? `\nUser design notes (highest priority):\n"${notes}"` : ""}

    PAIRING — pick ONE proven strategy:
    - Serif heading + Sans body: classic, readable (e.g. Playfair Display + Inter)
    - Sans heading + Sans body: modern, use different widths (e.g. Montserrat + Inter)
    - Display heading + Simple sans body: expressive brands only (e.g. Bebas Neue + Lato)
    NEVER pair two serifs or two decoratives.

    ERA MAP: contemporary → geometric sans (Inter, DM Sans, Plus Jakarta Sans) |
    timeless → classic serif heading (Playfair Display, Cormorant) |
    retro → slab serif (Roboto Slab, Arvo, Righteous) |
    futuristic → stark geometric (Space Grotesk, Exo 2)

    ACCENT FONT: if heading is serif → monospace accent (Space Mono, JetBrains Mono) |
    if heading is sans → light italic or condensed variant

    SIZING: heading 40-56px weight 600-800 | body 15-17px weight 300-400 | accent 11-13px weight 500-600

    Only free Google Fonts. Avoidances: ${dna.avoidances.join(", ")}

    Return ONLY this JSON, nothing else:
    {
      "heading": { "family": "Exact Google Fonts name", "weight": "700", "size": "48px", "letterSpacing": "-0.03em", "usage": "Page titles, section headers, hero text" },
      "body":    { "family": "Exact Google Fonts name", "weight": "400", "size": "16px", "lineHeight": "1.7",        "usage": "Body copy, descriptions, paragraphs" },
      "accent":  { "family": "Exact Google Fonts name", "weight": "500", "size": "12px", "letterSpacing": "0.1em",  "usage": "Labels, tags, captions, eyebrow text" }
    }
  `, MODELS.quality);
}

export async function generateLogoPrompt(dna: BrandDNA, companyName: string): Promise<string> {
  const result = await GroqFunctions.askGroq<{ prompt: string }>(`
    Write an image generation prompt for a professional logo.
    Company: ${companyName}
    Brand DNA: ${JSON.stringify(dna, null, 2)}
    - Describe visual style, shapes, colors, composition
    - Include "no text, no words, no letters"
    - Include "white background, vector style, professional logo design"
    - Keep under 80 words
    Return ONLY: { "prompt": "your prompt here" }
  `, MODELS.quality);
  return result.prompt;
}

export async function generateBrandVoice(
  dna: BrandDNA,
  companyName: string
): Promise<BrandVoice> {
  // Groq 70B — needs to actually write copy that sounds like the brand
  return GroqFunctions.askGroq<BrandVoice>(`
    Brand DNA: ${JSON.stringify(dna)}
    Company: ${companyName}

    Task: write brand voice guidelines. The example copy must ACTUALLY sound like this brand.
    Use the personality and mood to write real headlines, not placeholders.

    Return ONLY this JSON:
    {
      "toneDescriptors": ["adjective1","adjective2","adjective3","adjective4"],
      "exampleHeadlines": [
        "First real headline this brand would use",
        "Second distinct headline showing a different angle",
        "Third headline showing emotional range"
      ],
      "exampleBodyCopy": "A genuine 2-3 sentence paragraph in this brand's voice. Must sound like ${companyName}, not generic.",
      "wordsToUse": ["word1","word2","word3","word4","word5"],
      "wordsToAvoid": ["cliche1","jargon1","off-brand-word"],
      "writingRules": [
        "Use active voice — never passive constructions",
        "Keep sentences under 20 words",
        "Brand-specific rule tied to personality"
      ]
    }
  `, MODELS.quality);
}

export async function generateWebUsageMap(
  dna: BrandDNA,
  palette: Palette,
  typography: Typography
): Promise<WebUsageMap> {
  // Groq 70B — complex 3-input mapping, was rate-limiting on 8B and hanging
  return GroqFunctions.askGroq<WebUsageMap>(`
    Brand DNA: ${JSON.stringify(dna)}
    Palette: ${JSON.stringify(palette)}
    Typography: ${JSON.stringify(typography)}

    Task: map exact color and typography values to each website component.
    Use ACTUAL hex values and font names from above. Format: "#hex (Color Name)".

    Return ONLY this JSON:
    {
      "navbar":  { "background":"#hex (Name)","text":"FontFamily weight size #hex","accent":"#hex","border":"#hex or none","notes":"one rule" },
      "hero":    { "background":"#hex (Name)","text":"FontFamily weight size #hex","accent":"#hex","notes":"one rule" },
      "cards":   { "background":"#hex (Name)","text":"FontFamily weight size #hex","accent":"#hex","border":"1px solid #hex","notes":"one rule" },
      "cta":     { "background":"#hex (Name)","text":"FontFamily weight size #hex","accent":"#hex hover","notes":"one rule" },
      "footer":  { "background":"#hex (Name)","text":"FontFamily weight size #hex","accent":"#hex","notes":"one rule" },
      "forms":   { "background":"#hex (Name)","text":"FontFamily weight size #hex","accent":"#hex focus","border":"#hex","notes":"one rule" },
      "badges":  { "background":"#hex (Name)","text":"FontFamily weight size #hex","notes":"one rule" },
      "alerts":  { "background":"info #hex / success #hex / warning #hex / error #hex","text":"FontFamily weight size","notes":"one rule" },
      "globalNotes": ["accessibility note","responsive note","general rule"]
    }
  `, MODELS.quality);
}

export async function editPalette(
  dna: BrandDNA,
  currentPalette: Palette,
  notes: string
): Promise<Palette> {
  const raw = await GroqFunctions.askGroq<Palette>(`
    Current palette: ${JSON.stringify(currentPalette)}
    Brand DNA: ${JSON.stringify(dna)}
    User edit request: "${notes}"
    Only change what the user explicitly asks for. Keep everything else identical.
    Still follow color theory rules.
    Return ONLY this JSON:
    {
      "primary":    { "hex":"#XXXXXX","name":"...","usage":"..." },
      "secondary":  { "hex":"#XXXXXX","name":"...","usage":"..." },
      "accent":     { "hex":"#XXXXXX","name":"...","usage":"..." },
      "neutral":    { "hex":"#XXXXXX","name":"...","usage":"..." },
      "background": { "hex":"#XXXXXX","name":"...","usage":"..." }
    }
  `, MODELS.quality);
  return nameSwatches(raw);
}

export async function editTypography(
  dna: BrandDNA,
  currentTypography: Typography,
  notes: string
): Promise<Typography> {
  return GroqFunctions.askGroq<Typography>(`
    Current typography: ${JSON.stringify(currentTypography)}
    Brand DNA: ${JSON.stringify(dna)}
    User edit request: "${notes}"
    Only change what the user explicitly asks for. Keep everything else identical.
    Return ONLY this JSON:
    {
      "heading": { "family":"...","weight":"700","size":"48px","letterSpacing":"-0.03em","usage":"..." },
      "body":    { "family":"...","weight":"400","size":"16px","lineHeight":"1.7","usage":"..." },
      "accent":  { "family":"...","weight":"500","size":"12px","letterSpacing":"0.1em","usage":"..." }
    }
  `, MODELS.quality);
}

export async function generateColorSystem(
  dna: BrandDNA,
  palette: Palette
): Promise<ColorSystem> {
  return GeminiFunctions.ask<ColorSystem>(`
    Brand DNA: ${JSON.stringify(dna)}
    Palette: ${JSON.stringify(palette)}

    Task: produce a detailed color system. For each of the 5 palette colors calculate
    approximate RGB (from hex) and CMYK values, and list specific website components
    where the color should and should not appear.

    Rules:
    - components: be specific (e.g. "navbar background", "primary CTA button", "section headings")
    - neverUseOn: list at least 2 contexts where this color must NOT be used
    - contrastNote: name the best text color to pair with this background + estimated ratio
    - contrastPairs: 3 real foreground+background combos from this palette, with ratio + usage
    - usageTips: 3 actionable rules specific to THIS palette (not generic advice)

    Return ONLY this JSON:
    {
      "swatches": {
        "primary":    { "hex":"...","name":"...","usage":"...","codes":{"hex":"...","rgb":"R__ G__ B__","cmyk":"C__ M__ Y__ K__"},"webUsage":{"components":["..."],"neverUseOn":["..."],"contrastNote":"..."} },
        "secondary":  { "hex":"...","name":"...","usage":"...","codes":{"hex":"...","rgb":"R__ G__ B__","cmyk":"C__ M__ Y__ K__"},"webUsage":{"components":["..."],"neverUseOn":["..."],"contrastNote":"..."} },
        "accent":     { "hex":"...","name":"...","usage":"...","codes":{"hex":"...","rgb":"R__ G__ B__","cmyk":"C__ M__ Y__ K__"},"webUsage":{"components":["..."],"neverUseOn":["..."],"contrastNote":"..."} },
        "neutral":    { "hex":"...","name":"...","usage":"...","codes":{"hex":"...","rgb":"R__ G__ B__","cmyk":"C__ M__ Y__ K__"},"webUsage":{"components":["..."],"neverUseOn":["..."],"contrastNote":"..."} },
        "background": { "hex":"...","name":"...","usage":"...","codes":{"hex":"...","rgb":"R__ G__ B__","cmyk":"C__ M__ Y__ K__"},"webUsage":{"components":["..."],"neverUseOn":["..."],"contrastNote":"..."} }
      },
      "contrastPairs": [
        { "background":"#...","foreground":"#...","ratio":"7.2:1 (AAA)","usage":"Primary button label" },
        { "background":"#...","foreground":"#...","ratio":"4.6:1 (AA)", "usage":"Card body text" },
        { "background":"#...","foreground":"#...","ratio":"5.1:1 (AA)", "usage":"Footer text" }
      ],
      "usageTips": ["tip 1","tip 2","tip 3"]
    }
  `);
}

export async function generateTypographySystem(
  dna: BrandDNA,
  typography: Typography
): Promise<TypographySystem> {
  return GeminiFunctions.ask<TypographySystem>(`
    Brand DNA: ${JSON.stringify(dna)}
    Base fonts: ${JSON.stringify(typography)}

    Task: build a 6-level type scale using ONLY the font families from base fonts above.
    Do NOT introduce new font families.

    Scale levels and their target sizes:
    - h1: 52-60px, weight 800, tight letter-spacing, hero headlines only
    - h2: 36-44px, weight 700, major section titles
    - h3: 24-30px, weight 600, card headings and subsections
    - body: 15-17px, weight 400, comfortable line-height, all paragraph text
    - caption: 12-14px, weight 400, supporting text under images or stats
    - label: 11-13px, weight 500-600, wide letter-spacing, UI tags and badges

    For each level: role, family, weight, size, lineHeight, letterSpacing,
    webUsage (one sentence), example (5-8 words matching brand personality).

    Also: googleFontsUrl (single URL all weights), pairingRationale (2 sentences),
    usageTips (3 rules).

    Return ONLY this JSON:
    {
      "googleFontsUrl": "https://fonts.googleapis.com/css2?family=...",
      "scale": {
        "h1":      { "role":"H1 — Hero heading",     "family":"...","weight":"800","size":"56px","lineHeight":"1.1","letterSpacing":"-0.03em","webUsage":"...","example":"..." },
        "h2":      { "role":"H2 — Section title",    "family":"...","weight":"700","size":"40px","lineHeight":"1.2","letterSpacing":"-0.02em","webUsage":"...","example":"..." },
        "h3":      { "role":"H3 — Card heading",     "family":"...","weight":"600","size":"28px","lineHeight":"1.3","letterSpacing":"-0.01em","webUsage":"...","example":"..." },
        "body":    { "role":"Body — Paragraph text", "family":"...","weight":"400","size":"16px","lineHeight":"1.7","letterSpacing":"0em",   "webUsage":"...","example":"..." },
        "caption": { "role":"Caption — Supporting",  "family":"...","weight":"400","size":"13px","lineHeight":"1.6","letterSpacing":"0em",   "webUsage":"...","example":"..." },
        "label":   { "role":"Label — UI element",    "family":"...","weight":"500","size":"12px","lineHeight":"1.4","letterSpacing":"0.08em","webUsage":"...","example":"..." }
      },
      "pairingRationale": "...",
      "usageTips": ["...","...","..."]
    }
  `);
}

export async function generateLogoGuidelines(
  dna: BrandDNA,
  companyName: string
): Promise<LogoGuidelines> {
  return GeminiFunctions.ask<LogoGuidelines>(`
    Brand DNA: ${JSON.stringify(dna)}
    Company: ${companyName}

    Task: write practical logo usage guidelines for a brand book.
    Be concrete — a junior designer should follow these without asking questions.

    Return ONLY this JSON:
    {
      "clearSpaceRule": "Minimum clear space rule referencing a visual anchor",
      "minimumSize": {
        "digital": "e.g. 80px wide — reason why",
        "print": "e.g. 20mm wide — reason why"
      },
      "placementPreference": "Where the logo goes by default and exceptions",
      "backgroundRules": "When to use dark vs light vs reversed logo version",
      "dos": [
        "Do always maintain original aspect ratio",
        "Do ensure sufficient contrast with background",
        "Do use approved color versions only"
      ],
      "donts": [
        "Do not stretch, squish, or rotate",
        "Do not apply drop shadows, outlines, or filters",
        "Do not recolor outside approved palette",
        "Do not crowd — respect the clear space rule",
        "Do not place on a patterned background without a solid container"
      ]
    }
  `);
}

export async function generateGraphicElements(dna: BrandDNA): Promise<GraphicElements> {
  return GeminiFunctions.ask<GraphicElements>(`
    Brand DNA: ${JSON.stringify(dna)}

    Task: define the graphic design language for this brand's visual system.
    Every rule must feel specific to this brand's personality and era — not generic.

    Return ONLY this JSON:
    {
      "shapeLanguage": "Corner radius philosophy and geometry style for this brand",
      "iconStyle": "Stroke weight, grid size, line cap style, fill vs outline decision",
      "patternUsage": "When and where decorative patterns or textures are allowed",
      "layoutPrinciple": "Grid system, alignment preference, whitespace philosophy",
      "decorativeNotes": "Rules about shadows, gradients, overlays — allowed vs forbidden",
      "websiteApplication": {
        "hero": "How graphic elements appear in the hero — shape, opacity, position",
        "cards": "Card border radius, shadow style, border treatment",
        "sections": "How to visually separate content sections for this brand",
        "dividers": "Style rules for horizontal rules and section breaks"
      }
    }
  `);
}

export async function generatePhotographyStyle(dna: BrandDNA): Promise<PhotographyStyle> {
  return GeminiFunctions.ask<PhotographyStyle>(`
    Brand DNA: ${JSON.stringify(dna)}

    Task: write photography guidelines for this brand's visual identity.
    A designer should be able to select or commission photos based solely on these.

    Return ONLY this JSON:
    {
      "mood": "3-5 adjectives describing the emotional feel images must have",
      "subjectMatter": "What or who appears in photos — specific about contexts and diversity",
      "lighting": "Preferred lighting style — natural vs studio, soft vs hard, warm vs cool",
      "colorTreatment": "Color grading approach — temperature, saturation, contrast level",
      "composition": "Framing rules, negative space, perspective, subject placement",
      "avoidances": [
        "First type of image to never use",
        "Second visual cliché to avoid",
        "Third specific thing that feels off-brand"
      ],
      "stockPhotoTips": "Practical advice for finding compliant stock photos for this brand"
    }
  `);
}

export async function generateAssetGuidelines(
  dna: BrandDNA,
  palette: Palette
): Promise<AssetGuidelines> {
  return GeminiFunctions.ask<AssetGuidelines>(`
    Brand DNA: ${JSON.stringify(dna)}
    Palette: ${JSON.stringify(palette)}

    Task: write asset production guidelines. Reference actual hex values where relevant.
    Rules must be specific enough that a designer produces compliant assets without asking.

    Return ONLY this JSON:
    {
      "flyer": {
        "layout": "Structure — logo position, image placement, text zones",
        "colors": "Which hex values to use and how",
        "typography": "Which scale levels for headline / body / detail",
        "dos": ["Specific do 1","Specific do 2"],
        "donts": ["Specific don't 1","Specific don't 2"]
      },
      "socialCard": {
        "layout": "Rules for square 1:1 and landscape 16:9 posts",
        "colors": "Color usage specific to social format legibility",
        "typography": "Font and sizing rules for small-screen legibility",
        "dos": ["Social-specific do"],
        "donts": ["Social-specific don't"]
      },
      "emailHeader": {
        "layout": "Width, height, logo placement, tagline placement",
        "colors": "Header background and text hex values",
        "typography": "Font stack with web-safe fallbacks for email clients",
        "dos": ["Email-specific do"],
        "donts": ["Email-specific don't"]
      },
      "presentationDeck": {
        "layout": "Slide grid, title placement, content area rules",
        "colors": "Slide background and text colors, accent usage rules",
        "typography": "Minimum font sizes for presentation legibility",
        "dos": ["Leave generous whitespace","Use full-bleed images on divider slides"],
        "donts": ["No more than 40 words per slide"]
      },
      "generalRules": [
        "Rule applying to all assets",
        "Logo placement rule",
        "Color compliance rule"
      ]
    }
  `);
}