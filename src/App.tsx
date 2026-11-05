import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';
import * as THREE from 'three';

type Agent = { name: string; role: string; color: string; accent: string; skill: string; ult: string; sigil: string };
type BotState = { id: number; pos: [number, number, number]; hp: number; alive: boolean };
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
  { name: 'ARC- rifle', category: 'RIFLE', cost: 2900, damage: 38, mag: 25, rate: 0.17 },
  { name: 'LONGSHOT', category: 'MARKSMAN', cost: 4200, damage: 85, mag: 5, rate: 0.8 },
];
const difficultyStats = { Easy: { reaction: 2.4, aim: 0.2, speed: 1.15 }, Standard: { reaction: 1.35, aim: 0.52, speed: 1.55 }, Hard: { reaction: 0.72, aim: 0.78, speed: 1.9 } } as const;

type GameProps = { agent: Agent; difficulty: keyof typeof difficultyStats; onState: (s: { hp: number; armor: number; ammo: number; reserve: number; credits: number; kills: number; round: number; alive: number; message: string; ability: number }) => void; onEnd: (won: boolean) => void; resetKey: number; sensitivity: number };

function Arena({ agent, difficulty, onState, onEnd, resetKey, sensitivity }: GameProps) {
  const { camera } = useThree();
  const controls = useRef<any>(null);
  const [bots, setBots] = useState<BotState[]>(() => Array.from({ length: 5 }, (_, i) => ({ id: i, pos: [((i % 3) - 1) * 7, 0, -13 - Math.floor(i / 3) * 8], hp: 100, alive: true })));
  const botRefs = useRef<(THREE.Group | null)[]>([]);
  const keys = useRef<Record<string, boolean>>({});
  const state = useRef({ hp: 100, armor: 50, ammo: 12, reserve: 48, credits: 800, kills: 0, round: 1, ability: 100, lastShot: 0, lastBotHit: 0, message: 'LOCK IN // CLEAR THE SITE', reload: false, alive: true, speed: 5.2 });
  const [weaponIndex, setWeaponIndex] = useState(0);
  const weapon = weapons[weaponIndex];
  const [hitMarker, setHitMarker] = useState(0);
  const [message, setMessage] = useState('LOCK IN // CLEAR THE SITE');
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const move = useRef(new THREE.Vector3());
  const obstacleBoxes = useMemo(() => [
    new THREE.Box3(new THREE.Vector3(-3.2, 0, -10.5), new THREE.Vector3(-1.3, 3.5, -7.5)),
    new THREE.Box3(new THREE.Vector3(2.4, 0, -17), new THREE.Vector3(5.2, 2.4, -14.2)),
    new THREE.Box3(new THREE.Vector3(-10, 0, -20), new THREE.Vector3(-7.3, 3, -17)),
    new THREE.Box3(new THREE.Vector3(7, 0, -8), new THREE.Vector3(10, 3, -5)),
  ], []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.code] = true; if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    const onClick = () => {
      if (!controls.current?.isLocked || !state.current.alive) return;
      const s = state.current; const now = performance.now() / 1000;
      if (s.reload || now - s.lastShot < weapon.rate || s.ammo <= 0) { if (s.ammo <= 0 && !s.reload) setMessage('PRESS R TO RELOAD'); return; }
      s.lastShot = now; s.ammo--;
      camera.updateMatrixWorld(); raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const objects = botRefs.current.filter((b): b is THREE.Group => !!b && b.visible);
      const hits = raycaster.intersectObjects(objects, true);
      if (hits.length) {
        let parent: THREE.Object3D | null = hits[0].object;
        while (parent && !parent.userData.botId && parent.userData.botId !== 0) parent = parent.parent;
        const id = parent?.userData.botId as number | undefined;
        if (id !== undefined) {
          setBots(prev => prev.map(b => {
            if (b.id !== id || !b.alive) return b;
            const hp = b.hp - weapon.damage; if (hp <= 0) { s.kills++; s.credits += 200; setMessage('TARGET DOWN  +200'); return { ...b, hp: 0, alive: false }; }
            setMessage('HIT CONFIRMED'); return { ...b, hp };
          }));
          setHitMarker(v => v + 1); window.setTimeout(() => setHitMarker(v => v + 1), 110);
        }
      }
      onState({ ...s, ammo: s.ammo, reserve: s.reserve, kills: s.kills, credits: s.credits, ability: s.ability, message: s.message });
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('mousedown', onClick); };
  }, [camera, onState, raycaster, weapon]);

  useEffect(() => { camera.position.set(0, 1.65, 8); state.current = { ...state.current, hp: 100, armor: 50, ammo: weapons[weaponIndex].mag, reserve: 48, kills: 0, credits: 800, alive: true }; }, [resetKey, camera]);

  useFrame((_, delta) => {
    const s = state.current; const dt = Math.min(delta, 0.05); const k = keys.current;
    if (controls.current?.isLocked && s.alive) {
      const speed = k.ShiftLeft ? 3.2 : (k.ControlLeft ? 2.3 : s.speed);
      move.current.set(Number(k.KeyD) - Number(k.KeyA), 0, Number(k.KeyS) - Number(k.KeyW));
      if (move.current.lengthSq() > 0) {
        move.current.normalize().multiplyScalar(speed * dt);
        const old = camera.position.clone(); controls.current.moveRight(move.current.x); controls.current.moveForward(-move.current.z);
        camera.position.y = k.Space ? 2.1 : 1.65;
        const pos = new THREE.Vector3(camera.position.x, 0, camera.position.z);
        if (obstacleBoxes.some(box => box.containsPoint(pos))) { camera.position.x = old.x; camera.position.z = old.z; }
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -14, 14); camera.position.z = THREE.MathUtils.clamp(camera.position.z, -26, 12);
      }
      if (k.KeyR && !s.reload && s.ammo < weapon.mag && s.reserve > 0) { s.reload = true; setMessage('RELOADING'); window.setTimeout(() => { const take = Math.min(weapon.mag - s.ammo, s.reserve); s.ammo += take; s.reserve -= take; s.reload = false; setMessage(''); onState({ ...s }); }, 1250); }
      if (k.KeyE && s.ability >= 100) {
        s.ability = 0;
        if (agent.role === 'SUPPORT') s.hp = Math.min(100, s.hp + 45);
        else if (agent.role === 'MOBILITY') { controls.current.moveForward(-4); setMessage('SLIPSTREAM'); }
        else if (agent.role === 'DUELIST') { s.hp = Math.min(100, s.hp + 30); setMessage('SIPHON'); }
        else if (agent.role === 'SENTINEL') { setMessage('DRONE DEPLOYED'); setBots(prev => prev.map(b => b.alive ? { ...b, hp: Math.max(0, b.hp - 18), alive: b.hp - 18 > 0 } : b)); }
        else { setMessage('VEIL ACTIVE'); }
        onState({ ...s });
      }
      if (k.KeyX && s.ability >= 100) { s.ability = 0; s.hp = 100; s.armor = 50; s.ammo = weapon.mag; setMessage('ULTIMATE // SECOND WIND'); onState({ ...s }); }
    }
    s.ability = Math.min(100, s.ability + dt * 7);
    const now = performance.now() / 1000; const settings = difficultyStats[difficulty];
    bots.forEach((bot, i) => {
      const group = botRefs.current[i]; if (!group || !bot.alive) return;
      const target = new THREE.Vector3(camera.position.x, 0, camera.position.z); const current = group.position;
      const distance = current.distanceTo(target);
      if (distance > 5.5) { const direction = target.sub(current).normalize(); current.addScaledVector(direction, settings.speed * dt); group.rotation.y = Math.atan2(direction.x, direction.z); }
      if (distance < 19 && now - s.lastBotHit > settings.reaction && Math.random() < settings.aim * dt * 2.7 && controls.current?.isLocked) {
        s.lastBotHit = now; const damage = difficulty === 'Hard' ? 13 : difficulty === 'Standard' ? 9 : 5;
        if (s.armor > 0) s.armor = Math.max(0, s.armor - damage); else s.hp = Math.max(0, s.hp - damage);
        if (s.hp <= 0) { s.alive = false; setMessage('YOU ARE DOWN // PRESS ENTER'); onEnd(false); }
      }
    });
    if (bots.every(b => !b.alive) && s.alive) { s.round++; s.credits += 2500; setBots(prev => prev.map(b => ({ ...b, hp: 100, alive: true, pos: [((b.id % 3) - 1) * 7, 0, -13 - Math.floor(b.id / 3) * 8] }))); setMessage('ROUND WON  +2500'); onEnd(true); }
    onState({ hp: s.hp, armor: s.armor, ammo: s.ammo, reserve: s.reserve, credits: s.credits, kills: s.kills, round: s.round, alive: bots.filter(b => b.alive).length, message, ability: s.ability });
  });

  return <>
    <PointerLockControls ref={controls} camera={camera} pointerSpeed={sensitivity} />
    <color attach="background" args={['#9aaeb0']} />
    <fog attach="fog" args={['#b4c1b6', 24, 58]} />
    <ambientLight intensity={0.75} /><directionalLight position={[-8, 15, 7]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} />
    <Sky sunPosition={[40, 35, -20]} turbidity={8} rayleigh={1.4} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -5]} receiveShadow><planeGeometry args={[80, 80]} /><meshStandardMaterial color="#777a6d" roughness={0.93} /></mesh>
    <gridHelper args={[80, 80, '#657368', '#858779']} position={[0, 0, -5]} />
    {/* Original training-ground architecture */}
    <mesh position={[0, 2, -30]} castShadow receiveShadow><boxGeometry args={[34, 4, 1]} /><meshStandardMaterial color="#344149" /></mesh>
    <mesh position={[-17, 3, -13]} castShadow><boxGeometry args={[1, 6, 34]} /><meshStandardMaterial color="#39464b" /></mesh>
    <mesh position={[17, 3, -13]} castShadow><boxGeometry args={[1, 6, 34]} /><meshStandardMaterial color="#39464b" /></mesh>
    <mesh position={[0, 3.2, -13]}><boxGeometry args={[12, 0.35, 18]} /><meshStandardMaterial color="#4a5759" /></mesh>
    <mesh position={[0, 0.05, -22]}><boxGeometry args={[6, 0.1, 1]} /><meshStandardMaterial color="#d2ab5d" emissive="#8f6629" emissiveIntensity={0.2} /></mesh>
    {obstacleBoxes.map((box, i) => { const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3()); return <mesh key={i} position={[center.x, size.y / 2, center.z]} castShadow receiveShadow><boxGeometry args={[size.x, size.y, size.z]} /><meshStandardMaterial color={i % 2 ? '#78624b' : '#68716b'} roughness={0.8} /></mesh>; })}
    {[[-11, 0, -5], [12, 0, -22], [8, 0, 2], [-5, 0, -27]].map(([x, y, z], i) => <group key={i} position={[x, y, z]}><mesh position={[0, 0.65, 0]} castShadow><boxGeometry args={[2, 1.3, 1.5]} /><meshStandardMaterial color="#876c4d" /></mesh><mesh position={[0, 1.32, 0]}><boxGeometry args={[2.06, 0.08, 1.56]} /><meshStandardMaterial color="#b08a5b" /></mesh></group>)}
    {bots.map((bot, i) => <Bot key={bot.id} bot={bot} refGroup={el => { botRefs.current[i] = el; }} color={agents[(bot.id + 2) % agents.length].color} />)}
    <WeaponView color={agent.color} />
  </>;
}

function Bot({ bot, refGroup, color }: { bot: BotState; refGroup: (el: THREE.Group | null) => void; color: string }) {
  return <group ref={refGroup} userData={{ botId: bot.id }} position={bot.pos} visible={bot.alive}>
    <mesh position={[0, 1.05, 0]} castShadow><capsuleGeometry args={[0.42, 0.85, 5, 9]} /><meshStandardMaterial color={color} roughness={0.45} /></mesh>
    <mesh position={[0, 1.86, 0]} castShadow><sphereGeometry args={[0.28, 12, 12]} /><meshStandardMaterial color="#d5b9a2" /></mesh>
    <mesh position={[0, 2.25, 0]}><boxGeometry args={[0.6, 0.08, 0.08]} /><meshBasicMaterial color="#ff526a" /></mesh>
    <mesh position={[0, 2.5, 0]}><planeGeometry args={[1.2, 0.08]} /><meshBasicMaterial color="#101719" /></mesh>
    <mesh position={[0, 2.5, 0.01]}><planeGeometry args={[Math.max(0.01, bot.hp / 100) * 1.1, 0.04]} /><meshBasicMaterial color="#ed5966" /></mesh>
  </group>;
}

function WeaponView({ color }: { color: string }) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
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
  const [agentIndex, setAgentIndex] = useState(0); const [difficulty, setDifficulty] = useState<keyof typeof difficultyStats>('Standard');
  const [settingsOpen, setSettingsOpen] = useState(false); const [buyOpen, setBuyOpen] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.8); const [quality, setQuality] = useState(true); const [resetKey, setResetKey] = useState(0);
  const [stats, setStats] = useState({ hp: 100, armor: 50, ammo: 12, reserve: 48, credits: 800, kills: 0, round: 1, alive: 5, message: '', ability: 100 });
  const [won, setWon] = useState(false); const agent = agents[agentIndex];
  const updateStats = useCallback((s: typeof stats) => setStats(prev => ({ ...prev, ...s })), []);
  const begin = () => { setStats({ hp: 100, armor: 50, ammo: 12, reserve: 48, credits: 800, kills: 0, round: 1, alive: 5, message: '', ability: 100 }); setScreen('game'); setSettingsOpen(false); setBuyOpen(false); };
  useEffect(() => {
    if (screen !== 'game') return;
    const esc = (e: KeyboardEvent) => { if (e.code === 'Escape') setSettingsOpen(v => !v); if (e.code === 'KeyB') setBuyOpen(v => !v); if (e.code === 'Enter' && screen === 'result') begin(); };
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
  }, [screen]);
  const buy = (index: number) => {
    const item = weapons[index]; if (stats.credits < item.cost) return;
    setStats(s => ({ ...s, credits: s.credits - item.cost, ammo: item.mag, reserve: item.mag * 3 }));
    setMessageToast(`${item.name} EQUIPPED`);
  };
  const [toast, setMessageToast] = useState('');
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setMessageToast(''), 1600); return () => window.clearTimeout(t); }, [toast]);

  return <main className="app-shell">
    {screen === 'select' && <section className="selection-screen">
      <header className="topbar"><div className="brand"><span className="brand-mark">Z</span><span>ZZAP<span className="brand-slash"> //</span></span></div><div className="top-meta"><span>TACTICAL TRAINING NETWORK</span><i /> <span>BUILD 0.1.0</span></div></header>
      <div className="selection-content"><div className="eyebrow"><span className="pulse-dot" /> OPERATOR SELECT <span className="line" /></div><h1>CHOOSE YOUR<br /><em>EDGE.</em></h1><p className="intro">작전을 시작하기 전, 전장을 바꿀 오퍼레이터를 선택하세요.</p>
        <div className="agent-layout"><div className="agent-list">{agents.map((a, i) => <button key={a.name} className={`agent-row ${agentIndex === i ? 'active' : ''}`} onClick={() => setAgentIndex(i)} style={{ '--agent': a.color } as React.CSSProperties}><span className="agent-index">0{i + 1}</span><span className="agent-sigil">{a.sigil}</span><span className="agent-info"><b>{a.name}</b><small>{a.role}</small></span><span className="row-arrow">↗</span></button>)}</div>
          <article className="agent-card" style={{ '--agent': agent.color, '--agent-soft': `${agent.color}30` } as React.CSSProperties}><div className="card-grid" /><div className="card-top"><span>FIELD OPERATIVE</span><span>NO. 0{agentIndex + 1}</span></div><div className="operator-art"><div className="art-ring" /><div className="art-shadow" /><div className="operator-body"><div className="operator-head"><div className="visor" /></div><div className="operator-torso"><div className="torso-stripe" /><div className="torso-plate" /></div><div className="operator-arm left" /><div className="operator-arm right" /><div className="operator-leg left" /><div className="operator-leg right" /></div><span className="art-sigil">{agent.sigil}</span></div><div className="card-caption"><div><span className="role-tag">{agent.role}</span><h2>{agent.name}</h2></div><span className="status-chip">● ACTIVE</span></div></article>
          <aside className="ability-panel"><div className="ability-heading"><span>FIELD PROFILE</span><span>01 — 04</span></div><div className="ability-item"><span className="ability-key">E</span><div><b>SIGNATURE</b><p>{agent.skill}</p></div></div><div className="ability-item"><span className="ability-key ultimate">X</span><div><b>ULTIMATE</b><p>{agent.ult}</p></div></div><div className="difficulty-block"><b>SIMULATION DIFFICULTY</b><div className="difficulty-options">{(['Easy', 'Standard', 'Hard'] as const).map(d => <button key={d} className={difficulty === d ? 'chosen' : ''} onClick={() => setDifficulty(d)}>{d}</button>)}</div></div></aside></div>
        <div className="selection-footer"><div className="mode-tag"><span className="mode-icon">◉</span><div><b>SOLO SIMULATION</b><small>5 HOSTILE OPERATIVES · TRAINING SITE</small></div></div><button className="deploy-button" onClick={begin}>DEPLOY <span>↗</span></button></div>
      </div><footer className="bottom-note"><span>ZZAP PROTOCOL // UNAUTHORIZED ACCESS PROHIBITED</span><span>© 2025 ZZAP SYSTEMS</span></footer>
    </section>}
    {screen !== 'select' && <div className="game-view">
      <Canvas shadows dpr={quality ? [1, 1.5] : [1, 1]} camera={{ fov: 75, near: 0.1, far: 100 }}><Arena agent={agent} difficulty={difficulty} onState={updateStats} onEnd={w => { setWon(w); setScreen('result'); }} resetKey={resetKey} sensitivity={sensitivity} /></Canvas>
      <div className="hud"><div className="hud-top"><div className="hud-brand"><b>Z</b> ZZAP <span>// TRAINING</span></div><div className="round-info"><span>ROUND {String(stats.round).padStart(2, '0')}</span><i /> <span>HOSTILES <b>{stats.alive}</b></span></div><button className="menu-btn" onClick={() => setSettingsOpen(true)}>Ⅱ</button></div>
        <div className="site-label"><span>◈</span> SITE A <small>— CONTAINMENT YARD</small></div><div className="crosshair"><i /><i /><i /><i />{hitMarker % 2 === 1 && <b>×</b>}</div>
        <div className="hud-message">{stats.message}</div><div className="minimap"><span className="mini-label">A</span><div className="mini-grid"/><i className="player-dot"/><i className="enemy-dot one"/><i className="enemy-dot two"/><i className="enemy-dot three"/></div>
        <div className="bottom-hud"><div className="player-vitals"><div className="vital-icon">✚</div><div><small>VITALS</small><strong>{Math.ceil(stats.hp)}</strong></div><div className="vital-divider"/><div><small>ARMOR</small><strong className="armor-number">{Math.ceil(stats.armor)}</strong></div><div className="vital-bars"><i style={{ width: `${stats.hp}%` }} /><i style={{ width: `${stats.armor}%` }} /></div></div><div className="ability-hud"><div><span>E</span><small>SKILL</small><i style={{ width: `${stats.ability}%` }} /></div><div><span>Q</span><small>TACTICAL</small><i style={{ width: `${stats.ability}%` }} /></div><div><span>X</span><small>ULTIMATE</small><i style={{ width: `${stats.ability}%` }} /></div></div><div className="weapon-hud"><div className="weapon-label">SIDEKICK <small>SEMI-AUTO</small></div><div className="ammo"><strong>{stats.ammo.toString().padStart(2, '0')}</strong><span> / {stats.reserve.toString().padStart(2, '0')}</span></div><div className="credit-label">◈ {stats.credits.toLocaleString()} CR <button onClick={() => setBuyOpen(true)}>BUY [B]</button></div></div></div>
        {!settingsOpen && !buyOpen && <div className="lock-hint">CLICK TO LOCK MOUSE <span>·</span> WASD MOVE <span>·</span> LMB FIRE <span>·</span> E ABILITY</div>}
      </div>
      {settingsOpen && <div className="modal-backdrop"><section className="game-modal"><div className="modal-top"><span>PAUSED // SYSTEM MENU</span><button onClick={() => setSettingsOpen(false)}>×</button></div><h2>SETTINGS</h2><label className="setting-row">Mouse sensitivity <input type="range" min="0.2" max="2" step="0.1" value={sensitivity} onChange={e => setSensitivity(+e.target.value)} /><span>{sensitivity.toFixed(1)}</span></label><label className="setting-row">High quality graphics <input type="checkbox" checked={quality} onChange={e => setQuality(e.target.checked)} /></label><div className="setting-row">Simulation <span>{difficulty.toUpperCase()}</span></div><p className="control-copy">WASD move · Mouse aim · LMB fire · R reload · Shift walk · E ability · X ultimate · B buy</p><button className="modal-primary" onClick={() => setSettingsOpen(false)}>RESUME SIMULATION</button><button className="modal-secondary" onClick={() => { setScreen('select'); setSettingsOpen(false); }}>EXIT TO OPERATOR SELECT</button></section></div>}
      {buyOpen && <div className="modal-backdrop"><section className="game-modal buy-modal"><div className="modal-top"><span>FIELD ARMORY // BUY PHASE</span><button onClick={() => setBuyOpen(false)}>×</button></div><h2>CHOOSE YOUR<br />LOADOUT.</h2><p className="money-line">AVAILABLE CREDITS <b>◈ {stats.credits.toLocaleString()}</b></p><div className="store-list">{weapons.map((w, i) => <button key={w.name} onClick={() => buy(i)} disabled={stats.credits < w.cost}><span className="store-type">{w.category}</span><b>{w.name}</b><span>{w.damage} DMG · {w.mag} RND</span><strong>{w.cost ? `◈ ${w.cost.toLocaleString()}` : 'OWNED'}</strong></button>)}</div><button className="modal-secondary" onClick={() => setBuyOpen(false)}>CLOSE ARMORY [B]</button></section></div>}
      {toast && <div className="toast">{toast}</div>}
      {screen === 'result' && <div className="modal-backdrop result-layer"><section className="game-modal result-modal"><div className="eyebrow"><span className="pulse-dot" /> SIMULATION COMPLETE</div><h2>{won ? 'ROUND WON.' : 'OPERATOR DOWN.'}</h2><p>{won ? 'SITE SECURED. ALL HOSTILES NEUTRALIZED.' : 'SIGNAL LOST. REVIEW YOUR APPROACH.'}</p><div className="result-stats"><div><b>{stats.kills}</b><small>ELIMINATIONS</small></div><div><b>{stats.hp}</b><small>HEALTH LEFT</small></div><div><b>◈ {stats.credits}</b><small>CREDITS</small></div></div><button className="modal-primary" onClick={() => { setResetKey(v => v + 1); setScreen('game'); }}>RUN IT BACK ↗</button><button className="modal-secondary" onClick={() => setScreen('select')}>CHANGE OPERATOR</button></section></div>}
    </div>}
  </main>;
}
