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
  // Railway: les fichiers public/ sont dans /app/public/ (Express static)
  const candidates = [
    path.join(process.cwd(), "public", filename),
    path.join(process.cwd(), "dist", "public", filename),
    path.join("/app", "public", filename),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0]; // fallback
}

// ── Composer l'image finale avec les vrais logos ─────────────────────────────
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

  // Télécharger l'image de base (générée par OpenAI)
  const baseBuffer = await downloadImage(baseImageUrl);
  
  // Redimensionner à 1080x1080
  let composite = sharp(baseBuffer).resize(outputWidth, outputHeight, { fit: "cover" });
  
  const overlays: sharp.OverlayOptions[] = [];

  // Logo Synergie Dour — coin haut-droit (avec fond blanc semi-transparent)
  if (logoSD) {
    const sdPath = getLogoPath("logo-sd-officiel.png");
    if (fs.existsSync(sdPath)) {
      const logoW = Math.round(outputWidth * 0.22); // 22% de la largeur
      const logoH = Math.round(logoW * 0.45);
      const margin = Math.round(outputWidth * 0.025);
      
      const sdResized = await sharp(sdPath)
        .resize(logoW, logoH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      
      overlays.push({
        input: sdResized,
        gravity: "northeast",
        top: margin,
        left: undefined,
      });
    } else {
      console.warn("[compose] Logo SD non trouvé:", sdPath);
    }
  }

  // Logo JS-Innov.IA — coin bas-droit
  if (logoJS) {
    const jsPath = getLogoPath("logo-jsinnovia.png");
    if (fs.existsSync(jsPath)) {
      const logoW = Math.round(outputWidth * 0.18);
      const logoH = Math.round(logoW * 0.35);
      const margin = Math.round(outputWidth * 0.025);
      
      const jsResized = await sharp(jsPath)
        .resize(logoW, logoH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      
      overlays.push({
        input: jsResized,
        gravity: "southeast",
        top: undefined,
        left: undefined,
      });
    } else {
      console.warn("[compose] Logo JS non trouvé:", jsPath);
    }
  }

  if (overlays.length > 0) {
    composite = sharp(await composite.png().toBuffer()).composite(overlays);
  }

  return composite.png().toBuffer();
}
