import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Headphones, Waves, Sparkles } from "lucide-react";

type Preset = {
  hz: number;
  name: string;
  short: string;
  desc: string;
  color: string;
};

const PRESETS: Preset[] = [
  { hz: 174, name: "174 Hz", short: "Foundation",  desc: "Deep relaxation; eases tension and pain perception.", color: "from-rose-500 to-pink-600" },
  { hz: 285, name: "285 Hz", short: "Cellular",    desc: "Said to support tissue repair and gentle restoration.", color: "from-amber-500 to-orange-600" },
  { hz: 396, name: "396 Hz", short: "Liberation",  desc: "Releases guilt and fear — grounding root-chakra tone.", color: "from-orange-500 to-red-600" },
  { hz: 417, name: "417 Hz", short: "Change",      desc: "Clears negativity; supports change and forgiveness.", color: "from-yellow-500 to-amber-600" },
  { hz: 432, name: "432 Hz", short: "Natural Tune",desc: "Mathematically aligned with nature — warm and peaceful.", color: "from-lime-500 to-emerald-600" },
  { hz: 528, name: "528 Hz", short: "Love",        desc: "The 'miracle' tone — calms the mind, lifts the heart.", color: "from-emerald-500 to-teal-600" },
  { hz: 639, name: "639 Hz", short: "Connection",  desc: "Heart tone — encourages empathy and harmony.", color: "from-teal-500 to-cyan-600" },
  { hz: 741, name: "741 Hz", short: "Awakening",   desc: "Cleansing tone — clarity, expression, problem-solving.", color: "from-sky-500 to-blue-600" },
  { hz: 852, name: "852 Hz", short: "Intuition",   desc: "Third-eye tone — deep awareness and inner stillness.", color: "from-blue-500 to-indigo-600" },
  { hz: 963, name: "963 Hz", short: "Crown",       desc: "Highest solfeggio — pure presence and oneness.", color: "from-violet-500 to-purple-600" },
];

const BEATS = [
  { label: "Off",    val: 0,  desc: "Pure tone" },
  { label: "Delta",  val: 3,  desc: "Deep sleep · 1–4 Hz" },
  { label: "Theta",  val: 6,  desc: "Meditation · 4–8 Hz" },
  { label: "Alpha",  val: 10, desc: "Relaxed focus · 8–13 Hz" },
  { label: "Beta",   val: 18, desc: "Alert thinking · 13–30 Hz" },
];

export default function FrequencyPlayer() {
  const [hz, setHz] = useState<number>(528);
  const [beat, setBeat] = useState<number>(0); // binaural beat in Hz (0 = off)
  const [vol, setVol] = useState<number>(40);  // gentle default
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const ctxRef    = useRef<AudioContext | null>(null);
  const oscLRef   = useRef<OscillatorNode | null>(null);
  const oscRRef   = useRef<OscillatorNode | null>(null);
  const gainLRef  = useRef<GainNode | null>(null);
  const gainRRef  = useRef<GainNode | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const tickRef   = useRef<number | null>(null);
  const fadeRef   = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Start / stop the oscillators (fully tears down per-session graph)
  const stop = () => {
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    try { oscLRef.current?.stop(); } catch {}
    try { oscRRef.current?.stop(); } catch {}
    try { oscLRef.current?.disconnect(); } catch {}
    try { oscRRef.current?.disconnect(); } catch {}
    try { gainLRef.current?.disconnect(); } catch {}
    try { gainRRef.current?.disconnect(); } catch {}
    try { mergerRef.current?.disconnect(); } catch {}
    oscLRef.current = null;
    oscRRef.current = null;
    gainLRef.current = null;
    gainRRef.current = null;
    if (mountedRef.current) setPlaying(false);
  };

  const start = async () => {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    const ctx = ctxRef.current!;
    if (ctx.state === "suspended") await ctx.resume();

    // Master gain (volume)
    if (!masterRef.current) {
      masterRef.current = ctx.createGain();
      masterRef.current.connect(ctx.destination);
    }
    masterRef.current.gain.setValueAtTime(0, ctx.currentTime);
    // Smooth fade-in to avoid clicks
    masterRef.current.gain.linearRampToValueAtTime(vol / 200, ctx.currentTime + 1.2);

    // Stereo merger for binaural support
    if (!mergerRef.current) mergerRef.current = ctx.createChannelMerger(2);
    mergerRef.current.disconnect();
    mergerRef.current.connect(masterRef.current);

    // Left channel oscillator at hz
    gainLRef.current = ctx.createGain();
    gainLRef.current.gain.value = 0.5;
    oscLRef.current = ctx.createOscillator();
    oscLRef.current.type = "sine";
    oscLRef.current.frequency.value = hz;
    oscLRef.current.connect(gainLRef.current).connect(mergerRef.current, 0, 0);
    oscLRef.current.start();

    // Right channel oscillator (same if no beat, otherwise hz+beat for binaural)
    gainRRef.current = ctx.createGain();
    gainRRef.current.gain.value = 0.5;
    oscRRef.current = ctx.createOscillator();
    oscRRef.current.type = "sine";
    oscRRef.current.frequency.value = hz + (beat || 0);
    oscRRef.current.connect(gainRRef.current).connect(mergerRef.current, 0, 1);
    oscRRef.current.start();

    setPlaying(true);
    setElapsed(0);
    tickRef.current = window.setInterval(() => setElapsed(e => e + 1), 1000);
  };

  // Update frequency live without restarting
  useEffect(() => {
    if (!playing || !ctxRef.current) return;
    const t = ctxRef.current.currentTime;
    if (oscLRef.current) oscLRef.current.frequency.linearRampToValueAtTime(hz, t + 0.4);
    if (oscRRef.current) oscRRef.current.frequency.linearRampToValueAtTime(hz + (beat || 0), t + 0.4);
  }, [hz, beat, playing]);

  // Update master volume live
  useEffect(() => {
    if (!ctxRef.current || !masterRef.current) return;
    const t = ctxRef.current.currentTime;
    masterRef.current.gain.linearRampToValueAtTime(playing ? vol / 200 : 0, t + 0.25);
  }, [vol, playing]);

  // Cleanup on unmount
  useEffect(() => () => {
    mountedRef.current = false;
    if (fadeRef.current) { window.clearTimeout(fadeRef.current); fadeRef.current = null; }
    stop();
    try { ctxRef.current?.close(); } catch {}
    ctxRef.current = null;
  }, []);

  const toggle = () => {
    if (playing) {
      // Smooth fade-out then stop
      const ctx = ctxRef.current;
      if (ctx && masterRef.current) {
        const t = ctx.currentTime;
        masterRef.current.gain.linearRampToValueAtTime(0, t + 0.6);
        if (fadeRef.current) window.clearTimeout(fadeRef.current);
        fadeRef.current = window.setTimeout(() => {
          fadeRef.current = null;
          if (mountedRef.current) stop();
        }, 700);
      } else stop();
    } else {
      start().catch(() => {});
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const active = PRESETS.find(p => p.hz === hz);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 border border-violet-500/20 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">Healing Frequencies</h3>
            <p className="text-violet-300/80 text-xs">Pure solfeggio tones · generated live in your browser</p>
          </div>
        </div>
        {playing && (
          <div className="text-right">
            <div className="text-2xl font-mono text-white font-bold">{hz} Hz</div>
            <div className="text-[10px] text-violet-300/80 font-mono">{fmt(elapsed)} elapsed</div>
          </div>
        )}
      </div>

      {/* Visualizer + Play */}
      <div className="relative px-6 py-8 flex flex-col items-center">
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Pulsing rings */}
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${active?.color || "from-violet-500 to-purple-600"} opacity-20`}
              animate={playing ? { scale: [1, 1.7, 1], opacity: [0.3, 0, 0.3] } : { scale: 1, opacity: 0.15 }}
              transition={{ duration: 4, repeat: playing ? Infinity : 0, delay: i * 1.2, ease: "easeInOut" }}
            />
          ))}
          {/* Core */}
          <motion.button
            onClick={toggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={playing ? { boxShadow: ["0 0 30px rgba(139,92,246,0.4)", "0 0 60px rgba(139,92,246,0.7)", "0 0 30px rgba(139,92,246,0.4)"] } : {}}
            transition={{ duration: 3, repeat: playing ? Infinity : 0, ease: "easeInOut" }}
            className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${active?.color || "from-violet-500 to-purple-600"} flex items-center justify-center shadow-2xl`}
            aria-label={playing ? "Pause frequency" : "Play frequency"}
          >
            {playing ? <Pause className="w-12 h-12 text-white" /> : <Play className="w-12 h-12 text-white ml-1.5" />}
          </motion.button>
        </div>

        {active && (
          <div className="mt-4 text-center max-w-md">
            <p className="text-white font-bold text-lg">{active.name} · <span className="font-normal text-violet-200">{active.short}</span></p>
            <p className="text-violet-200/70 text-xs mt-1 leading-relaxed">{active.desc}</p>
          </div>
        )}
      </div>

      {/* Frequency presets */}
      <div className="px-6 pb-4">
        <p className="text-[10px] uppercase tracking-wider text-violet-300/70 font-bold mb-2">Solfeggio Presets</p>
        <div className="grid grid-cols-5 gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.hz}
              onClick={() => setHz(p.hz)}
              className={`text-xs py-2 rounded-lg font-semibold transition-all ${
                hz === p.hz
                  ? `bg-gradient-to-br ${p.color} text-white shadow-md`
                  : "bg-white/5 text-violet-200 hover:bg-white/10"
              }`}
            >
              {p.hz}
            </button>
          ))}
        </div>
      </div>

      {/* Custom slider */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-violet-300/70 font-bold mb-2">
          <span>Custom Tone</span>
          <span className="font-mono text-white">{hz} Hz</span>
        </div>
        <input
          type="range"
          min={50}
          max={1200}
          step={1}
          value={hz}
          onChange={e => setHz(Number(e.target.value))}
          className="w-full accent-violet-400"
          aria-label="Frequency in Hertz"
        />
      </div>

      {/* Binaural beat */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-violet-300/70 font-bold mb-2">
          <Headphones className="w-3 h-3" /> Binaural Beat (use headphones)
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {BEATS.map(b => (
            <button
              key={b.val}
              onClick={() => setBeat(b.val)}
              title={b.desc}
              className={`text-xs py-2 rounded-lg font-semibold transition-all ${
                beat === b.val
                  ? "bg-violet-500 text-white shadow-md"
                  : "bg-white/5 text-violet-200 hover:bg-white/10"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Volume */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-violet-300/70 font-bold mb-2">
          <span>Volume</span>
          <span className="font-mono text-white">{vol}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={vol}
          onChange={e => setVol(Number(e.target.value))}
          className="w-full accent-violet-400"
          aria-label="Volume"
        />
        <p className="mt-3 text-[10px] text-violet-300/60 leading-relaxed text-center inline-flex items-start gap-1">
          <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
          Pure sine waves are intense — start at low volume and use headphones for binaural beats. Stop if you feel any discomfort.
        </p>
      </div>
    </div>
  );
}
