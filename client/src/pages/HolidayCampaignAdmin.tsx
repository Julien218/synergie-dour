import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { holidayApi } from "./HolidayCampaign";

const labels: Record<string, string> = {
  draft: "À compléter",
  unverified_draft: "Brouillon · adhésion à vérifier",
  membership_pending: "Reçu · adhésion à vérifier",
  submitted: "Reçu",
  approved: "Dossier validé",
  changes_requested: "À corriger",
  withdrawn: "Accords retirés",
  awaiting_elynea: "À transmettre à Elynea",
  julien_review: "Validation Julien",
  olivier_review: "Validation Olivier",
  ready_to_publish: "Validé · publication désactivée",
  cancelled: "Annulé",
};
export default function HolidayCampaignAdmin() {
  const merchants = trpc.merchants.listAll.useQuery();
  const [selected, setSelected] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [link, setLink] = useState("");
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [files, setFiles] = useState<Record<string, any[]>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<number, string>>({});
  const [attachments, setAttachments] = useState<Record<string, string>>({});
  const [membershipChecks, setMembershipChecks] = useState<
    Record<string, boolean>
  >({});
  async function refresh() {
    const d = await holidayApi("/admin/dossiers");
    setDossiers(d.dossiers);
    const j = await holidayApi("/admin/jobs");
    setJobs(j.jobs);
  }
  async function run(fn: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh().catch(e => setError(e.message));
  }, []);
  return (
    <DashboardLayout>
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold text-blue-950">
          Campagne des fêtes 2026
        </h1>
        <p className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          Collecte des adhérents pour les fêtes, jusqu’au 31 décembre 2026. Les
          fiches reçues depuis le lien général attendent une vérification
          d’adhésion. Les invitations sont préparées ici, sans envoi
          automatique. Les vidéos et publications restent soumises aux
          validations de Julien puis Olivier.
        </p>
        {error && (
          <p role="alert" className="text-red-800 bg-red-50 p-4">
            {error}
          </p>
        )}
        <section className="border rounded-xl p-5 space-y-4">
          <h2 className="font-bold text-xl">Préparer une invitation privée</h2>
          <label className="block">
            Commerce du CRM
            <select
              className="block border rounded p-3 w-full"
              value={selected}
              onChange={e => {
                setSelected(e.target.value);
                setLink("");
                setConfirmed(false);
              }}
            >
              <option value="">Choisir un commerce approuvé</option>
              {(merchants.data || [])
                .filter(m => m.status === "approved")
                .map(m => (
                  <option key={m.id} value={m.id}>
                    {m.businessName}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
            />
            J’ai vérifié que ce commerce est adhérent à Synergie Dour.
          </label>
          <button
            className="bg-blue-950 text-white px-4 py-2 rounded disabled:opacity-40"
            disabled={busy || !selected || !confirmed}
            onClick={() =>
              void run(async () => {
                const d = await holidayApi("/admin/invite", "POST", {
                  merchantId: Number(selected),
                  membershipConfirmed: true,
                });
                setLink(window.location.origin + d.path);
              })
            }
          >
            Générer le lien sans envoyer d’email
          </button>
          {link && (
            <div className="space-y-2">
              <p>
                Ce lien donne accès au dossier. Un nouveau lien invalide le
                précédent.
              </p>
              <input
                aria-label="Lien privé à copier"
                readOnly
                value={link}
                className="w-full border p-2 rounded"
              />
              <button
                className="underline"
                onClick={() => void navigator.clipboard.writeText(link)}
              >
                Copier le lien privé
              </button>
            </div>
          )}
        </section>
        <section className="space-y-4">
          <h2 className="font-bold text-xl">Dossiers rattachés au CRM</h2>
          {!dossiers.length && <p>Aucun dossier disponible.</p>}
          {dossiers.map(d => (
            <article key={d.id} className="border rounded-xl p-5 space-y-3">
              <div className="flex flex-wrap justify-between gap-3">
                <h3 className="font-bold">
                  {d.businessName}
                  {d.merchantId
                    ? ` · CRM #${d.merchantId}`
                    : " · adhésion à vérifier"}
                </h3>
                <span>
                  {labels[d.status] || d.status} · version {d.revision}
                </span>
              </div>
              {d.payload && (
                <dl className="grid sm:grid-cols-2 gap-3">
                  {Object.entries(d.payload).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-gray-600">
                        {(
                          {
                            businessName: "Commerce",
                            activity: "Activité",
                            address: "Adresse",
                            contactName: "Contact privé",
                            email: "Email privé",
                            phone: "Téléphone",
                            offer: "Offres et menus",
                            hours: "Horaires",
                            orderDeadline: "Date limite",
                            fulfillment: "Commande et livraison",
                            processingConsent: "Accord de traitement",
                            publicationConsent: "Accord de diffusion",
                            rightsConfirmed: "Droits confirmés",
                          } as Record<string, string>
                        )[k] || k}
                      </dt>
                      <dd className="whitespace-pre-wrap break-words">
                        {typeof v === "boolean"
                          ? v
                            ? "Oui"
                            : "Non"
                          : String(v) || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {!d.merchantId &&
                ["unverified_draft", "membership_pending"].includes(
                  d.status
                ) && (
                  <section className="rounded-lg bg-amber-50 p-4 space-y-3">
                    <h4 className="font-bold">
                      Vérifier l’adhésion et rattacher le commerce
                    </h4>
                    <p>
                      Aucune production ni diffusion ne démarre avant ce
                      contrôle. Vérifiez les coordonnées auprès de votre liste
                      d’adhérents ; si nécessaire, créez d’abord sa fiche dans
                      la gestion des commerçants.
                    </p>
                    <label className="block">
                      Commerce adhérent du CRM
                      <select
                        className="block border rounded p-3 w-full"
                        value={attachments[d.id] || ""}
                        onChange={e => {
                          setAttachments({
                            ...attachments,
                            [d.id]: e.target.value,
                          });
                          setMembershipChecks({
                            ...membershipChecks,
                            [d.id]: false,
                          });
                        }}
                      >
                        <option value="">Choisir le commerce confirmé</option>
                        {(merchants.data || [])
                          .filter(m => m.status === "approved")
                          .map(m => (
                            <option key={m.id} value={m.id}>
                              {m.businessName}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="flex gap-2">
                      <input
                        type="checkbox"
                        checked={membershipChecks[d.id] || false}
                        onChange={e =>
                          setMembershipChecks({
                            ...membershipChecks,
                            [d.id]: e.target.checked,
                          })
                        }
                      />
                      J’ai vérifié l’adhésion et l’identité du contact.
                    </label>
                    <button
                      className="bg-blue-950 text-white px-4 py-2 rounded disabled:opacity-40"
                      disabled={
                        busy || !attachments[d.id] || !membershipChecks[d.id]
                      }
                      onClick={() =>
                        void run(async () => {
                          await holidayApi(
                            `/admin/dossiers/${d.id}/attach`,
                            "POST",
                            {
                              merchantId: Number(attachments[d.id]),
                              membershipConfirmed: true,
                              revision: d.revision,
                            }
                          );
                        })
                      }
                    >
                      Confirmer l’adhésion et rattacher la fiche
                    </button>
                  </section>
                )}
              <button
                className="underline"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const r = await holidayApi(`/admin/dossiers/${d.id}/files`);
                    setFiles(f => ({ ...f, [d.id]: r.files }));
                  })
                }
              >
                Consulter les fichiers privés
              </button>
              <ul>
                {files[d.id]?.map(f => (
                  <li key={f.id}>
                    <a
                      href={`/api/holiday/admin/files/${f.id}`}
                      download
                      className="underline"
                    >
                      {f.name}
                    </a>
                  </li>
                ))}
              </ul>
              {d.status === "submitted" && (
                <div className="flex gap-4">
                  <button
                    disabled={busy}
                    className="border px-4 py-2 rounded"
                    onClick={() =>
                      void run(async () => {
                        await holidayApi(
                          `/admin/dossiers/${d.id}/review`,
                          "POST",
                          { revision: d.revision, decision: "approved" }
                        );
                      })
                    }
                  >
                    Valider le dossier
                  </button>
                  <button
                    disabled={busy}
                    className="underline"
                    onClick={() =>
                      void run(async () => {
                        await holidayApi(
                          `/admin/dossiers/${d.id}/review`,
                          "POST",
                          {
                            revision: d.revision,
                            decision: "changes_requested",
                          }
                        );
                      })
                    }
                  >
                    Demander une correction
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
        <section className="space-y-4">
          <h2 className="font-bold text-xl">Production & double validation</h2>
          <p>
            La file Elynea est préparée. Son raccordement à la génération et au
            module de publication reste à valider avant activation.
          </p>
          {jobs.map(j => (
            <article key={j.id} className="border rounded-xl p-5 space-y-3">
              <h3 className="font-bold">
                {j.businessName} · {labels[j.status] || j.status}
              </h3>
              {j.result && (
                <>
                  <a
                    className="underline"
                    href={j.result.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Voir la vidéo produite
                  </a>
                  <p className="whitespace-pre-wrap">
                    Voix off : {j.result.voiceover}
                  </p>
                  <p className="whitespace-pre-wrap">
                    Facebook : {j.result.facebook}
                  </p>
                  <p className="whitespace-pre-wrap">
                    Instagram : {j.result.instagram}
                  </p>
                </>
              )}
              {["julien_review", "olivier_review"].includes(j.status) && (
                <button
                  className="bg-blue-950 text-white rounded px-4 py-2"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await holidayApi(`/admin/jobs/${j.id}/approve`, "POST", {
                        stage:
                          j.status === "julien_review" ? "julien" : "olivier",
                      });
                    })
                  }
                >
                  Valider en tant que{" "}
                  {j.status === "julien_review" ? "Julien" : "Olivier"}
                </button>
              )}
              {[
                "awaiting_elynea",
                "julien_review",
                "olivier_review",
                "ready_to_publish",
              ].includes(j.status) && (
                <details>
                  <summary className="cursor-pointer">
                    Importer le résultat de production (préparation)
                  </summary>
                  <p className="text-sm">
                    Toute modification du résultat annule les deux validations.
                  </p>
                  <textarea
                    aria-label="Résultat Elynea JSON"
                    className="border rounded w-full p-3 font-mono text-xs"
                    rows={7}
                    placeholder={
                      '{"videoUrl":"https://…","voiceover":"…","facebook":"…","instagram":"…","decorations":"noel-2026","subtitles":true}'
                    }
                    value={result[j.id] || ""}
                    onChange={e =>
                      setResult({ ...result, [j.id]: e.target.value })
                    }
                  />
                  <button
                    className="underline"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await holidayApi(
                          `/admin/jobs/${j.id}/result`,
                          "POST",
                          JSON.parse(result[j.id])
                        );
                      })
                    }
                  >
                    Enregistrer pour validation Julien
                  </button>
                </details>
              )}
            </article>
          ))}
        </section>
      </main>
    </DashboardLayout>
  );
}
