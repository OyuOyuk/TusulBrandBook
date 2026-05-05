// ── Input shapes ────────────────────────────────────────────────────────────
export interface TextBrandInput {
  companyName: string;
  industry: string;
  values: string;
  audience: string;
  vibe: string;
  generateLogo: boolean;
  notes?: string;
  // ── new: optional logo upload ──
  imageBase64?: string;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
}

export interface LogoBrandInput {
  imageBase64: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  companyName?: string;
  notes?: string;
  // ── new: can now also generate a logo concept ──
  generateLogo?: boolean;
}

export interface QuickBrandInput {
  prompt: string;
  notes?: string;
  generateLogo: boolean;
  // ── new: optional logo upload ──
  imageBase64?: string;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
}

export interface BrandDNA {
  personality: string[];   // e.g. ["bold", "innovative"]
  mood: string;
  era: string;             // e.g. "contemporary", "retro"
  industry: string;
  avoidances: string[];    // things to NOT do visually
}

export interface ColorSwatch {
  hex: string;
  name: string;
  usage: string;
}

export interface Palette {
  primary: ColorSwatch;
  secondary: ColorSwatch;
  accent: ColorSwatch;
  neutral: ColorSwatch;
  background: ColorSwatch;
}

export interface TypeStyle {
  family: string;     // Google Fonts name
  weight: string;     // e.g. "700"
  size: string;       // e.g. "48px"
  letterSpacing?: string;
  lineHeight?: string;
  usage?: string;
}

export interface Typography {
  heading: TypeStyle;
  body: TypeStyle;
  accent: TypeStyle;
}

export interface BrandBook {
  id: string;
  companyName: string;
  brandDNA: BrandDNA;
  palette: Palette;
  typography: Typography;
  logoUrl?: string | null;   // will be null until image gen is hooked up
  logoPrompt?: string;       // the prompt we'd send to an image model
  createdAt: string;
}


export type SSEStep =
  | "analyzing"
  | "palette"
  | "typography"
  | "logo_prompt"
  | "done"
  | "error";

export interface SSEEvent {
  step: SSEStep;
  progress: number;       // 0–100
  message: string;
  data?: unknown;         // partial result at each step
}