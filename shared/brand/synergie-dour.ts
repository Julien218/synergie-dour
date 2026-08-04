/**
 * Source de vérité applicative pour l'identité Synergie Dour.
 * Toute automatisation doit rester alignée avec docs/brand-kit/2026.
 */
export const SYNERGIE_DOUR_BRAND = {
  version: "2026.08.05",
  status: "production",
  locale: "fr-BE",
  identity: {
    publicName: "Synergie Dour",
    institutionalName: "ASBL Synergie Dour",
    signature: "Commerçants & indépendants réunis",
  },
  assets: {
    applicationLogo: "/logo-sd-officiel.png",
    transparentLogo: "/logo-transparent.png",
    technologyCredit: "/logo-jsinnovia.png",
  },
  docs: {
    root: "docs/brand-kit/2026",
    agentIndex: "docs/brand-kit/2026/AGENT_INDEX.json",
    rules: "docs/brand-kit/2026/06_REGLES_ET_PROMPTS/brand-rules.json",
    visualPrompt:
      "docs/brand-kit/2026/06_REGLES_ET_PROMPTS/SYSTEM_PROMPT_AGENT_VISUEL.md",
    editorialGuide:
      "docs/brand-kit/2026/06_REGLES_ET_PROMPTS/GUIDE_EDITORIAL.md",
  },
  palette: {
    navy: "#070A2A",
    deepNavy: "#020E61",
    royalBlue: "#0942B2",
    electricBlue: "#2685E8",
    cyan: "#70C7FB",
    gold: "#FED613",
    amber: "#DA8B01",
    cream: "#F7F5EC",
    white: "#FFFFFF",
    ink: "#101934",
  },
  policy: {
    mode: "fail-closed",
    forbidden: [
      "redraw-logo",
      "generate-logo-with-ai",
      "distort-logo",
      "recolor-logo",
      "crop-logo",
      "merge-brand-logos",
      "invent-local-facts",
      "publish-unproofread-text",
    ],
    qualityGate: [
      "orthography-validated",
      "official-logo-used",
      "ratio-preserved",
      "contrast-readable",
      "safe-margins-respected",
      "export-not-pixelated",
      "factual-data-confirmed",
    ],
  },
} as const;

export type SynergieDourBrand = typeof SYNERGIE_DOUR_BRAND;
