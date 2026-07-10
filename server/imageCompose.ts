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

// ── Chemin vers les logos officiels sur le serveur ───────────────────────────
function getLogoPath(filename: string): string {
  const candidates = [
    path.join(process.cwd(), "public", filename),
    path.join(process.cwd(), "dist", "public", filename),
    path.join("/app", "public", filename),
    path.join("/app", "dist", "public", filename),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  console.warn("[compose] Logo introuvable dans tous les chemins:", candidates);
  return candidates[0];
}

// ── Composer l'image finale avec les vrais logos officiels ───────────────────
// Règles :
// - Logo Synergie Dour  : coin haut-droit, 22% largeur, marges sécurité
// - Logo JS-Innov.IA    : coin bas-droit, 15% largeur, discret
// - Aucun texte ou logo inventé par l'IA
// - Les logos sont ajoutés comme calques réels depuis les fichiers officiels
export async function composeWithLogos(
  baseImageUrl: string,
  options: {
    logoSD?: boolean;
    logoJS?: boolean;
    outputWidth?: number;
    outputHeight?: number;
  } = {}
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const { logoSD = true, logoJS = true, outputWidth = 1080, outputHeight = 1080 } = options;

  // Télécharger l'image de base (générée par OpenAI — fond uniquement)
  const baseBuffer = await downloadImage(baseImageUrl);

  // Redimensionner à la taille cible
  const baseResized = await sharp(baseBuffer)
    .resize(outputWidth, outputHeight, { fit: "cover" })
    .png()
    .toBuffer();

  const overlays: Array<{ input: Buffer; top: number; left: number }> = [];
  const margin = Math.round(outputWidth * 0.025); // 2.5% de marge

  // ── Logo Synergie Dour — coin haut-droit ─────────────────────────────────
  if (logoSD) {
    const sdPath = getLogoPath("logo-sd-officiel.png");
    if (fs.existsSync(sdPath)) {
      // Ratio logo SD : 739x790 ≈ 1:1.07
      const logoW = Math.round(outputWidth * 0.20);  // 20% de la largeur
      const logoH = Math.round(logoW * (790 / 739)); // respecter le ratio
      const sdResized = await sharp(sdPath)
        .resize(logoW, logoH, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      overlays.push({
        input: sdResized,
        top: margin,
        left: outputWidth - logoW - margin,
      });
      console.log(`[compose] Logo SD placé : top=${margin} left=${outputWidth - logoW - margin} size=${logoW}x${logoH}`);
    } else {
      console.error("[compose] ❌ Logo Synergie Dour non trouvé:", sdPath);
    }
  }

  // ── Logo JS-Innov.IA — coin bas-droit, discret ───────────────────────────
  if (logoJS) {
    const jsPath = getLogoPath("logo-jsinnovia.png");
    if (fs.existsSync(jsPath)) {
      // Logo JS est carré 1024x1024
      const logoW = Math.round(outputWidth * 0.13); // 13% — discret
      const logoH = logoW;
      const jsResized = await sharp(jsPath)
        .resize(logoW, logoH, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      overlays.push({
        input: jsResized,
        top: outputHeight - logoH - margin,
        left: outputWidth - logoW - margin,
      });
      console.log(`[compose] Logo JS placé : top=${outputHeight - logoH - margin} left=${outputWidth - logoW - margin} size=${logoW}x${logoH}`);
    } else {
      console.error("[compose] ❌ Logo JS-Innov.IA non trouvé:", jsPath);
    }
  }

  if (overlays.length === 0) {
    console.warn("[compose] Aucun logo chargé — image retournée sans composition");
    return baseResized;
  }

  // Composition finale — top/left absolus (pas gravity, évite le bug sharp)
  const final = await sharp(baseResized)
    .composite(overlays.map(o => ({ input: o.input, top: o.top, left: o.left })))
    .png()
    .toBuffer();

  console.log(`[compose] ✅ Composition finale : ${final.length} octets, ${overlays.length} logo(s) appliqué(s)`);
  return final;
}
