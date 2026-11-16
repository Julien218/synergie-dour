import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  emptyHoliday,
  holidayConsentText,
  NOTICE_VERSION,
  type HolidayInput,
} from "@shared/holidayCampaign";
import "./holiday.css";

type FileInfo = { id: string; name: string; size: number };
export async function holidayApi(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string
) {
  const response = await fetch(`/api/holiday${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response
    .json()
    .catch(() => ({ message: "Le service ne répond pas. Réessayez." }));
  if (!response.ok) throw new Error(data.message || "Une erreur est survenue.");
  return data;
}
export default function HolidayCampaign() {
  const [token] = useState(() => {
    const fragment = window.location.hash.slice(1);
    if (/^[a-f0-9]{64}$/.test(fragment)) {
      sessionStorage.setItem("holiday-private-link", fragment);
      history.replaceState(null, "", window.location.pathname);
      return fragment;
    }
    return sessionStorage.getItem("holiday-private-link") || "";
  });
  const [form, setForm] = useState<HolidayInput>({ ...emptyHoliday });
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("draft");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    const old = document.title;
    document.title = "Fêtes 2026 · Synergie Dour";
    return () => {
      meta.remove();
      document.title = old;
    };
  }, []);
  async function load() {
    const d = await holidayApi("/dossier", "GET", undefined, token);
    setRevision(d.revision);
    setFiles(d.files);
    setStatus(d.status);
    return d;
  }
  useEffect(() => {
    if (token)
      load()
        .then(d => {
          setForm(
            d.payload || {
              ...emptyHoliday,
              businessName: d.merchant.businessName,
              activity: d.merchant.businessCategory,
              address: d.merchant.address,
              phone: d.merchant.phone || "",
              email: d.merchant.email || "",
              website: d.merchant.website?.startsWith("https:")
                ? d.merchant.website
                : "",
            }
          );
          setReady(true);
        })
        .catch(e => setError(e.message));
  }, [token]);
  const field = (
    key: keyof HolidayInput,
    label: string,
    required = false,
    type = "text",
    wide = false
  ) => (
    <label className={wide ? "holiday-wide" : ""} key={key}>
      {label}
      {required ? " *" : ""}
      <input
        name={key}
        type={type}
        required={required}
        maxLength={
          key === "phone"
            ? 30
            : key === "email"
              ? 320
              : type === "url"
                ? 500
                : 255
        }
        value={String(form[key])}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );
  const text = (
    key: keyof HolidayInput,
    label: string,
    placeholder: string
  ) => (
    <label className="holiday-wide">
      {label}
      <textarea
        name={key}
        rows={3}
        maxLength={key === "offer" ? 5000 : 1500}
        value={String(form[key])}
        placeholder={placeholder}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );
  async function save(submit: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await holidayApi("/dossier", "PUT", { payload: form, revision }, token);
      await load();
      if (submit) {
        await holidayApi("/submit", "POST", {}, token);
        await load();
      }
      setMessage(
        submit
          ? "Merci ! Votre dossier a été transmis à l’équipe. Aucune publication n’a encore lieu."
          : "Votre fiche est enregistrée. Revenez avec votre lien privé pour la compléter."
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(list: FileList | null) {
    if (!list) return;
    if (!form.processingConsent || !form.rightsConfirmed) {
      setError(
        "Cochez les accords de traitement et de droits dans la section 4 avant d’envoyer vos fichiers."
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(list)) {
        if (file.size > 50 * 1024 * 1024)
          throw new Error(`${file.name} dépasse 50 Mo.`);
        const r = await fetch("/api/holiday/files", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/octet-stream",
            "X-File-Name": encodeURIComponent(file.name),
            "X-Processing-Consent": NOTICE_VERSION,
          },
          body: file,
        });
        if (!r.ok)
          throw new Error((await r.json()).message || "Envoi interrompu.");
        await load();
      }
      setMessage(
        "Fichiers reçus. Pensez à transmettre votre dossier lorsque tout est prêt."
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="holiday-page">
      <header className="holiday-header">
        <Link href="/" className="holiday-brand">
          <img
            src="/logo-fetes-transparent.png"
            alt="Synergie Dour — accueil"
          />
          <span>
            <strong>Synergie Dour</strong>
            <small>Commerçants &amp; indépendants réunis</small>
          </span>
        </Link>
        <span className="holiday-header-season">
          La magie des fêtes, près de chez vous
        </span>
        <a href="mailto:info@synergiedour.be">Besoin d’aide ?</a>
      </header>
      <main>
        <section className="holiday-hero">
          <div className="holiday-garland" aria-hidden="true">
            <svg
              viewBox="0 0 1200 80"
              preserveAspectRatio="none"
              focusable="false"
            >
              <defs>
                <pattern
                  id="holiday-pine"
                  width="64"
                  height="70"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M-10 6 L74 15 M6 9 l-18 25 M18 10 l-18 32 M30 11 l-17 36 M42 12 l-13 32 M54 13 l-10 25 M66 14 l-8 20"
                    fill="none"
                    stroke="#36594b"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 5 L64 12 M16 8 l-12 23 M39 10 l-9 24 M58 12 l-6 18"
                    fill="none"
                    stroke="#59735c"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </pattern>
              </defs>
              <path d="M0 0H1200V65H0Z" fill="url(#holiday-pine)" />
              <path
                d="M0 25Q150 84 300 25T600 25T900 25T1200 25"
                fill="none"
                stroke="#b69a53"
                strokeWidth="1.3"
              />
              {[75, 225, 375, 525, 675, 825, 975, 1125].map((x, i) => (
                <g key={x}>
                  <circle
                    cx={x}
                    cy={i % 2 ? 47 : 48}
                    r="9"
                    fill="#e8c547"
                    opacity=".12"
                  />
                  <circle cx={x} cy={i % 2 ? 47 : 48} r="3" fill="#ffe5a3" />
                </g>
              ))}
            </svg>
          </div>
          <div className="holiday-baubles" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="holiday-snowflakes" aria-hidden="true">
            <span>❄</span>
            <span>✦</span>
            <span>❄</span>
            <span>✧</span>
          </div>
          <div className="holiday-hero-copy">
            <p className="holiday-eyebrow">
              <Sparkles size={16} /> CAMPAGNE DES FÊTES · 2026
            </p>
            <h1>
              Les fêtes brillent
              <br />
              dans <em>vos commerces.</em>
            </h1>
            <p>
              Menus de fête, idées cadeaux, savoir-faire local… Partagez ce qui
              rend votre commerce unique. Ensemble, donnons aux habitants
              l’envie de préparer leurs fêtes à Dour.
            </p>
            <a className="holiday-primary" href="#participer">
              Préparer ma mise en lumière <ArrowRight size={18} />
            </a>
            <small>Réservé aux commerçants adhérents à Synergie Dour.</small>
          </div>
          <aside>
            <div className="holiday-card-ribbon" aria-hidden="true">
              <i />
              <i />
            </div>
            <Gift size={50} strokeWidth={1} />
            <span>ACHETONS LOCAL</span>
            <strong>
              Un commerce.
              <br />
              Une histoire.
              <br />
              Des fêtes à partager.
            </strong>
            <p>
              Vos photos + vos offres
              <br />→ une mise en lumière par Synergie Dour
            </p>
            <span className="holiday-spark">✦</span>
          </aside>
        </section>
        <section className="holiday-steps" aria-label="Les étapes">
          {[
            ["01", "Vous partagez", "Une fiche, vos photos, vidéos et menus."],
            [
              "02",
              "Nous préparons",
              "Une vidéo festive et un post adaptés à votre commerce.",
            ],
            [
              "03",
              "Nous validons",
              "Julien, puis Olivier, relisent avant diffusion.",
            ],
            [
              "04",
              "Vous relayez",
              "Après publication, recevez le lien pour le repartager.",
            ],
          ].map(([n, t, d]) => (
            <div key={n}>
              <b>{n}</b>
              <h2>{t}</h2>
              <p>{d}</p>
            </div>
          ))}
        </section>
        <section id="participer" className="holiday-form-section">
          <div className="holiday-section-intro">
            <p className="holiday-eyebrow">VOTRE COMMERCE À L’HONNEUR</p>
            <h2>Préparons vos fêtes, ensemble.</h2>
            <p>
              Les champs marqués d’un * sont nécessaires. Les autres vous
              permettent d’enrichir votre présentation.
            </p>
          </div>
          {!token ? (
            <div className="holiday-notice">
              <ShieldCheck />
              <div>
                <strong>
                  Votre invitation personnelle vous donne accès au formulaire.
                </strong>
                <p>
                  Utilisez votre lien personnel Synergie Dour pour enregistrer
                  votre fiche et vos fichiers pour les fêtes 2026. Vous n’avez
                  pas de lien ?{" "}
                  <a href="mailto:info@synergiedour.be">Contactez-nous</a>.
                </p>
              </div>
            </div>
          ) : null}
          {error ? (
            <div className="holiday-error" role="alert">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="holiday-success" role="status">
              <CheckCircle2 />
              {message}
            </div>
          ) : null}
          <form
            onSubmit={e => {
              e.preventDefault();
              void save(true);
            }}
          >
            <fieldset disabled={busy || !ready || status === "withdrawn"}>
              <section className="holiday-card">
                <h3>
                  <span>1</span> Faisons connaissance
                </h3>
                <p>
                  L’email de contact reste privé. Indiquez uniquement les
                  coordonnées professionnelles que vous souhaitez diffuser dans
                  les autres champs.
                </p>
                <div className="holiday-grid">
                  {field("businessName", "Nom du commerce", true)}
                  {field("activity", "Activité", true)}
                  {field("address", "Adresse du commerce", true, "text", true)}
                  {field("contactName", "Personne de contact (privé)", true)}
                  {field("email", "Email de contact (privé)", true, "email")}
                  {field("phone", "Téléphone professionnel", true, "tel")}
                  {field("website", "Site internet", false, "url")}
                </div>
              </section>
              <section className="holiday-card">
                <h3>
                  <span>2</span> Restons connectés
                </h3>
                <p>
                  Les liens de vos pages professionnelles, en commençant par
                  https://
                </p>
                <div className="holiday-grid">
                  {field("facebook", "Facebook", false, "url")}
                  {field("instagram", "Instagram", false, "url")}
                  {field("tiktok", "TikTok", false, "url")}
                </div>
              </section>
              <section className="holiday-card">
                <h3>
                  <span>3</span> Vos offres & menus de fêtes
                </h3>
                <div className="holiday-grid">
                  {text(
                    "offer",
                    "Que souhaitez-vous mettre en avant ?",
                    "Menu de Noël, prix TTC, coffret cadeau, conditions de votre offre…"
                  )}
                  {text(
                    "hours",
                    "Horaires des fêtes",
                    "Ouvertures exceptionnelles et fermetures…"
                  )}
                  {field(
                    "orderDeadline",
                    "Date limite de commande",
                    false,
                    "date"
                  )}
                  {text(
                    "fulfillment",
                    "Commandes, réservations, retrait & livraison",
                    "Comment commander ? Où et quand retirer ? Proposez-vous la livraison et à quelles conditions ?"
                  )}
                </div>
              </section>
              <section className="holiday-card">
                <h3>
                  <span>4</span> Vos autorisations, en toute clarté
                </h3>
                {(
                  [
                    ["processingConsent", holidayConsentText.processing, true],
                    ["rightsConfirmed", holidayConsentText.rights, true],
                    [
                      "publicationConsent",
                      holidayConsentText.publication,
                      false,
                    ],
                  ] as const
                ).map(([key, label, required]) => (
                  <label className="holiday-check" key={key}>
                    <input
                      type="checkbox"
                      required={required}
                      checked={form[key]}
                      onChange={e =>
                        setForm({ ...form, [key]: e.target.checked })
                      }
                    />
                    <span>
                      {label}
                      {required ? " *" : ""}
                    </span>
                  </label>
                ))}
                <details className="holiday-privacy">
                  <summary>
                    Comment mes données seront-elles utilisées ?
                  </summary>
                  <p>
                    Responsable : ASBL Synergie Dour, Grand’Place 9, 7370 Dour,
                    BE 1036.801.623. Contact : info@synergiedour.be. Votre
                    consentement permet de traiter votre dossier pour les fêtes
                    2026. L’autorisation de diffusion est facultative ; la
                    refuser n’empêche pas de transmettre votre dossier.
                  </p>
                  <p>
                    Accès réservé à l’équipe habilitée et à ses prestataires de
                    production. Les coordonnées de contact privées ne figurent
                    pas dans les publications. Avec votre accord de diffusion,
                    les contenus pourront être publiés sur le site et les
                    réseaux sociaux de Synergie Dour ; les plateformes
                    appliquent leurs propres conditions, notamment de transferts
                    hors EEE. Aucun fichier n’est transmis à un outil de
                    génération pendant cette préparation.
                  </p>
                  <p>
                    Collecte et campagne jusqu’au 31 décembre 2026. Suppression
                    prévue des dossiers et fichiers de campagne au plus tard le
                    31 mars 2027. Les publications et repartages déjà diffusés
                    peuvent subsister sur les plateformes : contactez-nous pour
                    demander leur retrait des comptes que nous gérons.
                  </p>
                  <p>
                    Vous pouvez demander l’accès, la rectification,
                    l’effacement, la limitation ou la portabilité de vos
                    données. Retirez votre accord avec le bouton ci-dessous ou
                    par email, sans effet rétroactif. Réclamation possible
                    auprès de l’
                    <a
                      href="https://www.autoriteprotectiondonnees.be/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Autorité de protection des données
                    </a>
                    .{" "}
                    <Link href="/privacy">
                      Politique générale de confidentialité
                    </Link>
                    .
                  </p>
                </details>
              </section>
              <section className="holiday-card">
                <h3>
                  <span>5</span> Vos photos, vidéos & menus
                </h3>
                <p>
                  Logo, façade, produits, équipe ou menu PDF : privilégiez vos
                  fichiers originaux. Évitez les données de clients, les visages
                  sans accord et les musiques sans autorisation.
                </p>
                <label className="holiday-upload">
                  <Upload />
                  <strong>Choisir mes fichiers</strong>
                  <span>
                    JPG, PNG, WebP, PDF, MP4, MOV · 50 Mo par fichier
                    <br />
                    15 fichiers et 200 Mo au total · analyse antivirus avant
                    acceptation
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.mp4,.mov"
                    onChange={e => {
                      void upload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <ul className="holiday-files">
                  {files.map(f => (
                    <li key={f.id}>
                      <span>
                        {f.name}{" "}
                        <small>({(f.size / 1024 / 1024).toFixed(1)} Mo)</small>
                      </span>
                      <button
                        type="button"
                        aria-label={`Supprimer ${f.name}`}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await holidayApi(
                              `/files/${f.id}`,
                              "DELETE",
                              undefined,
                              token
                            );
                            await load();
                          } catch (e: any) {
                            setError(e.message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <X size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <div className="holiday-actions">
                <button
                  type="button"
                  className="holiday-secondary"
                  onClick={() => void save(false)}
                >
                  Enregistrer pour compléter plus tard
                </button>
                <button type="submit" className="holiday-primary">
                  {busy ? "Traitement en cours…" : "Transmettre mon dossier"}
                  <ArrowRight size={18} />
                </button>
              </div>
              <p className="holiday-caption">
                Vos contenus passent par une validation interne. Leur
                transmission ne déclenche aucune publication immédiate.
              </p>
            </fieldset>
          </form>
          {ready && status !== "withdrawn" ? (
            <button
              className="holiday-withdraw"
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    "Retirer vos accords et supprimer les données et fichiers de cette campagne ?"
                  )
                )
                  return;
                setBusy(true);
                try {
                  await holidayApi("/withdraw", "POST", {}, token);
                  sessionStorage.removeItem("holiday-private-link");
                  setStatus("withdrawn");
                  setReady(false);
                  setMessage(
                    "Vos accords sont retirés. Le dossier et ses fichiers sont supprimés. Contactez-nous pour le retrait de publications déjà diffusées."
                  );
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Retirer mes accords et supprimer mon dossier
            </button>
          ) : null}
        </section>
      </main>
      <footer className="holiday-footer">
        <img src="/logo-fetes-transparent.png" alt="Synergie Dour" />
        <p>Ensemble, faisons vivre le commerce local.</p>
        <Link href="/privacy">Confidentialité</Link>
        <a href="mailto:info@synergiedour.be">Nous contacter</a>
      </footer>
    </div>
  );
}
