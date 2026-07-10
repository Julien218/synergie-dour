import path from "node:path";
import fs from "node:fs";
import https from "node:https";
import http from "node:http";

// ── Télécharger une image depuis une URL ──────────────────────────────────────
export async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// ── Chemins vers les logos officiels sur le serveur ──────────────────────────
function getLogoPath(filename: string): { found: boolean; path: string; candidates: string[] } {
  const candidates = [
    path.join(process.cwd(), "public", filename),
    path.join(process.cwd(), "dist", "public", filename),
    path.join("/app", "public", filename),
    path.join("/app", "dist", "public", filename),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return { found: true, path: p, candidates };
  }
  return { found: false, path: candidates[0], candidates };
}

// ── Résultat de composition ───────────────────────────────────────────────────
export type ComposeResult = {
  buffer: Buffer;
  logosApplied: boolean;
  logosCount: number;
  logosDetails: string[];
  errors: string[];
};

// ── Composer l'image finale avec les vrais logos officiels ───────────────────
// Process en 2 étapes :
//   Étape A (OpenAI) : génère le fond uniquement — aucun logo, aucun monogramme
//   Étape B (ici)   : applique les vrais logos comme calques sharp
//
// Règles de placement :
//   Logo Synergie Dour  → coin haut-droit, 20% largeur, coordonnées absolues
//   Logo JS-Innov.IA    → coin bas-droit,  13% largeur, discret
//   Marges dynamiques   → 2.5% de la largeur (adapte format carré ET vertical)
export async function composeWithLogos(
  baseImageUrl: string,
  options: {
    logoSD?: boolean;
    logoJS?: boolean;
    outputWidth?: number;
    outputHeight?: number;
  } = {}
): Promise<ComposeResult> {
  const TAG = "[compose]";
  const errors: string[] = [];
  const logosDetails: string[] = [];

  const sharp = (await import("sharp")).default;
  const { logoSD = true, logoJS = true, outputWidth = 1080, outputHeight = 1080 } = options;

  console.log(`${TAG} Démarrage — base: ${baseImageUrl.slice(0, 80)}... format: ${outputWidth}x${outputHeight}`);

  // Télécharger l'image de base (générée par OpenAI — fond uniquement)
  let baseBuffer: Buffer;
  try {
    baseBuffer = await downloadImage(baseImageUrl);
    console.log(`${TAG} Image de base téléchargée : ${baseBuffer.length} octets`);
  } catch (dlErr: any) {
    const msg = `Téléchargement image de base échoué: ${dlErr.message}`;
    console.error(`${TAG} ❌ ${msg}`, dlErr.stack);
    throw new Error(msg);
  }

  // Redimensionner à la taille cible
  let baseResized: Buffer;
  try {
    baseResized = await sharp(baseBuffer)
      .resize(outputWidth, outputHeight, { fit: "cover" })
      .png()
      .toBuffer();
    console.log(`${TAG} Image redimensionnée : ${outputWidth}x${outputHeight}`);
  } catch (resizeErr: any) {
    const msg = `Redimensionnement échoué: ${resizeErr.message}`;
    console.error(`${TAG} ❌ ${msg}`, resizeErr.stack);
    throw new Error(msg);
  }

  const overlays: Array<{ input: Buffer; top: number; left: number; label: string }> = [];
  const margin = Math.round(outputWidth * 0.025); // 2.5% — dynamique

  // ── Logo Synergie Dour — coin haut-droit ─────────────────────────────────
  if (logoSD) {
    const sd = getLogoPath("logo-sd-officiel.png");
    if (sd.found) {
      try {
        const fileStat = fs.statSync(sd.path);
        // Ratio logo SD : 739x790 ≈ 1:1.069
        const logoW = Math.round(outputWidth * 0.20);
        const logoH = Math.round(logoW * (790 / 739));
        const top   = margin;
        const left  = outputWidth - logoW - margin;

        const sdResized = await sharp(sd.path)
          .resize(logoW, logoH, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer();

        overlays.push({ input: sdResized, top, left, label: "Logo SD" });
        const detail = `Logo SD OK — ${logoW}x${logoH}px @ top=${top} left=${left} (src: ${sd.path}, ${fileStat.size} octets)`;
        logosDetails.push(detail);
        console.log(`${TAG} ✅ ${detail}`);
      } catch (sdErr: any) {
        const msg = `Chargement logo SD échoué: ${sdErr.message} (path: ${sd.path})`;
        errors.push(msg);
        console.error(`${TAG} ❌ ${msg}`, sdErr.stack);
      }
    } else {
      const msg = `Logo Synergie Dour introuvable. Chemins testés: ${sd.candidates.join(", ")}`;
      errors.push(msg);
      console.error(`${TAG} ❌ ${msg}`);
    }
  }

  // ── Logo JS-Innov.IA — coin bas-droit, discret ───────────────────────────
  if (logoJS) {
    const js = getLogoPath("logo-jsinnovia.png");
    if (js.found) {
      try {
        const fileStat = fs.statSync(js.path);
        // Logo JS carré 1024x1024
        const logoW = Math.round(outputWidth * 0.13); // 13% — discret
        const logoH = logoW;
        const top   = outputHeight - logoH - margin;
        const left  = outputWidth  - logoW - margin;

        const jsResized = await sharp(js.path)
          .resize(logoW, logoH, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer();

        overlays.push({ input: jsResized, top, left, label: "Logo JS" });
        const detail = `Logo JS OK — ${logoW}x${logoH}px @ top=${top} left=${left} (src: ${js.path}, ${fileStat.size} octets)`;
        logosDetails.push(detail);
        console.log(`${TAG} ✅ ${detail}`);
      } catch (jsErr: any) {
        const msg = `Chargement logo JS échoué: ${jsErr.message} (path: ${js.path})`;
        errors.push(msg);
        console.error(`${TAG} ❌ ${msg}`, jsErr.stack);
      }
    } else {
      const msg = `Logo JS-Innov.IA introuvable. Chemins testés: ${js.candidates.join(", ")}`;
      errors.push(msg);
      console.error(`${TAG} ❌ ${msg}`);
    }
  }

  if (overlays.length === 0) {
    const msg = `Aucun logo chargé — image retournée sans composition. Erreurs: ${errors.join(" | ")}`;
    console.warn(`${TAG} ⚠️  ${msg}`);
    return { buffer: baseResized, logosApplied: false, logosCount: 0, logosDetails, errors };
  }

  // Composition finale — coordonnées top/left absolues (jamais gravity — bug sharp)
  let finalBuffer: Buffer;
  try {
    finalBuffer = await sharp(baseResized)
      .composite(overlays.map(o => ({ input: o.input, top: o.top, left: o.left })))
      .png()
      .toBuffer();
    console.log(`${TAG} ✅ Composition finale : ${finalBuffer.length} octets, ${overlays.length}/${[logoSD, logoJS].filter(Boolean).length} logo(s) appliqué(s) [${overlays.map(o => o.label).join(", ")}]`);
  } catch (compErr: any) {
    const msg = `Composition sharp échouée: ${compErr.message}`;
    errors.push(msg);
    console.error(`${TAG} ❌ ${msg}`, compErr.stack);
    // Retourner l'image de base redimensionnée si la composition échoue
    return { buffer: baseResized, logosApplied: false, logosCount: 0, logosDetails, errors };
  }

  return {
    buffer: finalBuffer,
    logosApplied: overlays.length > 0,
    logosCount: overlays.length,
    logosDetails,
    errors,
  };
}
