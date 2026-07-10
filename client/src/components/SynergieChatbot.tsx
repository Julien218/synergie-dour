import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  MessageSquare, X, Send, Minimize2, Maximize2,
  Bot, User, Copy, RefreshCw, ChevronDown, Sparkles,
  Mail, Image as ImageIcon, FileText, Share2, Building2
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { icon: Mail,      label: "Email nouveau membre",  text: "Rédige un email de bienvenue pour un nouveau commerçant qui vient de rejoindre Synergie Dour." },
  { icon: Share2,    label: "Post Facebook",         text: "Crée un post Facebook engageant pour annoncer l'arrivée d'un nouveau membre commerçant dans notre association." },
  { icon: ImageIcon, label: "Prompt visuel IA",      text: "Génère un prompt détaillé pour créer un visuel Instagram annonçant un événement Synergie Dour." },
  { icon: FileText,  label: "Newsletter mensuelle",  text: "Rédige l'introduction d'une newsletter mensuelle de Synergie Dour pour les membres et commerçants." },
  { icon: Building2, label: "Annonce local commercial", text: "Rédige une annonce attractive pour un local commercial disponible à louer dans le centre de Dour." },
  { icon: Mail,      label: "Relance cotisation",    text: "Rédige un email de relance professionnel et bienveillant pour un commerçant dont la cotisation annuelle arrive à échéance." },
];

function formatMessage(text: string): React.ReactNode {
  // Convertir les ** en gras, les ``` en code block, les \n en <br>
  const parts = text.split(/(```[\s\S]*?```|\*\*[^*]+\*\*|\n)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3).replace(/^[a-z]*\n/, "");
      return (
        <pre key={i} style={{
          background: "rgba(0,0,0,0.35)", borderRadius: 8, padding: "10px 12px",
          fontSize: 11.5, overflowX: "auto", margin: "6px 0", whiteSpace: "pre-wrap",
          border: "1px solid rgba(255,255,255,0.1)", color: "#a8d8ff",
          fontFamily: "monospace",
        }}>{code}</pre>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: "#E8C547", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (part === "\n") return <br key={i} />;
    return <span key={i}>{part}</span>;
  });
}

export function SynergieChatbot({ context }: { context?: string }) {
  const [open, setOpen]         = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Bonjour ! Je suis l'assistant IA de Synergie Dour.\n\nJe peux vous aider à rédiger des **emails**, des **posts réseaux sociaux**, des **textes pour le site**, ou encore des **annonces** pour vos commerçants.\n\nQue souhaitez-vous créer ?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput]       = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showQuick, setShowQuick]   = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) inputRef.current?.focus();
  }, [open, minimized]);

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || isThinking) return;
    setInput("");
    setShowQuick(false);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const history = [...messages, userMsg]
        .filter(m => m.id !== "welcome")
        .map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch("/api/social/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, context }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({})) as any;
        let friendlyMsg: string;
        if (resp.status === 401 || resp.status === 403) {
          friendlyMsg = "Session expirée ou accès non autorisé. Reconnectez-vous.";
        } else if (resp.status === 429) {
          friendlyMsg = "Limite temporaire atteinte. Réessayez dans quelques instants.";
        } else if (resp.status >= 500) {
          friendlyMsg = "L'assistant IA est momentanément indisponible.";
        } else {
          friendlyMsg = errData.message || `Erreur ${resp.status}`;
        }
        console.error("[SynergieChatbot] HTTP", resp.status, errData);
        throw new Error(friendlyMsg);
      }

      const data = await resp.json() as any;
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "(Pas de réponse)",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const msg = err.message || "Erreur de connexion à l'assistant IA.";
      toast.error(msg);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: msg,
        timestamp: new Date(),
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copié !"));
  };

  const clearChat = () => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Conversation réinitialisée. Comment puis-je vous aider ?",
      timestamp: new Date(),
    }]);
    setShowQuick(true);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── BOUTON FLOTTANT ───────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Assistant IA Synergie Dour"
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9999,
          width: 60, height: 60, borderRadius: "50%",
          background: "linear-gradient(135deg, #1a3ba0, #001533)",
          border: "2px solid rgba(232,197,71,0.6)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.45), 0 0 20px rgba(232,197,71,0.15)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget;
          el.style.transform = "scale(1.08)";
          el.style.boxShadow = "0 8px 30px rgba(0,0,0,0.5), 0 0 28px rgba(232,197,71,0.30)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget;
          el.style.transform = "";
          el.style.boxShadow = "0 6px 24px rgba(0,0,0,0.45), 0 0 20px rgba(232,197,71,0.15)";
        }}
      >
        <Sparkles size={24} color="#E8C547" />
      </button>
    );
  }

  // ── FENÊTRE CHAT ─────────────────────────────────────────────────────────
  const chatW = 390;
  const chatH = minimized ? 56 : 580;

  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 9999,
      width: chatW, height: chatH,
      background: "linear-gradient(160deg, #0d1e5a 0%, #0a1540 100%)",
      borderRadius: 20,
      border: "1.5px solid rgba(232,197,71,0.30)",
      boxShadow: "0 12px 50px rgba(0,0,0,0.60), 0 0 30px rgba(232,197,71,0.08)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      transition: "height 0.25s ease",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: "14px 16px", background: "linear-gradient(90deg, #001533, #1a3ba0)",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        borderBottom: minimized ? "none" : "1px solid rgba(255,255,255,0.08)",
        cursor: minimized ? "pointer" : "default",
      }}
        onClick={() => minimized && setMinimized(false)}
      >
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(232,197,71,0.15)",
          border: "1.5px solid rgba(232,197,71,0.40)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Sparkles size={18} color="#E8C547" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 13.5, margin: 0 }}>
            Assistant Synergie Dour
          </p>
          <p style={{ color: "rgba(255,255,255,0.50)", fontSize: 10.5, margin: 0 }}>
            {isThinking ? "En train de rédiger..." : "Emails · Visuels · Posts · Textes"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={clearChat} title="Nouvelle conversation"
            style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8,
              width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={13} color="rgba(255,255,255,0.6)" />
          </button>
          <button onClick={() => setMinimized(!minimized)} title={minimized ? "Agrandir" : "Réduire"}
            style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8,
              width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {minimized
              ? <Maximize2 size={13} color="rgba(255,255,255,0.6)" />
              : <Minimize2 size={13} color="rgba(255,255,255,0.6)" />}
          </button>
          <button onClick={() => setOpen(false)} title="Fermer"
            style={{ background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 8,
              width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={13} color="#ef4444" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* ── MESSAGES ──────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                alignItems: "flex-end", gap: 8,
              }}>
                {/* Avatar */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: msg.role === "user"
                    ? "rgba(232,197,71,0.20)" : "rgba(26,59,160,0.50)",
                  border: `1px solid ${msg.role === "user" ? "rgba(232,197,71,0.40)" : "rgba(255,255,255,0.15)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {msg.role === "user"
                    ? <User size={13} color="#E8C547" />
                    : <Sparkles size={13} color="#60b0ff" />}
                </div>

                {/* Bulle */}
                <div style={{
                  maxWidth: "80%",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, rgba(232,197,71,0.18), rgba(232,197,71,0.08))"
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${msg.role === "user" ? "rgba(232,197,71,0.25)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "10px 13px",
                  position: "relative",
                }}>
                  <div style={{ color: "rgba(255,255,255,0.90)", fontSize: 12.5, lineHeight: 1.6 }}>
                    {formatMessage(msg.content)}
                  </div>
                  {msg.role === "assistant" && msg.id !== "welcome" && (
                    <button
                      onClick={() => copyMessage(msg.content)}
                      title="Copier"
                      style={{
                        position: "absolute", top: 6, right: 6,
                        background: "rgba(255,255,255,0.06)", border: "none",
                        borderRadius: 5, width: 22, height: 22, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0.6,
                      }}
                    >
                      <Copy size={10} color="#fff" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isThinking && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(26,59,160,0.50)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Sparkles size={13} color="#60b0ff" />
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px 16px 16px 4px",
                  padding: "12px 16px",
                  display: "flex", gap: 5, alignItems: "center",
                }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: "rgba(232,197,71,0.6)",
                      animation: `bounce 1.2s ${delay}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── QUICK PROMPTS ─────────────────────────────────────── */}
          {showQuick && (
            <div style={{ padding: "0 14px 10px", flexShrink: 0 }}>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginBottom: 7, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Suggestions rapides
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {QUICK_PROMPTS.map((qp, i) => {
                  const QIcon = qp.icon;
                  return (
                    <button key={i} onClick={() => sendMessage(qp.text)}
                      style={{
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 20, padding: "5px 11px", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 5,
                        color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 500,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(232,197,71,0.12)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                    >
                      <QIcon size={11} color="#E8C547" />
                      {qp.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── INPUT ─────────────────────────────────────────────── */}
          <div style={{
            padding: "10px 14px 14px", flexShrink: 0,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", gap: 8, alignItems: "flex-end",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Demandez un email, un post, un texte..."
              rows={1}
              style={{
                flex: 1, background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12,
                color: "#fff", fontSize: 12.5, padding: "9px 12px",
                resize: "none", outline: "none", lineHeight: 1.5,
                maxHeight: 100, overflowY: "auto",
                fontFamily: "inherit",
              }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 100) + "px";
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isThinking}
              style={{
                width: 38, height: 38, borderRadius: "50%",
                background: input.trim() && !isThinking
                  ? "linear-gradient(135deg, #E8C547, #c9a93a)"
                  : "rgba(255,255,255,0.08)",
                border: "none", cursor: input.trim() && !isThinking ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.2s",
              }}
            >
              <Send size={16} color={input.trim() && !isThinking ? "#001533" : "rgba(255,255,255,0.3)"} />
            </button>
          </div>

          {/* Bounce keyframes inline */}
          <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
        </>
      )}
    </div>
  );
}
