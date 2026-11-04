/**
 * Source de vérité applicative pour l'identité Synergie Dour.
 * Toute automatisation doit rester alignée avec docs/brand-kit/2026.
 */
export const SYNERGIE_DOUR_BRAND = {
  version: "2026.11.04",
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
    technologyCredit: "/logo-jsinnovia-officiel.png",
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
  // Référence : ADN visuel réel du site (client/src/index.css, client/index.html)
  palette: {
    navy: "#001a3d",
    navyDeep: "#001533",
    gold: "#D4AF37",
    goldLight: "#E8C547",
    goldPale: "#F0E68C",
    blue: "#003d99",
    blueBright: "#0066CC",
    blueIndigo: "#1a3ba0",
    white: "#FFFFFF",
  },
  typography: {
    display: "Cinzel",
    script: "Dancing Script",
    body: "Montserrat",
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
