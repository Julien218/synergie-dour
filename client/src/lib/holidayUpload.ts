import { NOTICE_VERSION } from "@shared/holidayCampaign";

export async function transferHolidayFile(
  file: File,
  access: string,
  load: (access: string) => Promise<{ files: { id: string }[] }>,
  fetcher: typeof fetch = fetch
) {
  if (file.size > 50 * 1024 * 1024)
    throw new Error(`${file.name} dépasse 50 Mo.`);
  const r = await fetcher("/api/holiday/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
      "X-Processing-Consent": NOTICE_VERSION,
    },
    body: file,
  });
  const receipt = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(`${file.name} : ${receipt.message || "Envoi interrompu."}`);
  const dossier = await load(access);
  if (!receipt.id || !dossier.files.some(f => f.id === receipt.id))
    throw new Error(
      `La réception de ${file.name} n’est pas confirmée. Le fichier reste en attente.`
    );
  return receipt.id as string;
}
