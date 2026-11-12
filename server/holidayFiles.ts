import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export const MAX_FILE = 50 * 1024 * 1024;
export const MAX_TOTAL = 200 * 1024 * 1024;
export const MAX_FILES = 15;
export function detectHolidayFile(data: Buffer, filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (data.length < 12 || data.length > MAX_FILE)
    throw new Error("Fichier vide, incomplet ou supérieur à 50 Mo.");
  const ascii = (a: number, b: number) => data.toString("ascii", a, b);
  if (
    [".jpg", ".jpeg"].includes(ext) &&
    data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
  )
    return "image/jpeg";
  if (
    ext === ".png" &&
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (ext === ".webp" && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP")
    return "image/webp";
  if (ext === ".pdf" && ascii(0, 5) === "%PDF-") return "application/pdf";
  if ([".mp4", ".mov"].includes(ext) && ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (
      ["isom", "iso2", "mp41", "mp42", "avc1", "M4V ", "qt  "].includes(brand)
    )
      return ext === ".mov" ? "video/quicktime" : "video/mp4";
  }
  throw new Error(
    "Format refusé. Utilisez JPG, PNG, WebP, PDF, MP4 ou MOV avec leur extension d’origine."
  );
}
export function privateFilePath(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Identifiant invalide");
  const root = process.env.HOLIDAY_UPLOAD_DIR;
  if (!root || !path.isAbsolute(root))
    throw new Error("Stockage privé non configuré");
  const resolved = path.resolve(root);
  const project = process.cwd();
  if (
    ["client", "dist", "public"].some(
      p =>
        resolved === path.join(project, p) ||
        resolved.startsWith(path.join(project, p) + path.sep)
    )
  )
    throw new Error("Stockage public interdit");
  return path.join(resolved, id);
}
export async function scanAndStore(data: Buffer) {
  const scanner = process.env.HOLIDAY_CLAMSCAN;
  if (!scanner || !path.isAbsolute(scanner))
    throw new Error(
      "Analyse antivirus non configurée : aucun fichier accepté."
    );
  const id = randomUUID();
  const target = privateFilePath(id);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  await writeFile(target, data, { flag: "wx", mode: 0o600 });
  try {
    await promisify(execFile)(scanner, ["--no-summary", target], {
      timeout: 120000,
      maxBuffer: 4096,
    });
    return id;
  } catch {
    await unlink(target).catch(() => {});
    throw new Error("Fichier refusé ou analyse antivirus indisponible.");
  }
}
