import { useState, useEffect, useRef } from "react";
import { Moon, Feather, Footprints, Smile, Droplet, Flame, KeyRound, Send, MessageCircle, ArrowLeft, Sparkles, Loader2, Star, Palette, Check, Clock, ChevronDown } from "lucide-react";
import { loadWallPosts, postDreamToWall, addCommentToPost, loadHistory, saveHistoryEntry } from "./lib/storage";

// ---------- themes ----------
const THEMES = {
  aurora: { label: "Aurora", bgGrad: "linear-gradient(165deg, #0A0F1C 0%, #0D1B2A 45%, #0A0F1C 100%)", card: "#101828", border: "#28405A", text: "#EAF2F0", muted: "#9FB6B2", faint: "#556B68", gold: "#7CE0C1", blue: "#8C7CFF", green: "#7CE0C1", starColor: "#8C7CFF", effect: "aurora" },
  shooting: { label: "Shooting Stars", bgGrad: "radial-gradient(ellipse at 20% 0%, #1B2340 0%, #0B0F1E 55%)", card: "#12172C", border: "#2A3156", text: "#F0EDE4", muted: "#9AA1C4", faint: "#54597A", gold: "#D4AF6A", blue: "#7C9CBF", green: "#8FA888", starColor: "#D4AF6A", effect: "shooting" },
  black: { label: "Black", bgGrad: "#000000", card: "#111111", border: "#262626", text: "#EDEDED", muted: "#9A9A9A", faint: "#5A5A5A", gold: "#D8D8D8", blue: "#B5B5B5", green: "#C4C4C4", starColor: "#D8D8D8", effect: "none" },
  midnight: { label: "Midnight", bgGrad: "radial-gradient(ellipse at 20% 0%, #1B2340 0%, #0B0F1E 55%)", card: "#12172C", border: "#2A3156", text: "#F0EDE4", muted: "#9AA1C4", faint: "#54597A", gold: "#D4AF6A", blue: "#7C9CBF", green: "#8FA888", starColor: "#D4AF6A", effect: "none" },
  dawn: { label: "Dawn", bgGrad: "radial-gradient(ellipse at 20% 0%, #F6DCC8 0%, #FBEFE1 55%)", card: "#FFF8EF", border: "#E9D5BE", text: "#2E2A3D", muted: "#8A7B6C", faint: "#B8A98F", gold: "#C07A3E", blue: "#6E86B8", green: "#6E9376", starColor: "#C07A3E", effect: "none" },
  ink: { label: "Ink", bgGrad: "radial-gradient(ellipse at 20% 0%, #1C1C1C 0%, #0A0A0A 55%)", card: "#141414", border: "#2B2B2B", text: "#EDEDED", muted: "#9A9A9A", faint: "#5A5A5A", gold: "#D8D8D8", blue: "#B5B5B5", green: "#C4C4C4", starColor: "#D8D8D8", effect: "none" },
};

function Constellation({ tone, theme }) {
  const dots = [[4, 20], [40, 6], [78, 22], [118, 4], [156, 18], [196, 8]];
  const stroke = tone === "gold" ? theme.gold : theme.blue;
  return (
    <svg width="100%" height="28" viewBox="0 0 200 28" preserveAspectRatio="none" className="opacity-40">
      <polyline points={dots.map((d) => d.join(",")).join(" ")} fill="none" stroke={stroke} strokeWidth="0.6" />
      {dots.map(([x, y], i) => (<circle key={i} cx={x} cy={y} r={i % 2 === 0 ? 1.6 : 1} fill={stroke} />))}
    </svg>
  );
}

function LoadingScreen({ theme }) {
  const messages = ["Reading the fragments…", "Listening for symbols…", "Almost there…"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % messages.length), 1600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-6">
      <div className="moon-orbit-wrap">
        <Moon className="moon-core" size={40} style={{ color: theme.gold }} fill={theme.gold} fillOpacity={0.15} />
        <span className="orbit-dot" style={{ background: theme.gold, color: theme.gold }} />
        <span className="orbit-dot orbit-dot-2" style={{ background: theme.blue, color: theme.blue }} />
      </div>
      <p className="inter text-sm view-enter" key={i} style={{ color: theme.muted }}>{messages[i]}</p>
    </div>
  );
}

const QUICK_TAGS = [
  { label: "Falling", icon: Feather },
  { label: "Being chased", icon: Footprints },
  { label: "Losing teeth", icon: Smile },
  { label: "Drowning / water", icon: Droplet },
  { label: "Fire", icon: Flame },
  { label: "A locked door", icon: KeyRound },
];

const LENS_ORDER = ["scientific", "health", "biblical"];
const LENS_META = {
  scientific: { label: "Mind", full: "Psychological / Scientific Reading", sub: "What dream research & psychology say", colorKey: "blue" },
  health: { label: "Body", full: "Health Reading", sub: "Physical & lifestyle signals — not a diagnosis", colorKey: "green" },
  biblical: { label: "Spirit", full: "Biblical / Spiritual Reading", sub: "What scripture & spiritual tradition say", colorKey: "gold" },
};

// Calls our own /api/interpret route (server holds the real Anthropic key)
async function interpretDream(dreamText, lenses) {
  const response = await fetch("/api/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dreamText, lenses }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Request failed (status ${response.status}).`);
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function App() {
  const [themeKey, setThemeKey] = useState("shooting");
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const theme = THEMES[themeKey];

  const [lenses, setLenses] = useState({ scientific: true, health: true, biblical: true });
  const [view, setView] = useState("home");
  const [dreamText, setDreamText] = useState("");
  const [result, setResult] = useState(null);
  const [resultLenses, setResultLenses] = useState(lenses);
  const [expandedLens, setExpandedLens] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [wallPosts, setWallPosts] = useState([]);
  const [wallLoading, setWallLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [posted, setPosted] = useState(false);
  const [wallStatus, setWallStatus] = useState(null);
  const [historyStatus, setHistoryStatus] = useState(null);
  const [openComments, setOpenComments] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const posts = await loadWallPosts(3);
        setPreview(posts);
      } catch {
        // silent on home preview — full wall view will show the real error
      }
    })();
  }, []);

  const toggleLens = (key) => {
    setLenses((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.scientific && !next.health && !next.biblical) return prev;
      return next;
    });
  };

  const handleTag = (label) => {
    setDreamText((prev) => (prev ? prev + " " + label.toLowerCase() : `I dreamed about ${label.toLowerCase()}.`));
    textareaRef.current?.focus();
  };

  const handleInterpret = async () => {
    if (!dreamText.trim()) return;
    setView("loading");
    setErrorMsg("");
    setHistoryStatus(null);
    try {
      const parsed = await interpretDream(dreamText.trim(), lenses);
      setResult(parsed);
      setResultLenses(lenses);
      setExpandedLens(null);
      setPosted(false);
      setWallStatus(null);
      setView("result");

      try {
        await saveHistoryEntry({ dreamText: dreamText.trim(), result: parsed, lenses });
      } catch (historyErr) {
        setHistoryStatus({ ok: false, msg: `Couldn't save to history: ${historyErr?.message || "unknown error"}` });
      }
    } catch (e) {
      setErrorMsg(e?.message || "The dream slipped away before it could be read. Try describing it again.");
      setView("error");
    }
  };

  const openWall = async () => {
    setView("wall");
    setWallLoading(true);
    try {
      const posts = await loadWallPosts();
      setWallPosts(posts);
    } catch (e) {
      setWallStatus({ ok: false, msg: `Couldn't load the wall: ${e?.message || "unknown error"}` });
    }
    setWallLoading(false);
  };

  const openHistory = async () => {
    setView("history");
    setHistoryLoading(true);
    try {
      const entries = await loadHistory();
      setHistoryList(entries);
    } catch (e) {
      setHistoryStatus({ ok: false, msg: `Couldn't load history: ${e?.message || "unknown error"}` });
    }
    setHistoryLoading(false);
  };

  const openHistoryEntry = (entry) => {
    setDreamText(entry.dream_text);
    setResult(entry.result);
    setResultLenses(entry.lenses || { scientific: true, health: true, biblical: true });
    setExpandedLens(null);
    setPosted(false);
    setView("result");
  };

  const postToWall = async () => {
    if (!result || posted) return;
    try {
      await postDreamToWall({ dreamText, essence: result.essence });
      setPosted(true);
      setWallStatus({ ok: true, msg: "Shared to the Dream Wall" });
    } catch (e) {
      setWallStatus({ ok: false, msg: `Couldn't share: ${e?.message || "unknown error"}` });
    }
  };

  const addComment = async (post) => {
    if (!commentDraft.trim()) return;
    try {
      const updated = await addCommentToPost(post, commentDraft.trim());
      setWallPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
      setCommentDraft("");
    } catch (e) {
      setWallStatus({ ok: false, msg: `Couldn't add comment: ${e?.message || "unknown error"}` });
    }
  };

  const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: theme.bgGrad, color: theme.text, fontFamily: "'Georgia', 'Cormorant Garamond', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        .fraunces { font-family: 'Fraunces', serif; }
        .inter { font-family: 'Inter', sans-serif; }
        textarea::placeholder { color: ${theme.faint}; }
        .star-field { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .twinkle { animation: tw 3.5s ease-in-out infinite; }
        @keyframes tw { 0%,100% { opacity: .2; } 50% { opacity: .9; } }
        .aurora-blob { position: absolute; border-radius: 50%; filter: blur(60px); mix-blend-mode: screen; animation: drift 14s ease-in-out infinite; }
        @keyframes drift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.15); } }
        .shoot { position: absolute; width: 2px; height: 2px; background: linear-gradient(90deg, ${theme.gold}, transparent); border-radius: 50%; box-shadow: 0 0 6px 1px ${theme.gold}; animation: shoot 6s linear infinite; }
        @keyframes shoot { 0% { transform: translate(0,0) rotate(35deg); opacity: 0; width: 2px; } 3% { opacity: 1; width: 90px; } 12% { transform: translate(340px, 240px) rotate(35deg); opacity: 0; width: 2px; } 100% { opacity: 0; } }
        .view-enter { animation: fadeUp .45s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .stagger > * { animation: fadeUp .4s ease both; }
        .stagger > *:nth-child(1) { animation-delay: .02s; }
        .stagger > *:nth-child(2) { animation-delay: .09s; }
        .stagger > *:nth-child(3) { animation-delay: .16s; }
        .hover-lift { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .hover-lift:hover { transform: translateY(-2px); }
        .hover-lift:active { transform: translateY(0px) scale(0.98); }
        .glow-btn { transition: box-shadow .25s ease, transform .15s ease; }
        .glow-btn:hover { box-shadow: 0 0 22px ${theme.gold}55; transform: translateY(-1px); }
        .glow-btn:active { transform: translateY(0) scale(0.97); }
        .shimmer-title { background: linear-gradient(100deg, ${theme.text} 40%, ${theme.gold} 50%, ${theme.text} 60%); background-size: 220% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: shimmer 5s linear infinite; }
        @keyframes shimmer { to { background-position: -220% center; } }
        .moon-orbit-wrap { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
        .moon-core { animation: moonBreathe 2.6s ease-in-out infinite; filter: drop-shadow(0 0 10px currentColor); }
        @keyframes moonBreathe { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.08); opacity: 1; } }
        .orbit-dot { position: absolute; top: 4px; left: 50%; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%; box-shadow: 0 0 8px 1px currentColor; transform-origin: 2.5px 36px; animation: orbit 3.2s linear infinite; }
        .orbit-dot-2 { animation: orbit 4.6s linear infinite reverse; opacity: .7; }
        @keyframes orbit { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .twinkle, .aurora-blob, .shoot, .view-enter, .stagger > *, .shimmer-title, .moon-core, .orbit-dot { animation: none; opacity: .9; } }
      `}</style>

      {theme.effect === "shooting" && (
        <div className="star-field">
          {[...Array(20)].map((_, i) => (
            <Star key={i} className="twinkle absolute" size={i % 5 === 0 ? 10 : 5}
              style={{ top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%`, color: theme.starColor, animationDelay: `${(i % 7) * 0.4}s` }} />
          ))}
          {[...Array(3)].map((_, i) => (
            <div key={`s${i}`} className="shoot" style={{ top: `${10 + i * 22}%`, left: `${5 + i * 15}%`, animationDelay: `${i * 2.4}s` }} />
          ))}
        </div>
      )}
      {theme.effect === "aurora" && (
        <div className="star-field">
          <div className="aurora-blob" style={{ width: 260, height: 260, top: "-5%", left: "5%", background: theme.blue, animationDelay: "0s" }} />
          <div className="aurora-blob" style={{ width: 220, height: 220, top: "10%", right: "0%", background: theme.green, animationDelay: "3s" }} />
          <div className="aurora-blob" style={{ width: 200, height: 200, bottom: "0%", left: "25%", background: "#4C6FFF", animationDelay: "6s" }} />
        </div>
      )}

      <div className="relative max-w-2xl mx-auto px-6 pt-14 pb-24">
        <header className="flex items-center justify-between mb-10 relative">
          <button onClick={() => setView("home")} className="flex items-center gap-2 inter text-sm tracking-widest uppercase" style={{ color: theme.text }}>
            <Moon size={18} style={{ color: theme.gold }} />
            Nocturne
          </button>
          <div className="flex items-center gap-2">
            <button onClick={openHistory} className="p-2 rounded-full border" style={{ borderColor: theme.border, color: theme.muted }} aria-label="History">
              <Clock size={15} />
            </button>
            <button onClick={openWall} className="inter text-xs tracking-widest uppercase px-3 py-2 rounded-full border" style={{ borderColor: theme.border, color: theme.muted }}>
              Dream Wall
            </button>
            <div className="relative">
              <button onClick={() => setShowThemeMenu((s) => !s)} className="p-2 rounded-full border" style={{ borderColor: theme.border, color: theme.muted }} aria-label="Change theme">
                <Palette size={15} />
              </button>
              {showThemeMenu && (
                <div className="absolute right-0 mt-2 rounded-xl border overflow-hidden z-10" style={{ background: theme.card, borderColor: theme.border, minWidth: 150 }}>
                  {Object.entries(THEMES).map(([key, t]) => (
                    <button key={key} onClick={() => { setThemeKey(key); setShowThemeMenu(false); }}
                      className="w-full text-left px-3.5 py-2.5 inter text-xs flex items-center justify-between"
                      style={{ color: theme.text, background: key === themeKey ? (theme.border + "55") : "transparent" }}>
                      {t.label}
                      {key === themeKey && <Check size={12} style={{ color: theme.gold }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {view === "home" && (
          <div className="view-enter">
            <h1 className="fraunces text-4xl leading-tight mb-3 shimmer-title" style={{ fontWeight: 500 }}>What did you dream?</h1>
            <p className="inter text-sm mb-6" style={{ color: theme.muted }}>Describe it loosely — fragments are fine.</p>

            <div className="mb-6">
              <p className="inter text-[11px] uppercase tracking-widest mb-2.5" style={{ color: theme.faint }}>Readings to include — tap to switch on/off</p>
              <div className="space-y-2">
                {LENS_ORDER.map((key) => {
                  const active = lenses[key];
                  const c = theme[LENS_META[key].colorKey];
                  return (
                    <button key={key} onClick={() => toggleLens(key)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border hover-lift"
                      style={{ borderColor: active ? c : theme.border, background: active ? c + "12" : "transparent" }}>
                      <span className="inter text-sm" style={{ color: active ? theme.text : theme.faint }}>{LENS_META[key].full}</span>
                      <span className="relative inline-block rounded-full transition-colors" style={{ width: 34, height: 19, background: active ? c : theme.border }}>
                        <span className="absolute top-0.5 rounded-full transition-transform" style={{
                          width: 15, height: 15, left: 2,
                          background: themeKey === "dawn" ? "#FFF8EF" : "#0A0F1E",
                          transform: active ? "translateX(15px)" : "translateX(0)",
                        }} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {QUICK_TAGS.map(({ label, icon: Icon }) => (
                <button key={label} onClick={() => handleTag(label)} className="inter text-xs flex items-center gap-1.5 px-3 py-2 rounded-full border hover-lift" style={{ borderColor: theme.border, color: theme.text }}>
                  <Icon size={13} style={{ color: theme.blue }} />
                  {label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl p-5 border hover-lift" style={{ background: theme.card, borderColor: theme.border }}>
              <textarea ref={textareaRef} value={dreamText} onChange={(e) => setDreamText(e.target.value)}
                placeholder="I was walking through a house that kept changing rooms..." rows={5}
                className="w-full bg-transparent outline-none resize-none inter text-[15px] leading-relaxed" style={{ color: theme.text }} />
              <div className="flex justify-end mt-3">
                <button onClick={handleInterpret} disabled={!dreamText.trim()}
                  className="inter text-sm flex items-center gap-2 px-5 py-2.5 rounded-full disabled:opacity-40 glow-btn"
                  style={{ background: theme.gold, color: "#0A0F1E", fontWeight: 600 }}>
                  <Sparkles size={15} />
                  Interpret my dream
                </button>
              </div>
            </div>

            {preview.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="inter text-[11px] uppercase tracking-widest" style={{ color: theme.faint }}>From the Dream Wall</p>
                  <button onClick={openWall} className="inter text-xs underline" style={{ color: theme.muted }}>See all</button>
                </div>
                <div className="space-y-2.5 stagger">
                  {preview.map((p) => (
                    <div key={p.id} className="rounded-xl p-3.5 border hover-lift" style={{ borderColor: theme.border, background: theme.card }}>
                      <p className="fraunces text-sm mb-0.5" style={{ color: theme.gold }}>{p.essence}</p>
                      <p className="inter text-xs leading-relaxed line-clamp-2" style={{ color: theme.muted }}>{p.dream_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === "loading" && <LoadingScreen theme={theme} />}

        {view === "error" && (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <p className="inter text-sm" style={{ color: "#E8B4B4" }}>{errorMsg}</p>
            <button onClick={() => setView("home")} className="inter text-sm underline" style={{ color: theme.gold }}>Try again</button>
          </div>
        )}

        {view === "result" && result && (
          <div className="view-enter">
            <button onClick={() => setView("home")} className="inter text-xs flex items-center gap-1 mb-6" style={{ color: theme.muted }}>
              <ArrowLeft size={13} /> New dream
            </button>
            <h2 className="fraunces text-3xl mb-1 shimmer-title">{result.essence}</h2>
            <p className="inter text-xs mb-6" style={{ color: theme.faint }}>"{dreamText}"</p>

            <Constellation theme={theme} />

            <p className="inter text-[11px] uppercase tracking-widest mt-5 mb-3" style={{ color: theme.faint }}>Tap a reading to open it</p>

            <div className="space-y-2.5 stagger">
              {LENS_ORDER.filter((k) => resultLenses[k] && result[k]).map((key) => {
                const isOpen = expandedLens === key;
                const c = theme[LENS_META[key].colorKey];
                return (
                  <div key={key} className="rounded-xl border overflow-hidden hover-lift" style={{ borderColor: isOpen ? c : theme.border, background: theme.card, boxShadow: isOpen ? `0 0 18px ${c}33` : "none" }}>
                    <button onClick={() => setExpandedLens(isOpen ? null : key)} className="w-full flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                        <span className="fraunces text-base" style={{ color: c }}>{LENS_META[key].full}</span>
                      </div>
                      <ChevronDown size={15} style={{ color: theme.muted, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4">
                        <p className="inter text-xs mb-2" style={{ color: theme.faint }}>{LENS_META[key].sub}</p>
                        <p className="inter text-[15px] leading-relaxed" style={{ color: theme.text }}>{result[key]}</p>
                        {key === "biblical" && result.prayer && (
                          <div className="mt-3 rounded-xl p-4 border-l-2" style={{ borderColor: theme.gold, background: theme.gold + "10" }}>
                            <p className="inter text-xs uppercase tracking-widest mb-1.5" style={{ color: theme.gold }}>Prayer point</p>
                            <p className="inter text-sm leading-relaxed" style={{ color: theme.text }}>{result.prayer}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {result.voices?.length > 0 && (
              <div className="mt-9">
                <Constellation tone="gold" theme={theme} />
                <p className="inter text-xs uppercase tracking-widest mt-4 mb-3" style={{ color: theme.faint }}>Others who dreamed something similar</p>
                <div className="space-y-3">
                  {result.voices.map((v, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: theme.card }}>
                      <p className="inter text-sm italic leading-relaxed" style={{ color: theme.muted }}>"{v}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-9 flex items-center gap-3">
              <button onClick={postToWall} disabled={posted} className="inter text-sm px-4 py-2.5 rounded-full border disabled:opacity-50 hover-lift"
                style={{ borderColor: theme.border, color: posted ? theme.green : theme.text }}>
                {posted ? "Shared to Dream Wall ✓" : "Share this dream on the wall"}
              </button>
              {posted && <button onClick={openWall} className="inter text-xs underline" style={{ color: theme.muted }}>View wall</button>}
            </div>
            {!posted && <p className="inter text-[11px] mt-2" style={{ color: theme.faint }}>Visible to anyone who visits the Dream Wall.</p>}
            {wallStatus && (
              <p className="inter text-[11px] mt-2" style={{ color: wallStatus.ok ? theme.green : "#E8B4B4" }}>{wallStatus.msg}</p>
            )}
            {historyStatus && !historyStatus.ok && (
              <p className="inter text-[11px] mt-1" style={{ color: "#E8B4B4" }}>{historyStatus.msg}</p>
            )}
          </div>
        )}

        {view === "wall" && (
          <div>
            <button onClick={() => setView("home")} className="inter text-xs flex items-center gap-1 mb-6" style={{ color: theme.muted }}>
              <ArrowLeft size={13} /> Back
            </button>
            <h2 className="fraunces text-2xl mb-1">The Dream Wall</h2>
            <p className="inter text-xs mb-7" style={{ color: theme.muted }}>Dreams shared by others who passed through.</p>

            {wallLoading && (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin" size={22} style={{ color: theme.gold }} />
              </div>
            )}
            {wallStatus && !wallStatus.ok && (
              <p className="inter text-xs mb-4" style={{ color: "#E8B4B4" }}>{wallStatus.msg}</p>
            )}

            {!wallLoading && wallPosts.length === 0 && (
              <p className="inter text-sm" style={{ color: theme.faint }}>No dreams shared yet. Be the first.</p>
            )}

            <div className="space-y-4">
              {wallPosts.map((post) => (
                <div key={post.id} className="rounded-xl p-4 border" style={{ borderColor: theme.border, background: theme.card }}>
                  <p className="fraunces text-base mb-1" style={{ color: theme.gold }}>{post.essence}</p>
                  <p className="inter text-sm leading-relaxed mb-3" style={{ color: theme.text }}>{post.dream_text}</p>
                  <button onClick={() => setOpenComments(openComments === post.id ? null : post.id)} className="inter text-xs flex items-center gap-1.5" style={{ color: theme.muted }}>
                    <MessageCircle size={13} />
                    {(post.comments || []).length} {(post.comments || []).length === 1 ? "comment" : "comments"}
                  </button>

                  {openComments === post.id && (
                    <div className="mt-3 space-y-2">
                      {(post.comments || []).map((c, i) => (
                        <p key={i} className="inter text-xs leading-relaxed pl-3 border-l" style={{ borderColor: theme.border, color: theme.muted }}>{c.text}</p>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="Add a comment…"
                          className="flex-1 bg-transparent border-b outline-none inter text-xs py-1" style={{ borderColor: theme.border, color: theme.text }} />
                        <button onClick={() => addComment(post)} style={{ color: theme.gold }}>
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "history" && (
          <div>
            <button onClick={() => setView("home")} className="inter text-xs flex items-center gap-1 mb-6" style={{ color: theme.muted }}>
              <ArrowLeft size={13} /> Back
            </button>
            <h2 className="fraunces text-2xl mb-1">Your Dream History</h2>
            <p className="inter text-xs mb-7" style={{ color: theme.muted }}>Every dream you've interpreted here, kept for you only.</p>

            {historyLoading && (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin" size={22} style={{ color: theme.gold }} />
              </div>
            )}
            {historyStatus && !historyStatus.ok && (
              <p className="inter text-xs mb-4" style={{ color: "#E8B4B4" }}>{historyStatus.msg}</p>
            )}

            {!historyLoading && historyList.length === 0 && (
              <p className="inter text-sm" style={{ color: theme.faint }}>Nothing interpreted yet — your dreams will collect here.</p>
            )}

            <div className="space-y-2.5">
              {historyList.map((entry) => (
                <button key={entry.id} onClick={() => openHistoryEntry(entry)} className="w-full text-left rounded-xl p-4 border" style={{ borderColor: theme.border, background: theme.card }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="fraunces text-base" style={{ color: theme.gold }}>{entry.result?.essence}</p>
                    <p className="inter text-[10px]" style={{ color: theme.faint }}>{fmtDate(entry.created_at)}</p>
                  </div>
                  <p className="inter text-xs leading-relaxed line-clamp-2" style={{ color: theme.muted }}>{entry.dream_text}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
   }
