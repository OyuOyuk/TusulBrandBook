// ── Input shapes ─────────────────────────────────────────────────────────────

export interface TextBrandInput {
  companyName: string;
  industry:    string;
  values:      string;
  audience:    string;
  vibe:        string;
  generateLogo: boolean;
  notes?:      string;
  imageBase64?: string;
  mimeType?:   "image/png" | "image/jpeg" | "image/webp";
}

export interface LogoBrandInput {
  imageBase64: string;
  mimeType:    "image/png" | "image/jpeg" | "image/webp";
  companyName?: string;
  notes?:      string;
  generateLogo?: boolean;
}

export interface QuickBrandInput {
  prompt:       string;
  notes?:       string;
  generateLogo: boolean;
  imageBase64?: string;
  mimeType?:    "image/png" | "image/jpeg" | "image/webp";
}

// ── Brand DNA ────────────────────────────────────────────────────────────────

export interface BrandDNA {
  personality: string[];   // e.g. ["bold", "innovative", "trustworthy"]
  mood:        string;     // single word, e.g. "energetic"
  era:         string;     // "contemporary" | "retro" | "futuristic" | "timeless"
  industry:    string;
  avoidances:  string[];   // visual things to NOT do
}

// ── Core palette (unchanged) ─────────────────────────────────────────────────

export interface ColorSwatch {
  hex:   string;
  name:  string;
  usage: string;
}

export interface Palette {
  primary:    ColorSwatch;
  secondary:  ColorSwatch;
  accent:     ColorSwatch;
  neutral:    ColorSwatch;
  background: ColorSwatch;
}

// ── Core typography (unchanged) ──────────────────────────────────────────────

export interface TypeStyle {
  family:        string;
  weight:        string;
  size:          string;
  letterSpacing?: string;
  lineHeight?:   string;
  usage?:        string;
}

export interface Typography {
  heading: TypeStyle;
  body:    TypeStyle;
  accent:  TypeStyle;
}

// ── Extended: Color system ───────────────────────────────────────────────────

export interface ColorCode {
  hex:  string;
  rgb:  string;   // e.g. "R23 G72 B106"
  cmyk: string;   // e.g. "C95 M66 Y35 K24"
}

export interface ExtendedColorSwatch extends ColorSwatch {
  codes:       ColorCode;
  // Where exactly on the website this color is used
  webUsage: {
    components: string[];  // e.g. ["navbar background", "primary buttons", "section headings"]
    neverUseOn: string[];  // e.g. ["body text", "small labels"]
    contrastNote: string;  // e.g. "Always pair with white (#FFFFFF) text"
  };
}

export interface ColorContrastPair {
  background: string; // hex
  foreground: string; // hex
  ratio:      string; // e.g. "7.2:1 (AAA)"
  usage:      string; // e.g. "Primary button text on accent background"
}

export interface ColorSystem {
  swatches:      Record<keyof Palette, ExtendedColorSwatch>;
  contrastPairs: ColorContrastPair[];
  usageTips:     string[];   // general color usage rules for this brand
}

// ── Extended: Typography system ──────────────────────────────────────────────

export interface TypeScaleEntry {
  role:          string;   // e.g. "H1 — Hero heading"
  family:        string;
  weight:        string;
  size:          string;
  lineHeight:    string;
  letterSpacing: string;
  webUsage:      string;   // e.g. "Above-the-fold hero headline only. Max 1 per page."
  example:       string;   // sample text to render as a specimen
}

export interface TypographySystem {
  googleFontsUrl: string;   // import URL with all required weights
  scale: {
    h1:      TypeScaleEntry;
    h2:      TypeScaleEntry;
    h3:      TypeScaleEntry;
    body:    TypeScaleEntry;
    caption: TypeScaleEntry;
    label:   TypeScaleEntry;
  };
  pairingRationale: string;  // why these fonts work together
  usageTips:        string[];
}

// ── Extended: Logo guidelines ────────────────────────────────────────────────

export interface LogoGuidelines {
  clearSpaceRule:     string;  // e.g. "Minimum clear space = cap-height of the wordmark on all sides"
  minimumSize: {
    digital: string;  // e.g. "80px wide"
    print:   string;  // e.g. "20mm wide"
  };
  placementPreference: string; // e.g. "Top-left corner preferred in all layouts"
  backgroundRules:     string; // e.g. "Use dark version on backgrounds lighter than #888"
  dos:   string[];
  donts: string[];
}

// ── Extended: Graphic elements ───────────────────────────────────────────────

export interface GraphicElements {
  shapeLanguage:   string;   // e.g. "Rounded corners, soft geometry, no sharp angles"
  iconStyle:       string;   // e.g. "Outline icons, 2px stroke, consistent 24px grid"
  patternUsage:    string;   // e.g. "Subtle diagonal line pattern as background texture only"
  layoutPrinciple: string;   // e.g. "Asymmetric layouts with strong left-aligned hierarchy"
  decorativeNotes: string;   // e.g. "Avoid heavy drop shadows; use flat elevation instead"
  websiteApplication: {
    hero:     string;   // e.g. "Large abstract shape motif in background, low opacity"
    cards:    string;   // e.g. "Flat cards, 8px radius, 1px neutral border"
    sections: string;   // e.g. "Alternating white/secondary background sections"
    dividers: string;   // e.g. "Use accent-colored 2px horizontal rules between major sections"
  };
}

// ── Extended: Photography style ──────────────────────────────────────────────

export interface PhotographyStyle {
  mood:           string;   // e.g. "Warm, optimistic, candid"
  subjectMatter:  string;   // e.g. "Real people in professional settings, diverse representation"
  lighting:       string;   // e.g. "Natural light preferred, soft shadows, avoid harsh studio flash"
  colorTreatment: string;   // e.g. "Slightly warm-toned, avoid high contrast B&W"
  composition:    string;   // e.g. "Rule of thirds, breathing room around subjects"
  avoidances:     string[];
  stockPhotoTips: string;   // e.g. "Avoid posed 'toothpaste smile' shots; prefer authentic moments"
}

// ── Extended: Web usage map ──────────────────────────────────────────────────

export interface WebComponentUsage {
  background:   string;  // which palette color
  text:         string;  // which type style + palette color
  accent?:      string;  // optional highlight color
  border?:      string;  // optional border color
  notes:        string;  // special rules or exceptions
}

export interface WebUsageMap {
  navbar:     WebComponentUsage;
  hero:       WebComponentUsage;
  cards:      WebComponentUsage;
  cta:        WebComponentUsage;  // call-to-action buttons
  footer:     WebComponentUsage;
  forms:      WebComponentUsage;
  badges:     WebComponentUsage;
  alerts:     WebComponentUsage;
  globalNotes: string[];
}

// ── Extended: Brand voice ────────────────────────────────────────────────────

export interface BrandVoice {
  toneDescriptors:  string[];  // e.g. ["confident", "approachable", "never corporate"]
  exampleHeadlines: string[];  // 3–4 sample headlines matching the brand voice
  exampleBodyCopy:  string;    // a short paragraph example
  wordsToUse:       string[];  // vocabulary that fits the brand
  wordsToAvoid:     string[];  // clichés or off-brand vocabulary
  writingRules:     string[];  // e.g. "Use active voice", "Avoid jargon", "Short sentences"
}

// ── Extended: Asset guidelines ───────────────────────────────────────────────

export interface AssetRule {
  layout:     string;
  colors:     string;
  typography: string;
  dos:        string[];
  donts:      string[];
}

export interface AssetGuidelines {
  flyer:            AssetRule;
  socialCard:       AssetRule;  // 1:1 and 16:9 social posts
  emailHeader:      AssetRule;
  presentationDeck: AssetRule;
  generalRules:     string[];   // rules that apply across all assets
}

// ── Full BrandBook ───────────────────────────────────────────────────────────

export interface BrandBook {
  id:          string;
  companyName: string;
  createdAt:   string;

  // core (always generated)
  brandDNA:   BrandDNA;
  palette:    Palette;
  typography: Typography;
  logoUrl:    string | null;
  logoPrompt: string;

  // extended (always generated now)
  colorSystem:      ColorSystem;
  typographySystem: TypographySystem;
  logoGuidelines:   LogoGuidelines;
  graphicElements:  GraphicElements;
  photographyStyle: PhotographyStyle;
  webUsageMap:      WebUsageMap;
  brandVoice:       BrandVoice;
  assetGuidelines:  AssetGuidelines;
}

// ── SSE ──────────────────────────────────────────────────────────────────────

export type SSEStep =
  | "analyzing"
  | "palette"
  | "typography"
  | "voice"
  | "guidelines"
  | "done"
  | "error";

export interface SSEEvent {
  step:      SSEStep;
  progress:  number;   // 0–100
  message:   string;
  data?:     unknown;
}