import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type MutableRefObject, type PointerEvent as RPointerEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronsUp,
  CircleHelp,
  Footprints,
  Heart,
  Navigation,
  Pause,
  Play,
  Radar,
  RotateCcw,
  Satellite,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  TriangleAlert,
  Volume2,
  VolumeX,
  X,
  Zap,
  Radio,
  Truck,
} from 'lucide-react';
import { missions, worlds, type Mission, type MissionKind, type World } from '@/game/catalog';
import {
  COSTS,
  applyDamage,
  collectMission,
  loadProgress,
  purchaseUpgrade,
  saveProgress,
  type Progress,
  type Upgrade,
} from '@/game/rules';
import GameScene, { type Ctl } from '@/game/Scene';
import { buildTerrain, createRuntime, PULSE_COOLDOWN, type Action } from '@/game/runtime';
import { play, type Sfx } from '@/game/sfx';
import { StationQuiz } from '@/components/StationQuiz';
import { stationQuestions, cooldownSeconds, loadCooldowns, saveCooldowns, RETRY_MS } from '@/game/quizzes';

const KEYMAP: { name: Ctl; keys: string[] }[] = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'back', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'scan', keys: ['KeyE'] },
  { name: 'pulse', keys: ['KeyF'] },
];

type Panel = 'guide' | 'shop' | 'help' | null;

const KIND_META: Record<MissionKind, { label: string; color: string; icon: typeof Truck }> = {
  surface: { label: 'Surface gear', color: '#f2735c', icon: Truck },
  orbit: { label: 'Orbital relay', color: '#3fb3c4', icon: Satellite },
  signals: { label: 'Archive beacon', color: '#9a7ae0', icon: Radio },
};

const WORLD_TINT: Record<World, string> = { moon: '#b9b4dc', mars: '#f2a37f' };

interface Feed {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

function readPreference(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writePreference(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

export default function Expedition() {
  const [world, setWorld] = useState<World>(() => (readPreference('pq-world') === 'mars' ? 'mars' : 'moon'));
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [saveOk, setSaveOk] = useState(true);
  const [health, setHealth] = useState(3);
  const [hitFlash, setHitFlash] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [panel, setPanel] = useState<Panel>(() => (readPreference('pq-briefed') ? null : 'help'));
  const [sound, setSound] = useState(() => readPreference('pq-sound') !== 'off');
  const [discovery, setDiscovery] = useState<Mission | null>(null);
  const [celebrate, setCelebrate] = useState<World | null>(null);
  const [feed, setFeed] = useState<Feed[]>([]);
  const [hud, setHud] = useState({ id: null as string | null, dist: 0, inRange: false, powerLeft: 0, pulseReady: true, angle: 0 });
  const [isTouch, setIsTouch] = useState(false);
  const [quiz, setQuiz] = useState<Mission | null>(null);
  const quizRef = useRef<Mission | null>(null);
  const [cooldowns, setCooldowns] = useState(loadCooldowns);
  const cooldownRef = useRef(cooldowns);
  const [now, setNow] = useState(Date.now);
  const [failedStation, setFailedStation] = useState<Mission | null>(null);

  const rt = useRef(createRuntime());
  const powerEnd = useRef(0);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const healthRef = useRef(health);
  healthRef.current = health;
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const list = useMemo(() => missions.filter((m) => m.world === world), [world]);
  const terrain = useMemo(() => buildTerrain(world, list), [world, list]);
  const paused = userPaused || panel !== null || celebrate !== null || quiz !== null;
  const powered = hud.powerLeft > 0;
  const worldDone = list.filter((m) => progress.collected.includes(m.id)).length;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const closeQuiz = useCallback(() => {
    quizRef.current = null;
    setQuiz(null);
    rt.current.actions = [];
    rt.current.touch = { f: false, b: false, l: false, r: false };
    rt.current.invulnUntil = rt.current.time + 1.5;
  }, []);

  const sfx = useCallback((s: Sfx) => soundRef.current && play(s), []);
  const say = useCallback((text: string, tone: Feed['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setFeed((f) => [...f.slice(-2), { id, text, tone }]);
    setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 2700);
  }, []);

  const commit = useCallback((p: Progress) => {
    progressRef.current = p;
    setProgress(p);
    setSaveOk(saveProgress(p));
  }, []);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);
  useEffect(() => {
    if (!writePreference('pq-world', world)) setSaveOk(false);
  }, [world]);
  useEffect(() => {
    if (!writePreference('pq-sound', sound ? 'on' : 'off')) setSaveOk(false);
  }, [sound]);

  // HUD poll
  useEffect(() => {
    const t = setInterval(() => {
      const r = rt.current;
      const target = r.nearestId ? list.find((m) => m.id === r.nearestId) : undefined;
      const angle = target ? (Math.atan2(target.x - r.pos.x, -(target.z - r.pos.z)) * 180) / Math.PI : 0;
      setHud({
        id: r.nearestId,
        dist: Number.isFinite(r.nearestDist) ? r.nearestDist : 0,
        inRange: r.inRange,
        powerLeft: Math.max(0, powerEnd.current - r.time),
        pulseReady: r.time - r.pulseAt > PULSE_COOLDOWN,
        angle,
      });
    }, 120);
    return () => clearInterval(t);
  }, [list]);

  // keyboard pause / panels
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (quizRef.current) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Escape') {
        if (panel) setPanel(null);
        else setUserPaused((p) => !p);
      } else if (e.code === 'KeyP') setUserPaused((p) => !p);
      else if (e.code === 'KeyG') setPanel((p) => (p === 'guide' ? null : 'guide'));
      else if (e.code === 'KeyU') setPanel((p) => (p === 'shop' ? null : 'shop'));
      else if (e.code === 'KeyH') setPanel((p) => (p === 'help' ? null : 'help'));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [panel]);

  const awardRecord = useCallback(
    (id: string) => {
      const { progress: next, awarded } = collectMission(progressRef.current, id);
      const m = missions.find((x) => x.id === id);
      if (!awarded || !m) return;
      commit(next);
      sfx('scan');
      setDiscovery(m);
      say(`+100  ${m.name} logged`, 'good');
      const all = missions.filter((x) => x.world === m.world);
      if (all.every((x) => next.collected.includes(x.id))) {
        setTimeout(() => {
          setDiscovery(null);
          setCelebrate(m.world);
          sfx('win');
        }, 2400);
      } else setTimeout(() => setDiscovery((d) => (d?.id === id ? null : d)), 6500);
    },
    [commit, say, sfx],
  );

  const onScan = useCallback((id: string) => {
    if (quizRef.current || progressRef.current.collected.includes(id)) return;
    const station = missions.find(m => m.id === id);
    if (!station || !stationQuestions[id]) return;
    const seconds = cooldownSeconds(cooldownRef.current, id);
    if (seconds > 0) {
      setFailedStation(station);
      say(`Station locked. Try again in ${seconds} seconds.`, 'bad');
      return;
    }
    rt.current.actions = [];
    rt.current.touch = { f: false, b: false, l: false, r: false };
    quizRef.current = station;
    setQuiz(station);
    setDiscovery(null);
  }, [say]);

  const answerQuestion = (choice: number) => {
    const station = quizRef.current;
    if (!station) return;
    closeQuiz();
    if (cooldownSeconds(cooldownRef.current, station.id) > 0) return;
    if (choice === stationQuestions[station.id].correct) {
      setFailedStation(null);
      awardRecord(station.id);
    } else {
      const updated = { ...cooldownRef.current, [station.id]: Date.now() + RETRY_MS };
      cooldownRef.current = updated;
      setCooldowns(updated);
      setNow(Date.now());
      if (!saveCooldowns(updated)) setSaveOk(false);
      setFailedStation(station);
      sfx('deny');
    }
  };

  const onHit = useCallback(
    (reason: string) => {
      if (quizRef.current) return;
      const r = rt.current;
      if (r.invulnUntil > r.time) return;
      const isPowered = powerEnd.current > r.time;
      const res = applyDamage(progressRef.current, healthRef.current, isPowered);
      r.invulnUntil = r.time + 1.6;
      if (res.progress !== progressRef.current) commit(res.progress);
      healthRef.current = res.health;
      setHealth(res.health);
      if (!isPowered) {
        setHitFlash((n) => n + 1);
        sfx('hit');
      }
      say(res.message || (reason === 'meteor' ? 'Meteor impact' : 'Drone bump'), isPowered ? 'info' : 'bad');
      if (res.respawn) r.resetToken++;
    },
    [commit, say, sfx],
  );

  const onPulse = useCallback(
    (n: number) => {
      sfx('pulse');
      if (n > 0) say(`Pulse cleared ${n} drone${n > 1 ? 's' : ''}`, 'good');
    },
    [say, sfx],
  );

  const buy = (item: Upgrade) => {
    const res = purchaseUpgrade(progressRef.current, item);
    if (res.ok) {
      commit(res.progress);
      if (res.powerSeconds > 0) powerEnd.current = rt.current.time + res.powerSeconds;
      sfx('buy');
    } else sfx('deny');
    say(res.message, res.ok ? 'good' : 'bad');
  };

  const restart = () => {
    rt.current.resetToken++;
    rt.current.invulnUntil = rt.current.time + 2;
    setHealth(3);
    setUserPaused(false);
    say('Back at the landing pad');
  };

  const switchWorld = (w: World) => {
    if (w === world) return;
    setWorld(w);
    rt.current = createRuntime();
    powerEnd.current = 0;
    setDiscovery(null);
    setHealth(3);
    say(`Touchdown on the ${worlds[w].title}`);
  };

  const act = (a: Action) => rt.current.actions.push(a);
  const target = list.find((m) => m.id === hud.id);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden select-none" data-world={world}>
      <KeyboardControls map={KEYMAP}>
        <Canvas key={world} shadows dpr={[1, 1.6]} camera={{ fov: 50, position: [0, 10, 14], near: 0.1, far: 220 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
          <GameScene
            world={world}
            gravity={worlds[world].gravity}
            missions={list}
            collected={progress.collected}
            terrain={terrain}
            rt={rt}
            paused={paused}
            powered={powered}
            speedLevel={progress.speed}
            targetId={hud.id}
            onScan={onScan}
            onHit={onHit}
            onPulse={onPulse}
            onJump={() => sfx('jump')}
            onNoTarget={() => say('Nothing to scan here. Follow the compass.')}
          />
        </Canvas>
      </KeyboardControls>

      {/* hit vignette */}
      <div key={hitFlash} className={`pointer-events-none absolute inset-0 ${hitFlash ? 'animate-[ping_0.5s_ease-out_1]' : ''}`} style={{ boxShadow: hitFlash ? 'inset 0 0 120px 30px rgba(242,115,92,.35)' : 'none', opacity: 0.9 }} />

      {/* TOP BAR */}
      <header className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3 md:p-4 pointer-events-none">
        <div className="glass pointer-events-auto rounded-2xl px-3 py-2 md:px-4 md:py-3 shadow-sm pop-in">
          <div className="flex items-center gap-2">
            <div className="grid grid-cols-2 gap-[2px]" aria-hidden>
              <span className="h-2 w-2 bg-primary" />
              <span className="h-2 w-2 bg-secondary" />
              <span className="h-2 w-2 bg-accent" />
              <span className="h-2 w-2" style={{ background: WORLD_TINT[world] }} />
            </div>
            <span className="font-display text-sm md:text-base font-extrabold leading-none">Orbit Cadet</span>
            <span className="hidden sm:inline text-xs font-bold text-muted-foreground">Probe Quest</span>
          </div>
          <div className="mt-2 flex rounded-xl bg-muted p-1" role="tablist" aria-label="Choose world">
            {(['moon', 'mars'] as World[]).map((w) => (
              <button
                key={w}
                role="tab"
                aria-selected={world === w}
                data-testid={`button-world-${w}`}
                onClick={() => switchWorld(w)}
                className={`relative rounded-lg px-3 py-1 text-xs font-extrabold transition-all ${world === w ? 'bg-card shadow-sm scale-100' : 'text-muted-foreground hover:text-foreground scale-95'}`}
              >
                <span className="mr-1 inline-block h-2 w-2 rounded-[2px]" style={{ background: WORLD_TINT[w] }} />
                {worlds[w].title}
                <span className="ml-1 font-mono text-[10px] opacity-60">{worlds[w].gravity} m/s²</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 hidden md:block max-w-[220px] text-[11px] font-semibold text-muted-foreground">{worlds[world].subtitle}</p>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex gap-1.5">
            <IconBtn label="Field guide (G)" testid="button-guide" onClick={() => setPanel('guide')}><BookOpen size={18} /></IconBtn>
            <IconBtn label="Upgrade shop (U)" testid="button-shop" onClick={() => setPanel('shop')}><ShoppingBag size={18} /></IconBtn>
            <IconBtn label="Mission brief (H)" testid="button-help" onClick={() => setPanel('help')}><CircleHelp size={18} /></IconBtn>
            <IconBtn label={sound ? 'Mute sound' : 'Turn sound on'} testid="button-sound" onClick={() => setSound((s) => !s)}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</IconBtn>
            <IconBtn label="Pause (P)" testid="button-pause" onClick={() => setUserPaused(true)} accent><Pause size={18} /></IconBtn>
          </div>
          <Stats progress={progress} health={health} hitKey={hitFlash} powerLeft={hud.powerLeft} worldDone={worldDone} worldTotal={list.length} />
        </div>
      </header>

      {!saveOk && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-destructive px-4 py-1.5 text-xs font-bold text-destructive-foreground shadow pop-in" data-testid="status-save">
          <TriangleAlert size={14} className="mr-1 inline" /> Saving is unavailable in this browser. Progress will reset when you leave.
        </div>
      )}

      {/* Compass */}
      <div className="pointer-events-none absolute left-1/2 top-[92px] md:top-6 -translate-x-1/2">
        {target ? (
          <div className="glass flex items-center gap-3 rounded-2xl px-3 py-2 shadow-sm pop-in" key={target.id} data-testid="status-target">
            <div className="relative grid h-10 w-10 place-items-center rounded-xl" style={{ background: KIND_META[target.kind].color + '22' }}>
              {hud.inRange && <span className="pulse-ring absolute inset-0 rounded-xl border-2" style={{ borderColor: KIND_META[target.kind].color }} />}
              <Navigation size={20} style={{ transform: `rotate(${hud.angle}deg)`, color: KIND_META[target.kind].color, transition: 'transform .15s linear' }} fill="currentColor" />
            </div>
            <div className="leading-tight">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{KIND_META[target.kind].label}</div>
              <div className="max-w-[170px] truncate font-display text-sm font-bold">{target.name}</div>
            </div>
            <div className="font-mono text-lg font-bold tabular-nums" data-testid="text-distance">{hud.inRange ? 'SCAN' : `${Math.round(hud.dist)}m`}</div>
          </div>
        ) : (
          <div className="glass rounded-2xl px-4 py-2 font-display text-sm font-bold">Every {worlds[world].title} record found</div>
        )}
      </div>

      {hud.inRange && !paused && (
        <button
          onClick={() => act('scan')}
          disabled={!!target && cooldownSeconds(cooldowns, target.id, now) > 0}
          data-testid="button-scan-prompt"
          className="chunky absolute left-1/2 bottom-[150px] md:bottom-28 -translate-x-1/2 rounded-2xl bg-primary px-5 py-3 font-display text-base font-extrabold text-primary-foreground pop-in"
        >
          <Radar size={18} className="mr-2 inline" />
          {target && cooldownSeconds(cooldowns, target.id, now) > 0
            ? `Retry in ${cooldownSeconds(cooldowns, target.id, now)}s`
            : 'Press E · Station quiz'}
        </button>
      )}

      {failedStation && !quiz && (
        <div role="status" data-testid="station-cooldown" className="absolute left-1/2 top-[160px] z-10 w-[min(440px,92vw)] -translate-x-1/2 rounded-2xl border-2 border-primary bg-card p-4 shadow-lg">
          <button aria-label="Dismiss station message" className="float-right p-1" onClick={() => setFailedStation(null)}><X size={16} /></button>
          <p className="font-display font-bold">{failedStation.name}</p>
          {cooldownSeconds(cooldowns, failedStation.id, now) > 0 ? <>
            <p className="text-sm">Incorrect answer. You cannot collect this for now. You can only collect this after 1 minute.</p>
            <p className="mt-2 font-bold">Try again in {cooldownSeconds(cooldowns, failedStation.id, now)}s</p>
            <p className="text-xs">Keep exploring: other stations are still available.</p>
          </> : <p className="text-sm font-bold">Ready to retry! Return to this station and press E.</p>}
        </div>
      )}

      {/* Feed */}
      <div className="pointer-events-none absolute left-3 bottom-[170px] md:bottom-6 flex flex-col gap-1.5">
        {feed.map((f) => (
          <div key={f.id} className={`float-up rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm ${f.tone === 'good' ? 'bg-secondary text-secondary-foreground' : f.tone === 'bad' ? 'bg-destructive text-destructive-foreground' : 'glass'}`}>
            {f.text}
          </div>
        ))}
      </div>

      {/* Discovery card */}
      {discovery && !paused && (
        <div className="absolute right-3 bottom-[170px] md:bottom-6 w-[min(360px,calc(100%-24px))] glass rounded-2xl p-4 shadow-lg pop-in" data-testid="card-discovery">
          <div className="flex items-start justify-between gap-2">
            <KindChip kind={discovery.kind} />
            <button aria-label="Close" onClick={() => setDiscovery(null)} className="rounded-lg p-1 hover:bg-muted"><X size={16} /></button>
          </div>
          <h3 className="mt-2 font-display text-xl font-extrabold leading-tight">{discovery.name}</h3>
          <div className="text-xs font-bold text-muted-foreground">{discovery.type} · {discovery.year}</div>
          <p className="mt-2 text-sm leading-relaxed">{discovery.fact}</p>
        </div>
      )}

      {/* Desktop key hints */}
      {!isTouch && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 md:flex gap-1.5 text-[11px] font-bold text-foreground/70">
          {[['WASD', 'move'], ['Space', 'hop'], ['E', 'scan'], ['F', 'pulse'], ['P', 'pause']].map(([k, v]) => (
            <span key={k} className="glass rounded-lg px-2 py-1"><kbd className="font-mono text-foreground">{k}</kbd> {v}</span>
          ))}
        </div>
      )}

      {/* Pulse button (always) + touch pad */}
      <TouchControls
        rt={rt}
        isTouch={isTouch}
        pulseReady={hud.pulseReady}
        onAct={act}
      />

      {/* Pause overlay */}
      {userPaused && !panel && (
        <Overlay>
          <div className="glass w-[min(380px,92vw)] rounded-3xl p-6 text-center shadow-xl pop-in">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-secondary"><Pause /></div>
            <h2 className="font-display text-3xl font-extrabold">Taking a breather</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your astronaut is floating safely. Discoveries and points are saved.</p>
            <div className="mt-5 grid gap-2">
              <button data-testid="button-resume" onClick={() => setUserPaused(false)} className="chunky rounded-2xl bg-primary py-3 font-display text-lg font-extrabold text-primary-foreground"><Play size={18} className="mr-2 inline" />Resume</button>
              <button data-testid="button-restart" onClick={restart} className="chunky rounded-2xl bg-card py-3 font-bold"><RotateCcw size={16} className="mr-2 inline" />Restart at landing pad</button>
              <p className="text-[11px] text-muted-foreground">Restart moves you back and refills hearts. Your collection stays.</p>
            </div>
          </div>
        </Overlay>
      )}

      {panel === 'guide' && <GuidePanel progress={progress} onClose={() => setPanel(null)} />}
      {panel === 'shop' && <ShopPanel progress={progress} onBuy={buy} powerLeft={hud.powerLeft} onClose={() => setPanel(null)} />}
      {panel === 'help' && (
        <HelpPanel
          onClose={() => {
            if (!writePreference('pq-briefed', '1')) setSaveOk(false);
            setPanel(null);
          }}
        />
      )}
      {celebrate && (
        <Celebration
          world={celebrate}
          onClose={() => setCelebrate(null)}
          onSwitch={() => {
            const other = celebrate === 'moon' ? 'mars' : 'moon';
            setCelebrate(null);
            switchWorld(other);
          }}
        />
      )}
      {quiz && <StationQuiz mission={quiz} onAnswer={answerQuestion} onClose={closeQuiz} />}
    </div>
  );
}

/* ---------------- Pieces ---------------- */

function IconBtn({ children, label, onClick, testid, accent }: { children: ReactNode; label: string; onClick: () => void; testid: string; accent?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      data-testid={testid}
      onClick={onClick}
      className={`chunky grid h-10 w-10 place-items-center rounded-xl ${accent ? 'bg-primary text-primary-foreground' : 'glass text-foreground'}`}
    >
      {children}
    </button>
  );
}

function Stats({ progress, health, hitKey, powerLeft, worldDone, worldTotal }: { progress: Progress; health: number; hitKey: number; powerLeft: number; worldDone: number; worldTotal: number }) {
  const pct = worldTotal ? (worldDone / worldTotal) * 100 : 0;
  return (
    <div className="glass w-[200px] md:w-[230px] rounded-2xl p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex gap-1" key={hitKey} data-testid="status-health">
          {[0, 1, 2].map((i) => (
            <Heart key={i} size={18} className={i === health ? 'heart-hit' : ''} fill={i < health ? '#f2735c' : 'transparent'} color={i < health ? '#f2735c' : '#b9b4cf'} />
          ))}
        </div>
        <div className="flex items-center gap-1 font-mono text-base font-bold tabular-nums" data-testid="text-points">
          <Star size={15} fill="#f6c453" color="#d39432" />
          {progress.points}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
        <span className="flex items-center gap-0.5" data-testid="status-shields"><Shield size={13} /> {progress.shield}</span>
        <span className="flex items-center gap-0.5"><Footprints size={13} /> Lv {progress.speed}</span>
        {powerLeft > 0 && <span className="flex items-center gap-0.5 rounded-md bg-accent px-1 text-accent-foreground"><Zap size={12} /> {Math.ceil(powerLeft)}s</span>}
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-[11px] font-bold"><span>Records</span><span className="font-mono" data-testid="text-collection">{worldDone}/{worldTotal}</span></div>
        <div className="mt-1 flex gap-[2px]">
          {Array.from({ length: worldTotal }, (_, i) => (
            <span key={i} className="h-2 flex-1 rounded-[2px] transition-colors duration-500" style={{ background: i < worldDone ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }} />
          ))}
        </div>
        <span className="sr-only">{Math.round(pct)} percent</span>
      </div>
    </div>
  );
}

function TouchControls({ rt, isTouch, pulseReady, onAct }: { rt: MutableRefObject<ReturnType<typeof createRuntime>>; isTouch: boolean; pulseReady: boolean; onAct: (a: Action) => void }) {
  const hold = (k: 'f' | 'b' | 'l' | 'r') => ({
    onPointerDown: (e: RPointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      rt.current.touch[k] = true;
    },
    onPointerUp: () => (rt.current.touch[k] = false),
    onPointerCancel: () => (rt.current.touch[k] = false),
    onPointerLeave: () => (rt.current.touch[k] = false),
  });
  const pad = 'glass grid h-14 w-14 place-items-center rounded-2xl active:scale-90 active:bg-secondary transition-transform touch-none';
  return (
    <>
      <div className={`absolute bottom-4 left-4 grid grid-cols-3 gap-1.5 ${isTouch ? '' : 'md:hidden'}`}>
        <span />
        <button aria-label="Forward" data-testid="touch-forward" className={pad} {...hold('f')}><ArrowUp /></button>
        <span />
        <button aria-label="Left" data-testid="touch-left" className={pad} {...hold('l')}><ArrowLeft /></button>
        <button aria-label="Back" data-testid="touch-back" className={pad} {...hold('b')}><ArrowDown /></button>
        <button aria-label="Right" data-testid="touch-right" className={pad} {...hold('r')}><ArrowRight /></button>
      </div>
      <div className={`absolute bottom-4 right-4 flex items-end gap-2 ${isTouch ? '' : 'md:hidden'}`}>
        <button aria-label="Scan" data-testid="touch-scan" onPointerDown={() => onAct('scan')} className="glass grid h-14 w-14 place-items-center rounded-2xl active:scale-90 transition-transform touch-none"><Radar /></button>
        <button aria-label="Pulse" data-testid="touch-pulse" onPointerDown={() => onAct('pulse')} className={`grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground active:scale-90 transition-all touch-none ${pulseReady ? '' : 'opacity-40'}`}><Zap /></button>
        <button aria-label="Jump" data-testid="touch-jump" onPointerDown={() => onAct('jump')} className="grid h-20 w-20 place-items-center rounded-3xl bg-primary text-primary-foreground active:scale-90 transition-transform touch-none shadow-md"><ChevronsUp size={30} /></button>
      </div>
      {!isTouch && (
        <div className="absolute bottom-4 right-4 hidden md:flex items-center gap-2 glass rounded-2xl px-3 py-2 text-xs font-bold">
          <Zap size={15} className={pulseReady ? 'text-primary' : 'text-muted-foreground'} />
          Pulse {pulseReady ? 'ready' : 'charging'}
        </div>
      )}
    </>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 z-20 grid place-items-center bg-[hsl(222_45%_4%/0.55)] p-3 backdrop-blur-[3px]">{children}</div>;
}

function Sheet({ title, icon, onClose, children, testid }: { title: string; icon: ReactNode; onClose: () => void; children: ReactNode; testid: string }) {
  return (
    <Overlay>
      <div className="flex max-h-[90dvh] w-[min(760px,96vw)] flex-col overflow-hidden rounded-3xl bg-card shadow-2xl pop-in" data-testid={testid} role="dialog" aria-label={title}>
        <div className="flex items-center justify-between border-b-2 border-border px-5 py-3">
          <div className="flex items-center gap-2 font-display text-2xl font-extrabold">{icon}{title}</div>
          <button aria-label="Close" data-testid="button-close-panel" onClick={onClose} className="chunky grid h-9 w-9 place-items-center rounded-xl bg-muted"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </Overlay>
  );
}

function KindChip({ kind }: { kind: MissionKind }) {
  const k = KIND_META[kind];
  const I = k.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-extrabold" style={{ background: k.color + '22', color: k.color }}>
      <I size={12} /> {k.label}
    </span>
  );
}

function Credits() {
  return (
    <footer className="mt-5 rounded-2xl bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground" data-testid="text-credits">
      Models and site layouts are simplified, procedurally textured interpretations. Orbiters are collected at ground relays; failed missions and flybys are remembered at archive beacons, not shown as landed. The chasing drones are fictional. This fan-made learning game is not affiliated with or endorsed by NASA. Mission facts draw on NASA Science:{' '}
      <a className="font-bold underline" href="https://science.nasa.gov/moon/missions/" target="_blank" rel="noreferrer">Moon missions</a> and{' '}
      <a className="font-bold underline" href="https://science.nasa.gov/planetary-science/programs/mars-exploration/" target="_blank" rel="noreferrer">Mars exploration</a>.
      <p className="mt-2">Station questions use the supplied hackathon Resources document for Apollo, lunar rovers, ALSEP, Surveyor, Sojourner, Viking, Spirit and Opportunity, Phoenix, InSight, and Ingenuity. Additional stations use the original mission guide. Explore the provided resource:{' '}
        <a className="font-bold underline" href="https://nssdc.gsfc.nasa.gov/nmc/" target="_blank" rel="noreferrer">NASA Space Science Data Coordinated Archive (NSSDCA)</a>.
        {' '}Dawn, NEAR, Pioneer 10/11, and Kepler are outside these Moon/Mars levels; they are not presented as hardware on either world.
      </p>
    </footer>
  );
}

function GuidePanel({ progress, onClose }: { progress: Progress; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [w, setW] = useState<'all' | World>('all');
  const [kind, setKind] = useState<'all' | MissionKind>('all');
  const [found, setFound] = useState<'all' | 'found' | 'missing'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const rows = missions
    .filter((m) => (w === 'all' || m.world === w) && (kind === 'all' || m.kind === kind))
    .filter((m) => {
      const has = progress.collected.includes(m.id);
      return found === 'all' || (found === 'found' ? has : !has);
    })
    .filter((m) => `${m.name} ${m.type} ${m.fact} ${m.year}`.toLowerCase().includes(q.toLowerCase().trim()))
    .sort((a, b) => a.year - b.year);
  const Seg = <T extends string>({ val, set, opts, id }: { val: T; set: (v: T) => void; opts: [T, string][]; id: string }) => (
    <div className="flex rounded-xl bg-muted p-1">
      {opts.map(([v, l]) => (
        <button key={v} data-testid={`filter-${id}-${v}`} onClick={() => set(v)} className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition-all ${val === v ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{l}</button>
      ))}
    </div>
  );
  return (
    <Sheet title="Field guide" icon={<BookOpen className="text-primary" />} onClose={onClose} testid="panel-guide">
      <p className="text-sm text-muted-foreground">{progress.collected.length} of {missions.length} records discovered. Locked entries still show their story — go find them to light them up.</p>
      <div className="mt-3 flex items-center gap-2 rounded-2xl border-2 border-input bg-background px-3 focus-within:border-primary transition-colors">
        <Search size={16} className="text-muted-foreground" />
        <input data-testid="input-guide-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Apollo, rover, 1976..." className="h-11 flex-1 bg-transparent text-sm font-semibold outline-none" />
        {q && <button aria-label="Clear" onClick={() => setQ('')}><X size={14} /></button>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Seg val={w} set={(v) => setW(v as World | "all")} id="world" opts={[['all', 'Both'], ['moon', 'Moon'], ['mars', 'Mars']]} />
        <Seg val={kind} set={(v) => setKind(v as MissionKind | "all")} id="kind" opts={[['all', 'All'], ['surface', 'Surface'], ['orbit', 'Relays'], ['signals', 'Archives']]} />
        <Seg val={found} set={(v) => setFound(v as "all" | "found" | "missing")} id="found" opts={[['all', 'Any'], ['found', 'Found'], ['missing', 'To find']]} />
      </div>
      <ul className="mt-4 grid gap-2">
        {rows.length === 0 && (
          <li className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
            <Radar className="mx-auto text-muted-foreground" />
            <p className="mt-2 font-display font-bold">No signals match that search</p>
            <button className="mt-2 text-xs font-bold text-primary underline" onClick={() => { setQ(''); setW('all'); setKind('all'); setFound('all'); }}>Reset filters</button>
          </li>
        )}
        {rows.map((m) => {
          const has = progress.collected.includes(m.id);
          const isOpen = open === m.id;
          return (
            <li key={m.id} data-testid={`card-mission-${m.id}`} className={`rounded-2xl border-2 transition-all ${has ? 'border-secondary bg-background' : 'border-border bg-card'}`}>
              <button className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setOpen(isOpen ? null : m.id)} aria-expanded={isOpen}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${has ? 'bg-secondary' : 'bg-muted'}`}>
                  {has ? <Check size={18} /> : <span className="h-3 w-3 rounded-[3px]" style={{ background: KIND_META[m.kind].color }} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-base font-bold">{m.name}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{worlds[m.world].title} · {m.type} · {m.year}</span>
                </span>
                <KindChip kind={m.kind} />
              </button>
              {isOpen && <p className="px-4 pb-4 text-sm leading-relaxed pop-in">{m.fact}{!has && <span className="mt-1 block text-xs font-bold text-muted-foreground">Not yet scanned on {worlds[m.world].title}.</span>}</p>}
            </li>
          );
        })}
      </ul>
      <Credits />
    </Sheet>
  );
}

const SHOP: { id: Upgrade; title: string; text: string; icon: typeof Zap }[] = [
  { id: 'shield', title: 'Shield cell', text: 'Soaks up one meteor or drone bump before a heart is lost.', icon: Shield },
  { id: 'power', title: 'Power suit', text: 'Glowing armour for 18 seconds. Hazards bounce right off.', icon: Zap },
  { id: 'speed', title: 'Boot thrusters', text: 'Hop around faster. Up to level 3.', icon: Footprints },
];

function ShopPanel({ progress, onBuy, powerLeft, onClose }: { progress: Progress; onBuy: (u: Upgrade) => void; powerLeft: number; onClose: () => void }) {
  return (
    <Sheet title="Supply depot" icon={<ShoppingBag className="text-primary" />} onClose={onClose} testid="panel-shop">
      <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
        <span className="text-sm font-bold">Your discovery points</span>
        <span className="flex items-center gap-1 font-mono text-xl font-bold"><Star size={18} fill="#f6c453" color="#d39432" />{progress.points}</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_1fr]">
        {SHOP.map((s, i) => {
          const cost = COSTS[s.id];
          const maxed = s.id === 'speed' && progress.speed >= 3;
          const afford = progress.points >= cost;
          const I = s.icon;
          const owned = s.id === 'shield' ? `${progress.shield} stored` : s.id === 'speed' ? `Level ${progress.speed}/3` : powerLeft > 0 ? `${Math.ceil(powerLeft)}s left` : 'Ready to wear';
          return (
            <div key={s.id} className={`rounded-2xl border-2 border-border p-4 ${i === 0 ? 'md:row-span-2 bg-secondary/40' : 'bg-background'}`} data-testid={`card-upgrade-${s.id}`}>
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-card"><I size={20} /></span>
                <div>
                  <div className="font-display text-lg font-extrabold leading-tight">{s.title}</div>
                  <div className="text-xs font-bold text-muted-foreground">{owned}</div>
                </div>
              </div>
              <p className="mt-2 text-sm">{s.text}</p>
              {s.id === 'speed' && (
                <div className="mt-2 flex gap-1">{[1, 2, 3].map((l) => <span key={l} className={`h-2 flex-1 rounded-[2px] ${l <= progress.speed ? 'bg-primary' : 'bg-muted'}`} />)}</div>
              )}
              <button
                data-testid={`button-buy-${s.id}`}
                onClick={() => onBuy(s.id)}
                disabled={maxed}
                className={`chunky mt-3 w-full rounded-xl py-2.5 font-display font-extrabold ${maxed ? 'bg-muted text-muted-foreground' : afford ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}
              >
                {maxed ? 'Fully upgraded' : <>Buy for <span className="font-mono">{cost}</span>{!afford && ` · need ${cost - progress.points} more`}</>}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Answer a station question correctly to collect a new record and earn 100 points.</p>
    </Sheet>
  );
}

function HelpPanel({ onClose }: { onClose: () => void }) {
  const steps: [typeof Footprints, string, string][] = [
    [Footprints, 'Hop around', 'WASD or arrow keys to walk. Space to jump. The Moon pulls gently at 1.62 m/s², Mars a little harder at 3.71 m/s².'],
    [Navigation, 'Follow the compass', 'The arrow at the top points to the nearest record you have not found yet.'],
    [Radar, 'Answer to collect', 'Press E at a station. The game pauses for one question with four choices. Correct: collect the record and 100 points. Wrong: that station locks for 60 seconds; explore others while you wait.'],
    [TriangleAlert, 'Dodge meteors', 'A red circle means a space rock is about to land. Step out of it quickly.'],
    [Zap, 'Pulse with F', 'Pretend alien drones will chase you. A pulse shoos away any drone close by.'],
    [Shield, 'Gear up', 'Spend points on shields, a power suit, or faster boots in the supply depot.'],
  ];
  return (
    <Sheet title="Mission brief" icon={<Sparkles className="text-primary" />} onClose={onClose} testid="panel-help">
      <p className="font-display text-lg font-bold leading-snug">Welcome, Cadet. Robots and astronauts have left real hardware all over the Moon and Mars. Find their markers and bring their stories home.</p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2">
        {steps.map(([I, t, d], i) => (
          <li key={t} className="flex gap-3 rounded-2xl bg-muted p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card font-mono text-xs font-bold"><I size={17} /></span>
            <span><span className="font-display font-extrabold"><span className="font-mono text-xs text-muted-foreground">{i + 1}. </span>{t}</span><span className="block text-xs leading-relaxed">{d}</span></span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(KIND_META) as MissionKind[]).map((k) => <KindChip key={k} kind={k} />)}
      </div>
      <button data-testid="button-start" onClick={onClose} className="chunky mt-4 w-full rounded-2xl bg-primary py-3 font-display text-lg font-extrabold text-primary-foreground"><Play size={18} className="mr-2 inline" />Start exploring</button>
      <Credits />
    </Sheet>
  );
}

function Celebration({ world, onClose, onSwitch }: { world: World; onClose: () => void; onSwitch: () => void }) {
  const bits = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 9) * 0.35, dur: 3 + (i % 5) * 0.6, c: ['#f2735c', '#3fb3c4', '#f6c453', '#9a7ae0', '#8ccf9a'][i % 5] })), []);
  const other = world === 'moon' ? 'mars' : 'moon';
  return (
    <Overlay>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {bits.map((b, i) => <span key={i} className="confetti" style={{ left: `${b.left}%`, background: b.c, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }} />)}
      </div>
      <div className="relative w-[min(440px,92vw)] rounded-3xl bg-card p-7 text-center shadow-2xl pop-in" data-testid="panel-celebration">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent"><Trophy size={32} /></div>
        <h2 className="mt-3 font-display text-4xl font-extrabold leading-none">{worlds[world].title} complete</h2>
        <p className="mt-2 text-sm">You found every record on the {worlds[world].title}. Mission control is very proud of you, Cadet.</p>
        <div className="mt-5 grid gap-2">
          <button data-testid="button-next-world" onClick={onSwitch} className="chunky rounded-2xl bg-primary py-3 font-display text-lg font-extrabold text-primary-foreground">Fly to {worlds[other].title}</button>
          <button data-testid="button-keep-exploring" onClick={onClose} className="chunky rounded-2xl bg-muted py-2.5 font-bold">Keep exploring here</button>
        </div>
      </div>
    </Overlay>
  );
}
