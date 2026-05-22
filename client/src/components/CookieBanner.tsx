import { useState, useEffect } from "react";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('sd_cookie_consent')) setVisible(true);
  }, []);

  const accept = () => { localStorage.setItem('sd_cookie_consent', 'accepted'); setVisible(false); };
  const refuse = () => { localStorage.setItem('sd_cookie_consent', 'refused'); setVisible(false); };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-blue-950/97 border-t border-amber-400/30 backdrop-blur-md px-4 py-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-white/80 text-sm flex-1 min-w-[260px] leading-relaxed">
        🍪 Ce site utilise des cookies pour améliorer votre expérience.{" "}
        <a href="/legal" className="text-amber-400 underline hover:text-amber-300">Mentions légales</a>
        {" "}·{" "}
        <a href="/privacy" className="text-amber-400 underline hover:text-amber-300">Confidentialité</a>
      </p>
      <div className="flex gap-3 flex-shrink-0">
        <button
          onClick={refuse}
          className="px-4 py-2 text-xs rounded-full border border-white/20 text-white/60 hover:border-white/40 transition-colors"
        >
          Refuser
        </button>
        <button
          onClick={accept}
          className="px-5 py-2 text-xs rounded-full bg-amber-500 hover:bg-amber-400 text-blue-900 font-bold transition-colors"
        >
          Accepter
        </button>
      </div>
    </div>
  );
}
