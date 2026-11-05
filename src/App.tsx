import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';
import * as THREE from 'three';

type Agent = { name: string; role: string; color: string; accent: string; skill: string; ult: string; sigil: string };
type BotState = { id: number; pos: [number, number, number]; hp: number; alive: boolean; agentIndex: number; abilityAt: number };
const agents: Agent[] = [
  { name: 'KITE', role: 'MOBILITY', color: '#55d6c2', accent: '#a8fff0', skill: 'Slipstream — 짧은 돌진으로 위치를 바꿉니다.', ult: 'JETSTREAM — 이동 속도와 연사 안정성 증가.', sigil: '↗' },
  { name: 'MORROW', role: 'SUPPORT', color: '#bd8dff', accent: '#e4d3ff', skill: 'Afterglow — 자신을 회복합니다.', ult: 'SECOND DAWN — 체력과 탄약을 완전히 회복합니다.', sigil: '✳' },
  { name: 'TINKER', role: 'SENTINEL', color: '#f0b857', accent: '#ffe1a3', skill: 'Tripwire — 주변 적에게 피해를 주는 드론을 배치합니다.', ult: 'LOCKDOWN — 인근 적을 약화시킵니다.', sigil: '⌘' },
  { name: 'VEX', role: 'DUELIST', color: '#fa687e', accent: '#ffb1bd', skill: 'Siphon — 처치 시 체력을 흡수합니다.', ult: 'REDLINE — 다음 탄창 피해량 증가.', sigil: '◈' },
  { name: 'UMBRA', role: 'CONTROLLER', color: '#7599ff', accent: '#c4d2ff', skill: 'Veilstep — 시야를 가리는 연막을 생성합니다.', ult: 'NIGHT SHIFT — 잠시 은폐하고 재배치합니다.', sigil: '◐' },
];
const weapons = [
  { name: 'SIDEKICK', category: 'PISTOL', cost: 0, damage: 34, mag: 12, rate: 0.28 },
  { name: 'VECTOR-9', category: 'SMG', cost: 1100, damage: 22, mag: 28, rate: 0.105 },
  { name: 'ARC-RIFLE', category: 'RIFLE', cost: 2900, damage: 38, mag: 25, rate: 0.17 },
  { name: 'LONGSHOT', category: 'MARKSMAN', cost: 4200, damage: 85, mag: 5, rate: 0.8 },
];
const difficultyStats = { Easy: { reaction: 2.4, aim: 0.2, speed: 1.15 }, Standard: { reaction: 1.35, aim: 0.52, speed: 1.55 }, Hard: { reaction: 0.72, aim: 0.78, speed: 1.9 } } as const;
type Difficulty = keyof typeof difficultyStats;
type GameStats = { hp: number; armor: number; ammo: number; reserve: number; credits: number; kills: number; round: number; alive: number; message: string; ability: number };
type GameProps = { agent: Agent; difficulty: Difficulty; onState: (s: Partial<GameStats>) => void; onEnd: (won: boolean) => void; resetKey: number; sensitivity: number; weaponIndex: number; onBotEvent: (message: string) => void };

function Arena({ agent, difficulty, onState, onEnd, resetKey, sensitivity, weaponIndex, onBotEvent }: GameProps) {
  const { camera } = useThree();
  const controls = useRef<any>(null);
  const initialBots = () => Array.from({ length: 5 }, (_, i): BotState => ({ id: i, pos: [((i % 3) - 1) * 7, 0, -13 - Math.floor(i / 3) * 8], hp: 100, alive: true, agentIndex: Math.floor(Math.random() * agents.length), abilityAt: 0 }));
  const [bots, setBots] = useState<BotState[]>(initialBots);
  const botRefs = useRef<(THREE.Group | null)[]>([]);
  const keys = useRef<Record<string, boolean>>({});
  const player = useRef({ hp: 100, armor: 50, ammo: 12, reserve: 48, credits: 800, kills: 0, round: 1, ability: 100, lastShot: 0, lastBotHit: 0, alive: true, reload: false, lastUse: 0 });
  const weapon = weapons[weaponIndex];
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const move = useRef(new THREE.Vector3());
  const [hitMarker, setHitMarker] = useState(false);
  const obstacles = useMemo(() => [
    new THREE.Box3(new THREE.Vector3(-3.2, 0, -10.5), new THREE.Vector3(-1.3, 3.5, -7.5)),
    new THREE.Box3(new THREE.Vector3(2.4, 0, -17), new THREE.Vector3(5.2, 2.4, -14.2)),
    new THREE.Box3(new THREE.Vector3(-10, 0, -20), new THREE.Vector3(-7.3, 3, -17)),
    new THREE.Box3(new THREE.Vector3(7, 0, -8), new THREE.Vector3(10, 3, -5)),
  ], []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    const fire = (e: MouseEvent) => {
      if (e.button !== 0 || !controls.current?.isLocked || !player.current.alive) return;
      const p = player.current; const now = performance.now() / 1000;
      if (p.reload || p.ammo <= 0 || now - p.lastShot < weapon.rate) return;
      p.lastShot = now; p.ammo--;
      camera.updateMatrixWorld(); raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hits = raycaster.intersectObjects(botRefs.current.filter((b): b is THREE.Group => !!b && b.visible), true);
      if (hits.length) {
        let parent: THREE.Object3D | null = hits[0].object;
        while (parent && parent.userData.botId === undefined) parent = parent.parent;
        const id = parent?.userData.botId as number | undefined;
        if (id !== undefined) setBots(prev => prev.map(bot => {
          if (bot.id !== id || !bot.alive) return bot;
          const hp = bot.hp - weapon.damage;
          if (hp <= 0) { p.kills++; p.credits += 200; onBotEvent(`${agents[bot.agentIndex].name} ELIMINATED  +200`); return { ...bot, hp: 0, alive: false }; }
          onBotEvent(`HIT CONFIRMED // ${agents[bot.agentIndex].name}`); return { ...bot, hp };
        }));
        setHitMarker(true); window.setTimeout(() => setHitMarker(false), 120);
      }
      onState({ ammo: p.ammo, reserve: p.reserve, kills: p.kills, credits: p.credits });
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('mousedown', fire);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('mousedown', fire); };
  }, [camera, onBotEvent, onState, raycaster, weapon]);

  useEffect(() => {
    camera.position.set(0, 1.65, 8);
    player.current = { hp: 100, armor: 50, ammo: weapon.mag, reserve: 48, credits: 800, kills: 0, round: 1, ability: 100, lastShot: 0, lastBotHit: 0, alive: true, reload: false, lastUse: 0 };
    setBots(initialBots());
  }, [resetKey, camera]);

  useFrame((_, delta) => {
    const p = player.current; const dt = Math.min(delta, 0.05); const k = keys.current; const now = performance.now() / 1000;
    if (controls.current?.isLocked && p.alive) {
      const speed = k.ShiftLeft ? 3.2 : (k.ControlLeft ? 2.3 : 5.2);
      move.current.set(Number(k.KeyD) - Number(k.KeyA), 0, Number(k.KeyS) - Number(k.KeyW));
      if (move.current.lengthSq() > 0) {
        move.current.normalize().multiplyScalar(speed * dt);
        const old = camera.position.clone(); controls.current.moveRight(move.current.x); controls.current.moveForward(-move.current.z);
        camera.position.y = k.Space ? 2.1 : 1.65;
        if (obstacles.some(box => box.containsPoint(new THREE.Vector3(camera.position.x, 0, camera.position.z)))) { camera.position.x = old.x; camera.position.z = old.z; }
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -14, 14); camera.position.z = THREE.MathUtils.clamp(camera.position.z, -26, 12);
      }
      if (k.KeyR && !p.reload && p.ammo < weapon.mag && p.reserve > 0) {
        p.reload = true; onBotEvent('RELOADING');
        window.setTimeout(() => { const take = Math.min(weapon.mag - p.ammo, p.reserve); p.ammo += take; p.reserve -= take; p.reload = false; onState({ ammo: p.ammo, reserve: p.reserve }); }, 1250);
      }
      if (k.KeyE && p.ability >= 100 && now - p.lastUse > 1) {
        p.lastUse = now; p.ability = 0;
        if (agent.role === 'SUPPORT') p.hp = Math.min(100, p.hp + 45);
        else if (agent.role === 'MOBILITY') controls.current.moveForward(-4);
        else if (agent.role === 'DUELIST') p.hp = Math.min(100, p.hp + 30);
        else if (agent.role === 'SENTINEL') setBots(prev => prev.map(b => b.alive ? { ...b, hp: Math.max(0, b.hp - 18), alive: b.hp - 18 > 0 } : b));
        onBotEvent(`${agent.name} // ${agent.skill.split(' — ')[0].toUpperCase()}`);
      }
      if (k.KeyX && p.ability >= 100 && now - p.lastUse > 1) { p.lastUse = now; p.ability = 0; p.hp = 100; p.armor = 50; p.ammo = weapon.mag; onBotEvent(`${agent.name} // ULTIMATE ACTIVATED`); }
    }
    p.ability = Math.min(100, p.ability + dt * 7);
    const difficultySettings = difficultyStats[difficulty];
    bots.forEach((bot, i) => {
      const group = botRefs.current[i]; if (!group || !bot.alive) return;
      const botAgent = agents[bot.agentIndex];
      const target = new THREE.Vector3(camera.position.x, 0, camera.position.z); const current = group.position;
      const distance = current.distanceTo(target);
      const hasLineOfSight = distance < 20 && !obstacles.some(box => box.intersectsLine(new THREE.Line3(current.clone().add(new THREE.Vector3(0, 1.5, 0)), target.clone().add(new THREE.Vector3(0, 1.4, 0)))));
      const dash = botAgent.role === 'MOBILITY' && now - bot.abilityAt > 9 && distance > 7;
      const botSpeed = difficultySettings.speed * (dash ? 2.8 : 1);
      if (distance > 5.5) { const direction = target.clone().sub(current).normalize(); current.addScaledVector(direction, botSpeed * dt); group.rotation.y = Math.atan2(direction.x, direction.z); }
      if (dash) { bot.abilityAt = now; onBotEvent(`${botAgent.name} // SLIPSTREAM`); }
      if (now - bot.abilityAt > 12 && botAgent.role === 'SUPPORT' && bot.hp < 70) {
        bot.abilityAt = now; setBots(prev => prev.map(b => b.id === bot.id ? { ...b, hp: Math.min(100, b.hp + 35) } : b));
      } else if (now - bot.abilityAt > 12 && (botAgent.role === 'SENTINEL' || botAgent.role === 'DUELIST' || botAgent.role === 'CONTROLLER') && distance < 12) {
        bot.abilityAt = now;
        if (botAgent.role === 'SENTINEL' && p.armor > 0) p.armor = Math.max(0, p.armor - 8);
        onBotEvent(`${botAgent.name} // ${botAgent.skill.split(' — ')[0].toUpperCase()}`);
      }
      if (hasLineOfSight && now - p.lastBotHit > difficultySettings.reaction && Math.random() < difficultySettings.aim * dt * 2.7 && controls.current?.isLocked) {
        p.lastBotHit = now;
        const damage = difficulty === 'Hard' ? 13 : difficulty === 'Standard' ? 9 : 5;
        if (p.armor > 0) p.armor = Math.max(0, p.armor - damage); else p.hp = Math.max(0, p.hp - damage);
        onState({ hp: p.hp, armor: p.armor });
        if (p.hp <= 0) { p.alive = false; onBotEvent('YOU ARE DOWN // PRESS ENTER'); onEnd(false); }
      }
    });
    if (bots.every(bot => !bot.alive) && p.alive) {
      p.round++; p.credits += 2500;
      setBots(prev => prev.map(bot => ({ ...bot, hp: 100, alive: true, agentIndex: Math.floor(Math.random() * agents.length), abilityAt: now, pos: [((bot.id % 3) - 1) * 7, 0, -13 - Math.floor(bot.id / 3) * 8] })));
      onBotEvent('ROUND WON  +2500 // ENEMY ROSTER RANDOMIZED');
    }
    onState({ hp: p.hp, armor: p.armor, ammo: p.ammo, reserve: p.reserve, credits: p.credits, kills: p.kills, round: p.round, alive: bots.filter(bot => bot.alive).length, ability: p.ability });
  });

  return <>
    <PointerLockControls ref={controls} camera={camera} pointerSpeed={sensitivity} />
    <color attach="background" args={['#9aaeb0']} /><fog attach="fog" args={['#b4c1b6', 24, 58]} />
    <ambientLight intensity={0.75} /><directionalLight position={[-8, 15, 7]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} /><Sky sunPosition={[40, 35, -20]} turbidity={8} rayleigh={1.4} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -5]} receiveShadow><planeGeometry args={[80, 80]} /><meshStandardMaterial color="#777a6d" roughness={0.93} /></mesh>
    <gridHelper args={[80, 80, '#657368', '#858779']} position={[0, 0, -5]} />
    <mesh position={[0, 2, -30]} castShadow receiveShadow><boxGeometry args={[34, 4, 1]} /><meshStandardMaterial color="#344149" /></mesh>
    <mesh position={[-17, 3, -13]} castShadow><boxGeometry args={[1, 6, 34]} /><meshStandardMaterial color="#39464b" /></mesh><mesh position={[17, 3, -13]} castShadow><boxGeometry args={[1, 6, 34]} /><meshStandardMaterial color="#39464b" /></mesh>
    <mesh position={[0, 3.2, -13]}><boxGeometry args={[12, 0.35, 18]} /><meshStandardMaterial color="#4a5759" /></mesh>
    {obstacles.map((box, i) => { const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3()); return <mesh key={i} position={[center.x, size.y / 2, center.z]} castShadow receiveShadow><boxGeometry args={[size.x, size.y, size.z]} /><meshStandardMaterial color={i % 2 ? '#78624b' : '#68716b'} /></mesh>; })}
    {bots.map((bot, i) => <Bot key={bot.id} bot={bot} refGroup={el => { botRefs.current[i] = el; }} agent={agents[bot.agentIndex]} />)}
    <WeaponView color={agent.color} />
    <primitive object={new THREE.Object3D()} userData={{ hitMarker }} />
  </>;
}

function Bot({ bot, refGroup, agent }: { bot: BotState; refGroup: (el: THREE.Group | null) => void; agent: Agent }) {
  const isUmbra = agent.role === 'CONTROLLER';
  return <group ref={refGroup} userData={{ botId: bot.id }} position={bot.pos} visible={bot.alive}>
    <mesh position={[0, 0.24, 0.04]} castShadow><boxGeometry args={[0.42, 0.34, 0.48]} /><meshStandardMaterial color="#151a1d" /></mesh>
    <mesh position={[-0.2, 0.85, 0]} castShadow><capsuleGeometry args={[0.14, 0.72, 4, 8]} /><meshStandardMaterial color={isUmbra ? '#171b2b' : '#202a2d'} /></mesh>
    <mesh position={[0.2, 0.85, 0]} castShadow><capsuleGeometry args={[0.14, 0.72, 4, 8]} /><meshStandardMaterial color={isUmbra ? '#171b2b' : '#202a2d'} /></mesh>
    <mesh position={[0, 1.35, 0]} castShadow><capsuleGeometry args={[0.34, 0.53, 5, 9]} /><meshStandardMaterial color="#202a2d" /></mesh>
    <mesh position={[0, 1.44, 0.285]} castShadow><boxGeometry args={[0.49, 0.46, 0.12]} /><meshStandardMaterial color={agent.color} metalness={0.22} roughness={0.54} /></mesh>
    <mesh position={[0, 1.41, 0.36]}><boxGeometry args={[0.09, 0.54, 0.035]} /><meshStandardMaterial color={agent.accent} emissive={agent.color} emissiveIntensity={0.7} /></mesh>
    <mesh position={[-0.49, 1.58, 0]} castShadow><sphereGeometry args={[0.23, 10, 8]} /><meshStandardMaterial color={agent.color} /></mesh>
    <mesh position={[0.49, 1.58, 0]} castShadow><sphereGeometry args={[0.23, 10, 8]} /><meshStandardMaterial color={agent.color} /></mesh>
    <mesh position={[0, 2.02, 0]} castShadow><sphereGeometry args={[0.25, 12, 10]} /><meshStandardMaterial color={isUmbra ? '#192033' : '#c79b83'} /></mesh>
    <mesh position={[0, 2.04, 0.214]}><boxGeometry args={[0.37, 0.075, 0.045]} /><meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={1.1} /></mesh>
    <mesh position={[0, 2.25, -0.015]} castShadow>{isUmbra ? <coneGeometry args={[0.38, 0.58, 5]} /> : <sphereGeometry args={[0.285, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.48]} />}<meshStandardMaterial color={isUmbra ? '#171b2b' : agent.color} roughness={0.74} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 2.5, 0]}><planeGeometry args={[1.2, 0.08]} /><meshBasicMaterial color="#101719" /></mesh>
    <mesh position={[0, 2.5, 0.01]}><planeGeometry args={[Math.max(0.01, bot.hp / 100) * 1.1, 0.04]} /><meshBasicMaterial color={agent.color} /></mesh>
    <sprite position={[0, 2.85, 0]} scale={[1.3, 0.32, 1]}><spriteMaterial color={agent.color} /></sprite>
  </group>;
}

function WeaponView({ color }: { color: string }) {
  const { camera } = useThree(); const group = useRef<THREE.Group>(null);
  useEffect(() => { camera.add(group.current!); return () => { camera.remove(group.current!); }; }, [camera]);
  return <group ref={group} position={[0.34, -0.3, -0.65]} rotation={[0.02, -0.08, 0]}>
    <mesh castShadow><boxGeometry args={[0.19, 0.17, 0.6]} /><meshStandardMaterial color="#252d31" metalness={0.7} roughness={0.3} /></mesh>
    <mesh position={[0, 0.04, -0.36]}><cylinderGeometry args={[0.055, 0.055, 0.36, 12]} rotation={[Math.PI / 2, 0, 0]} /><meshStandardMaterial color="#111619" metalness={0.8} /></mesh>
    <mesh position={[0, -0.15, 0.08]} rotation={[0.2, 0, 0]}><boxGeometry args={[0.13, 0.27, 0.17]} /><meshStandardMaterial color="#414b4d" /></mesh>
    <mesh position={[0, 0.11, 0.05]}><boxGeometry args={[0.055, 0.035, 0.16]} /><meshBasicMaterial color={color} /></mesh>
  </group>;
}

export default function App() {
  const [screen, setScreen] = useState<'select' | 'game' | 'result'>('select');
  const [agentIndex, setAgentIndex] = useState(0); const [difficulty, setDifficulty] = useState<Difficulty>('Standard');
  const [settingsOpen, setSettingsOpen] = useState(false); const [buyOpen, setBuyOpen] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.8); const [quality, setQuality] = useState(true); const [resetKey, setResetKey] = useState(0); const [weaponIndex, setWeaponIndex] = useState(0);
  const [stats, setStats] = useState<GameStats>({ hp: 100, armor: 50, ammo: 12, reserve: 48, credits: 800, kills: 0, round: 1, alive: 5, message: '', ability: 100 });
  const [won, setWon] = useState(false); const [toast, setToast] = useState(''); const agent = agents[agentIndex];
  const updateStats = useCallback((update: Partial<GameStats>) => setStats(prev => ({ ...prev, ...update })), []);
  const botMessage = useCallback((message: string) => setStats(prev => ({ ...prev, message })), []);
  const begin = useCallback(() => { setStats({ hp: 100, armor: 50, ammo: weapons[weaponIndex].mag, reserve: 48, credits: 800, kills: 0, round: 1, alive: 5, message: '', ability: 100 }); setScreen('game'); setSettingsOpen(false); setBuyOpen(false); }, [weaponIndex]);
  useEffect(() => {
    if (screen !== 'game') return;
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Escape') setSettingsOpen(v => !v); if (e.code === 'KeyB') setBuyOpen(v => !v); if (e.code === 'Enter' && screen === 'result') begin(); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [screen, begin]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 1600); return () => window.clearTimeout(timer); }, [toast]);
  const buy = (index: number) => { const item = weapons[index]; if (stats.credits < item.cost) return; setWeaponIndex(index); setStats(prev => ({ ...prev, credits: prev.credits - item.cost, ammo: item.mag, reserve: item.mag * 3 })); setToast(`${item.name} EQUIPPED`); };

  return <main className="app-shell">
    {screen === 'select' && <section className="selection-screen"><header className="topbar"><div className="brand"><span className="brand-mark">Z</span><span>ZZAP<span className="brand-slash"> //</span></span></div><div className="top-meta"><span>TACTICAL TRAINING NETWORK</span><i /><span>BUILD 0.2.0</span></div></header>
      <div className="selection-content"><div className="eyebrow"><span className="pulse-dot" /> OPERATOR SELECT <span className="line" /></div><h1>CHOOSE YOUR<br /><em>EDGE.</em></h1><p className="intro">작전을 시작하기 전, 전장을 바꿀 오퍼레이터를 선택하세요.</p>
        <div className="agent-layout"><div className="agent-list">{agents.map((a, i) => <button key={a.name} className={`agent-row ${agentIndex === i ? 'active' : ''}`} onClick={() => setAgentIndex(i)} style={{ '--agent': a.color } as React.CSSProperties}><span className="agent-index">0{i + 1}</span><span className="agent-sigil">{a.sigil}</span><span className="agent-info"><b>{a.name}</b><small>{a.role}</small></span><span className="row-arrow">↗</span></button>)}</div>
          <article className="agent-card" style={{ '--agent': agent.color, '--agent-soft': `${agent.color}30` } as React.CSSProperties}><div className="card-grid" /><div className="card-top"><span>FIELD OPERATIVE</span><span>NO. 0{agentIndex + 1}</span></div><div className="operator-art"><div className="art-ring" /><div className="art-shadow" /><div className="operator-body"><div className="operator-head"><div className="visor" /></div><div className="operator-torso"><div className="torso-stripe" /><div className="torso-plate" /></div><div className="operator-arm left" /><div className="operator-arm right" /><div className="operator-leg left" /><div className="operator-leg right" /></div><span className="art-sigil">{agent.sigil}</span></div><div className="card-caption"><div><span className="role-tag">{agent.role}</span><h2>{agent.name}</h2></div><span className="status-chip">● ACTIVE</span></div></article>
          <aside className="ability-panel"><div className="ability-heading"><span>FIELD PROFILE</span><span>01 — 04</span></div><div className="ability-item"><span className="ability-key">E</span><div><b>SIGNATURE</b><p>{agent.skill}</p></div></div><div className="ability-item"><span className="ability-key ultimate">X</span><div><b>ULTIMATE</b><p>{agent.ult}</p></div></div><div className="difficulty-block"><b>SIMULATION DIFFICULTY</b><div className="difficulty-options">{(['Easy', 'Standard', 'Hard'] as const).map(d => <button key={d} className={difficulty === d ? 'chosen' : ''} onClick={() => setDifficulty(d)}>{d}</button>)}</div></div></aside></div>
        <div className="selection-footer"><div className="mode-tag"><span className="mode-icon">◉</span><div><b>SOLO SIMULATION</b><small>5 RANDOMIZED HOSTILES · TRAINING SITE</small></div></div><button className="deploy-button" onClick={begin}>DEPLOY <span>↗</span></button></div>
      </div><footer className="bottom-note"><span>ZZAP PROTOCOL // UNAUTHORIZED ACCESS PROHIBITED</span><span>© 2025 ZZAP SYSTEMS</span></footer>
    </section>}
    {screen !== 'select' && <div className="game-view">
      <Canvas shadows dpr={quality ? [1, 1.5] : [1, 1]} camera={{ fov: 75, near: 0.1, far: 100 }}><Arena agent={agent} difficulty={difficulty} onState={updateStats} onEnd={w => { setWon(w); setScreen('result'); }} resetKey={resetKey} sensitivity={sensitivity} weaponIndex={weaponIndex} onBotEvent={botMessage} /></Canvas>
      <div className="hud"><div className="hud-top"><div className="hud-brand"><b>Z</b> ZZAP <span>// TRAINING</span></div><div className="round-info"><span>ROUND {String(stats.round).padStart(2, '0')}</span><i /><span>HOSTILES <b>{stats.alive}</b></span></div><button className="menu-btn" onClick={() => setSettingsOpen(true)}>Ⅱ</button></div>
        <div className="site-label"><span>◈</span> SITE A <small>— CONTAINMENT YARD</small></div><div className="crosshair"><i /><i /><i /><i />{hitMarker && <b>×</b>}</div><div className="hud-message">{stats.message}</div><div className="minimap"><span className="mini-label">A</span><div className="mini-grid"/><i className="player-dot"/><i className="enemy-dot one"/><i className="enemy-dot two"/><i className="enemy-dot three"/></div>
        <div className="bottom-hud"><div className="player-vitals"><div className="vital-icon">✚</div><div><small>VITALS</small><strong>{Math.ceil(stats.hp)}</strong></div><div className="vital-divider"/><div><small>ARMOR</small><strong className="armor-number">{Math.ceil(stats.armor)}</strong></div><div className="vital-bars"><i style={{ width: `${stats.hp}%` }} /><i style={{ width: `${stats.armor}%` }} /></div></div><div className="ability-hud"><div><span>E</span><small>SKILL</small><i style={{ width: `${stats.ability}%` }} /></div><div><span>Q</span><small>TACTICAL</small><i style={{ width: `${stats.ability}%` }} /></div><div><span>X</span><small>ULTIMATE</small><i style={{ width: `${stats.ability}%` }} /></div></div><div className="weapon-hud"><div className="weapon-label">{weapons[weaponIndex].name} <small>SEMI-AUTO</small></div><div className="ammo"><strong>{stats.ammo.toString().padStart(2, '0')}</strong><span> / {stats.reserve.toString().padStart(2, '0')}</span></div><div className="credit-label">◈ {stats.credits.toLocaleString()} CR <button onClick={() => setBuyOpen(true)}>BUY [B]</button></div></div></div>
        {!settingsOpen && !buyOpen && <div className="lock-hint">CLICK TO LOCK MOUSE <span>·</span> WASD MOVE <span>·</span> LMB FIRE <span>·</span> E ABILITY</div>}
      </div>
      {settingsOpen && <div className="modal-backdrop"><section className="game-modal"><div className="modal-top"><span>PAUSED // SYSTEM MENU</span><button onClick={() => setSettingsOpen(false)}>×</button></div><h2>SETTINGS</h2><label className="setting-row">Mouse sensitivity <input type="range" min="0.2" max="2" step="0.1" value={sensitivity} onChange={e => setSensitivity(+e.target.value)} /><span>{sensitivity.toFixed(1)}</span></label><label className="setting-row">High quality graphics <input type="checkbox" checked={quality} onChange={e => setQuality(e.target.checked)} /></label><div className="setting-row">Simulation <span>{difficulty.toUpperCase()}</span></div><p className="control-copy">WASD move · Mouse aim · LMB fire · R reload · Shift walk · E ability · X ultimate · B buy</p><button className="modal-primary" onClick={() => setSettingsOpen(false)}>RESUME SIMULATION</button><button className="modal-secondary" onClick={() => { setScreen('select'); setSettingsOpen(false); }}>EXIT TO OPERATOR SELECT</button></section></div>}
      {buyOpen && <div className="modal-backdrop"><section className="game-modal buy-modal"><div className="modal-top"><span>FIELD ARMORY // BUY PHASE</span><button onClick={() => setBuyOpen(false)}>×</button></div><h2>CHOOSE YOUR<br />LOADOUT.</h2><p className="money-line">AVAILABLE CREDITS <b>◈ {stats.credits.toLocaleString()}</b></p><div className="store-list">{weapons.map((w, i) => <button key={w.name} onClick={() => buy(i)} disabled={stats.credits < w.cost}><span className="store-type">{w.category}</span><b>{w.name}</b><span>{w.damage} DMG · {w.mag} RND</span><strong>{w.cost ? `◈ ${w.cost.toLocaleString()}` : 'OWNED'}</strong></button>)}</div><button className="modal-secondary" onClick={() => setBuyOpen(false)}>CLOSE ARMORY [B]</button></section></div>}
      {toast && <div className="toast">{toast}</div>}
      {screen === 'result' && <div className="modal-backdrop result-layer"><section className="game-modal result-modal"><div className="eyebrow"><span className="pulse-dot" /> SIMULATION COMPLETE</div><h2>{won ? 'ROUND WON.' : 'OPERATOR DOWN.'}</h2><p>{won ? 'SITE SECURED. ALL HOSTILES NEUTRALIZED.' : 'SIGNAL LOST. REVIEW YOUR APPROACH.'}</p><div className="result-stats"><div><b>{stats.kills}</b><small>ELIMINATIONS</small></div><div><b>{stats.hp}</b><small>HEALTH LEFT</small></div><div><b>◈ {stats.credits}</b><small>CREDITS</small></div></div><button className="modal-primary" onClick={() => { setResetKey(v => v + 1); setScreen('game'); }}>RUN IT BACK ↗</button><button className="modal-secondary" onClick={() => setScreen('select')}>CHANGE OPERATOR</button></section></div>}
    </div>}
  </main>;
}
