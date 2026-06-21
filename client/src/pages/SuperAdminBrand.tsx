import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Shield, Upload, Save, RefreshCw, Eye, Trash2, CheckCircle2,
  XCircle, Archive, Download, Users, Settings, Palette,
  Image as ImageIcon, FileText, Lock, Unlock, ToggleLeft,
  ToggleRight, History, Zap, AlertTriangle, Star
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BrandSettings {
  signature: string;
  site_url: string;
  resources_url: string;
  hashtags: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_premium: string;
  color_text: string;
  default_format: string;
  default_quality: string;
  lock_logo: string;
  lock_signature: string;
  lock_jsi_logo: string;
  test_mode: string;
  require_validation: string;
  logo_url: string;
  jsi_logo_url: string;
  system_prompt: string;
}

interface Generation {
  id: number;
  user_name: string;
  user_email: string;
  template: string;
  title: string;
  content: string;
  image_url: string;
  format: string;
  quality: string;
  status: "pending_validation" | "approved" | "rejected" | "archived";
  validation_note: string;
  validated_by: string;
  logo_present: number;
  signature_present: number;
  brand_compliant: number;
  createdAt: string;
}

const SECTION_NAV = [
  { id: "logos",      label: "Logos officiels",        icon: ImageIcon },
  { id: "signature",  label: "Signature",              icon: FileText },
  { id: "charte",     label: "Charte graphique",       icon: Palette },
  { id: "prompt",     label: "Prompt système",         icon: Zap },
  { id: "formats",    label: "Formats & Qualité",      icon: Settings },
  { id: "validation", label: "Validation",             icon: Shield },
  { id: "history",    label: "Historique visuels",     icon: History },
  { id: "users",      label: "Droits utilisateurs",   icon: Users },
];

const STATUS_CONFIG = {
  pending_validation: { label: "En attente",  color: "#E8C547", bg: "rgba(232,197,71,0.15)" },
  approved:           { label: "Approuvé",    color: "#22c55e", bg: "rgba(34,197,94,0.15)"  },
  rejected:           { label: "Refusé",      color: "#ef4444", bg: "rgba(239,68,68,0.15)"  },
  archived:           { label: "Archivé",     color: "#6b7280", bg: "rgba(107,114,128,0.15)"},
};

// ─── Composant ColorPicker inline ─────────────────────────────────────────────
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 36, height: 36, border: "2px solid rgba(255,255,255,0.2)", borderRadius: 6, cursor: "pointer", background: "none", padding: 2 }} />
      <div>
        <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>{label}</p>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: 0, fontFamily: "monospace" }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}
      onClick={() => onChange(!value)} className="cursor-pointer">
      <div style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? "#E8C547" : "rgba(255,255,255,0.15)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 3, left: value ? 23 : 3,
          width: 18, height: 18, borderRadius: "50%",
          background: value ? "#001533" : "#fff",
          transition: "left 0.2s",
        }} />
      </div>
      <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>{label}</span>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function SuperAdminBrand() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState("logos");
  const [settings, setSettings] = useState<BrandSettings>({
    signature: "By JS-Innov.IA", site_url: "www.synergiedour.be",
    resources_url: "www.synergiedour.be/resources",
    hashtags: "#SynergieDour #JsInnovIA #CommerceLocal #Dour",
    color_primary: "#001533", color_secondary: "#1a3ba0",
    color_accent: "#00aaff", color_premium: "#E8C547",
    color_text: "#ffffff", default_format: "1080x1080",
    default_quality: "high", lock_logo: "true",
    lock_signature: "true", lock_jsi_logo: "true",
    test_mode: "false", require_validation: "true",
    logo_url: "", jsi_logo_url: "", system_prompt: "",
  });
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);
  const [validationNote, setValidationNote] = useState("");

  // Guard super_admin
  useEffect(() => {
    if (user && user.role !== "super_admin" && user.role !== "admin") {
      setLocation("/dashboard");
      toast.error("Accès réservé au Super Admin");
    }
  }, [user]);

  // Charger brand settings
  useEffect(() => {
    fetch("/api/social/brand-settings", { credentials: "include" })
      .then(r => r.json())
      .then(data => setSettings(prev => ({ ...prev, ...data })))
      .catch(() => {});
  }, []);

  // Charger historique
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const r = await fetch("/api/social/generations", { credentials: "include" });
      const data = await r.json();
      setGenerations(Array.isArray(data) ? data : []);
    } catch { toast.error("Erreur chargement historique"); }
    finally { setIsLoadingHistory(false); }
  };

  useEffect(() => { if (activeSection === "history") loadHistory(); }, [activeSection]);

  const set = (key: keyof BrandSettings) => (v: string) =>
    setSettings(prev => ({ ...prev, [key]: v }));

  const setToggle = (key: keyof BrandSettings) => (v: boolean) =>
    setSettings(prev => ({ ...prev, [key]: v ? "true" : "false" }));

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const r = await fetch("/api/social/brand-settings", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (r.ok) {
        toast.success("Paramètres sauvegardés");
      } else {
        let errMsg = `Erreur ${r.status}`;
        try { const d = await r.json(); errMsg = d.message || errMsg; } catch {}
        toast.error(errMsg);
        console.error("[saveSettings]", r.status, errMsg);
      }
    } catch (e: any) { toast.error("Erreur réseau: " + (e.message || "")); }
    finally { setIsSaving(false); }
  };

  const validateGen = async (id: number, status: string) => {
    try {
      const r = await fetch(`/api/social/generations/${id}/validate`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: validationNote }),
      });
      if (r.ok) { toast.success("Statut mis à jour"); loadHistory(); setSelectedGen(null); }
      else toast.error("Erreur");
    } catch { toast.error("Erreur réseau"); }
  };

  const archiveGen = async (id: number) => {
    try {
      const r = await fetch(`/api/social/generations/${id}`, { method: "DELETE", credentials: "include" });
      if (r.ok) { toast.success("Archivé"); loadHistory(); }
    } catch { toast.error("Erreur réseau"); }
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.target = "_blank";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch { toast.error("Téléchargement impossible"); }
  };

  if (!user || user.role !== "super_admin") return null;

  // ─── Render ──────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #0d2260 0%, #0a1a4a 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16, padding: 24,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
    color: "#fff", padding: "10px 14px", fontSize: 13,
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600,
    letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6, display: "block",
  };

  const sectionContent: Record<string, React.ReactNode> = {
    logos: (
      <div>
        <h3 style={{ color: "#E8C547", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Logos officiels</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Logo Synergie Dour */}
          <div style={cardStyle}>
            <p style={{ color: "#fff", fontWeight: 700, marginBottom: 12 }}>Logo Synergie Dour</p>
            {settings.logo_url && (
              <img src={settings.logo_url} alt="Logo SD"
                style={{ width: "100%", maxHeight: 80, objectFit: "contain", marginBottom: 12,
                  background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 8 }} />
            )}
            <label style={labelStyle}>URL du logo (CDN)</label>
            <input style={inputStyle} value={settings.logo_url}
              onChange={e => set("logo_url")(e.target.value)}
              placeholder="https://... ou /logo.png" />
            <Toggle value={settings.lock_logo === "true"} onChange={setToggle("lock_logo")}
              label="Verrouiller présence sur chaque visuel" />
          </div>
          {/* Logo JS-Innov.IA */}
          <div style={cardStyle}>
            <p style={{ color: "#fff", fontWeight: 700, marginBottom: 12 }}>Logo JS-Innov.IA</p>
            {settings.jsi_logo_url && (
              <img src={settings.jsi_logo_url} alt="Logo JSI"
                style={{ width: "100%", maxHeight: 80, objectFit: "contain", marginBottom: 12,
                  background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 8 }} />
            )}
            <label style={labelStyle}>URL du logo (CDN)</label>
            <input style={inputStyle} value={settings.jsi_logo_url}
              onChange={e => set("jsi_logo_url")(e.target.value)}
              placeholder="https://... ou /jsi-logo.png" />
            <Toggle value={settings.lock_jsi_logo === "true"} onChange={setToggle("lock_jsi_logo")}
              label="Verrouiller présence sur chaque visuel" />
          </div>
        </div>
      </div>
    ),

    signature: (
      <div>
        <h3 style={{ color: "#E8C547", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Signature obligatoire</h3>
        <div style={cardStyle}>
          <label style={labelStyle}>Texte de la signature</label>
          <input style={{ ...inputStyle, marginBottom: 16 }} value={settings.signature}
            onChange={e => set("signature")(e.target.value)} />
          <Toggle value={settings.lock_signature === "true"} onChange={setToggle("lock_signature")}
            label="Signature obligatoire sur chaque visuel" />
          <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
            <label style={labelStyle}>Site officiel</label>
            <input style={{ ...inputStyle, marginBottom: 10 }} value={settings.site_url}
              onChange={e => set("site_url")(e.target.value)} />
            <label style={labelStyle}>Page ressources</label>
            <input style={{ ...inputStyle, marginBottom: 10 }} value={settings.resources_url}
              onChange={e => set("resources_url")(e.target.value)} />
            <label style={labelStyle}>Hashtags par défaut</label>
            <input style={inputStyle} value={settings.hashtags}
              onChange={e => set("hashtags")(e.target.value)} />
          </div>
        </div>
      </div>
    ),

    charte: (
      <div>
        <h3 style={{ color: "#E8C547", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Charte graphique ADN</h3>
        <div style={cardStyle}>
          <ColorField label="Couleur principale — Bleu nuit profond" value={settings.color_primary} onChange={set("color_primary")} />
          <ColorField label="Couleur secondaire — Bleu royal" value={settings.color_secondary} onChange={set("color_secondary")} />
          <ColorField label="Couleur accent — Bleu électrique" value={settings.color_accent} onChange={set("color_accent")} />
          <ColorField label="Couleur premium — Or métallique" value={settings.color_premium} onChange={set("color_premium")} />
          <ColorField label="Couleur texte — Blanc premium" value={settings.color_text} onChange={set("color_text")} />
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(0,0,0,0.3)", display: "flex", gap: 8 }}>
            {[settings.color_primary, settings.color_secondary, settings.color_accent, settings.color_premium, settings.color_text].map((c, i) => (
              <div key={i} style={{ flex: 1, height: 40, borderRadius: 8, background: c, border: "1px solid rgba(255,255,255,0.2)" }} title={c} />
            ))}
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 8 }}>Aperçu de la palette</p>
        </div>
      </div>
    ),

    prompt: (
      <div>
        <h3 style={{ color: "#E8C547", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Prompt système global</h3>
        <div style={cardStyle}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 12 }}>
            Ce prompt est injecté automatiquement avant chaque génération. Il définit l'ADN visuel obligatoire.
          </p>
          <textarea
            style={{ ...inputStyle, minHeight: 200, resize: "vertical", lineHeight: 1.6 }}
            value={settings.system_prompt}
            onChange={e => set("system_prompt")(e.target.value)}
            placeholder="Chaque visuel doit respecter strictement l&apos;ADN Synergie Dour : fond bleu nuit profond (#001533)..."
          />
          <button onClick={() => set("system_prompt")("")}
            style={{ marginTop: 10, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
            Réinitialiser (utiliser valeur par défaut)
          </button>
        </div>
      </div>
    ),

    formats: (
      <div>
        <h3 style={{ color: "#E8C547", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Formats & Qualité</h3>
        <div style={cardStyle}>
          <label style={labelStyle}>Format par défaut</label>
          <select style={{ ...inputStyle, marginBottom: 16 }}
            value={settings.default_format} onChange={e => set("default_format")(e.target.value)}>
            <option value="1080x1080">1080×1080 (carré — Facebook, Instagram)</option>
            <option value="1080x1350">1080×1350 (portrait — Instagram)</option>
            <option value="1920x1080">1920×1080 (paysage — LinkedIn, bannière)</option>
            <option value="1080x1920">1080×1920 (story 9:16 — Reels, Stories)</option>
          </select>
          <label style={labelStyle}>Qualité de génération</label>
          <select style={{ ...inputStyle, marginBottom: 16 }}
            value={settings.default_quality} onChange={e => set("default_quality")(e.target.value)}>
            <option value="high">high (recommandé)</option>
            <option value="medium">medium</option>
            <option value="auto">auto</option>
          </select>
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8 }}>
            <p style={{ color: "#ef4444", fontSize: 12, margin: 0, fontWeight: 600 }}>
              ⚠ La qualité "standard" est INTERDITE — elle n'est jamais utilisée par ce système.
            </p>
          </div>
          <div style={{ marginTop: 16 }}>
            <Toggle value={settings.test_mode === "true"} onChange={setToggle("test_mode")}
              label="Mode test (générations de test non publiables)" />
          </div>
        </div>
      </div>
    ),

    validation: (
      <div>
        <h3 style={{ color: "#E8C547", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Validation avant publication</h3>
        <div style={cardStyle}>
          <Toggle value={settings.require_validation === "true"} onChange={setToggle("require_validation")}
            label="Exiger validation Super Admin avant publication" />
          <div style={{ marginTop: 20, padding: "14px 16px", background: "rgba(232,197,71,0.08)",
            border: "1px solid rgba(232,197,71,0.25)", borderRadius: 10 }}>
            <p style={{ color: "#E8C547", fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>Règles anti-erreur actives</p>
            {["Logo Synergie Dour présent", "Signature JS-Innov.IA présente", "Logo non coupé",
              "Logo non déformé", "Texte ne déborde pas", "Pas de chevauchement",
              "Marges suffisantes", "Format correct", "Qualité : high / medium / auto"].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <CheckCircle2 size={14} color="#22c55e" />
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),

    history: (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "#E8C547", fontSize: 18, fontWeight: 700, margin: 0 }}>Historique des visuels</h3>
          <button onClick={loadHistory}
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={12} /> Actualiser
          </button>
        </div>
        {isLoadingHistory ? (
          <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center" }}>Chargement...</p>
        ) : generations.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center" }}>Aucune génération enregistrée</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {generations.map(g => {
              const sc = STATUS_CONFIG[g.status] || STATUS_CONFIG.pending_validation;
              return (
                <div key={g.id} style={{ ...cardStyle, padding: 16, display: "flex", gap: 16, alignItems: "flex-start" }}>
                  {/* Miniature */}
                  <div style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                    background: "rgba(0,0,0,0.3)" }}>
                    {g.image_url && <img src={g.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  {/* Infos */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ background: sc.bg, color: sc.color, fontSize: 10, fontWeight: 700,
                        padding: "2px 10px", borderRadius: 50, border: `1px solid ${sc.color}44` }}>
                        {sc.label}
                      </span>
                      <span style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)",
                        fontSize: 10, padding: "2px 10px", borderRadius: 50 }}>{g.template}</span>
                      <span style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)",
                        fontSize: 10, padding: "2px 10px", borderRadius: 50 }}>{g.format}</span>
                    </div>
                    <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: "0 0 3px" }}>{g.title || "(sans titre)"}</p>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: 0 }}>
                      Par {g.user_name || g.user_email || "inconnu"} — {new Date(g.createdAt).toLocaleDateString("fr-BE")}
                    </p>
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {g.status === "pending_validation" && (
                      <>
                        <button onClick={() => validateGen(g.id, "approved")}
                          style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)",
                            color: "#22c55e", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                          ✓ Approuver
                        </button>
                        <button onClick={() => validateGen(g.id, "rejected")}
                          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
                            color: "#ef4444", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                          ✗ Refuser
                        </button>
                      </>
                    )}
                    {g.image_url && (
                      <button onClick={() => downloadImage(g.image_url, `visuel-${g.id}.png`)}
                        style={{ background: "rgba(232,197,71,0.15)", border: "1px solid rgba(232,197,71,0.3)",
                          color: "#E8C547", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                        ↓ PNG
                      </button>
                    )}
                    <button onClick={() => archiveGen(g.id)}
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                        color: "rgba(255,255,255,0.5)", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                      Archiver
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),

    users: (
      <div>
        <h3 style={{ color: "#E8C547", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Niveaux d&apos;accès</h3>
        {[
          { role: "super_admin", color: "#E8C547", label: "Super Admin",
            rights: ["Accès complet à tout", "Modifier logos et charte graphique", "Gérer le prompt système", "Voir et valider toutes les générations", "Supprimer/archiver des visuels", "Exporter PNG/JPG/ZIP", "Gérer les droits utilisateurs"] },
          { role: "admin", color: "#60b0ff", label: "Administrateur",
            rights: ["Générer des images", "Modifier textes et formats", "Proposer une publication", "Voir l'historique de ses générations", "Ne peut PAS modifier logos ni charte"] },
          { role: "user", color: "#6b7280", label: "Utilisateur",
            rights: ["Générer depuis les modèles autorisés uniquement", "Pas d'accès aux paramètres de marque", "Pas d'accès à l'historique global"] },
        ].map(level => (
          <div key={level.role} style={{ ...cardStyle, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: level.color }} />
              <span style={{ color: level.color, fontWeight: 700, fontSize: 15 }}>{level.label}</span>
              <code style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)",
                fontSize: 10, padding: "2px 8px", borderRadius: 4 }}>{level.role}</code>
            </div>
            {level.rights.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
                <span style={{ color: level.color, fontSize: 12, lineHeight: "18px" }}>›</span>
                <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>{r}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #001533 0%, #0a1a4a 100%)", padding: "24px 24px 60px" }}>
      {/* HEADER */}
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(232,197,71,0.15)",
            border: "2px solid rgba(232,197,71,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={22} color="#E8C547" />
          </div>
          <div>
            <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: 0 }}>Paramètres Super Admin</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>
              Contrôle de l'ADN visuel Synergie Dour — accès exclusif
            </p>
          </div>
        </div>

        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
          {/* NAV latérale */}
          <div>
            {SECTION_NAV.map(nav => {
              const Icon = nav.icon;
              const active = activeSection === nav.id;
              return (
                <button key={nav.id} onClick={() => setActiveSection(nav.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 10, marginBottom: 4,
                    background: active ? "rgba(232,197,71,0.15)" : "transparent",
                    border: active ? "1px solid rgba(232,197,71,0.35)" : "1px solid transparent",
                    color: active ? "#E8C547" : "rgba(255,255,255,0.6)",
                    fontSize: 13, fontWeight: active ? 700 : 400, cursor: "pointer",
                    textAlign: "left",
                  }}>
                  <Icon size={16} />
                  {nav.label}
                </button>
              );
            })}
          </div>

          {/* CONTENU */}
          <div>
            {sectionContent[activeSection]}

            {/* Bouton Sauvegarder (pas sur historique/users) */}
            {!["history", "users"].includes(activeSection) && (
              <button onClick={saveSettings} disabled={isSaving}
                style={{
                  marginTop: 24, padding: "12px 28px",
                  background: isSaving ? "rgba(232,197,71,0.3)" : "#E8C547",
                  border: "none", borderRadius: 50, color: "#001533",
                  fontSize: 14, fontWeight: 700, cursor: isSaving ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                  boxShadow: "0 4px 16px rgba(232,197,71,0.35)",
                }}>
                {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
