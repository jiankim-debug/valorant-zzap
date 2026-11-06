import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import OperatorModel, { type OperatorLook } from './OperatorModel';

type Mode = 'skirmish' | 'team' | 'practice';
type Difficulty = 'Easy' | 'Standard' | 'Hard';
type Team = 'blue' | 'red' | 'target';
type Agent = OperatorLook & { skill: string; ultimate: string };
type Unit = { id: number; team: Team; agent: number; hp: number; alive: boolean; spawn: [number, number, number]; nextShot: number; nextAbility: number };
type Stats = { hp: number; ammo: number; kills: number; blue: number; red: number; message: string; ultimate: number };
type PlayerState = { hp: number; alive: boolean; ammo: number; reserve: number; lastShot: number; lastAbility: number; ult: number; kills: number; reload: boolean; ended: boolean; move: THREE.Vector3 };

const agents: Agent[] = [
  { name: 'KITE', role: 'MOBILITY', color: '#55d6c2', sigil: '↗', skill: 'Slipstream: short forward burst', ultimate: 'Jetstream: instant dash and reload' },
  { name: 'MORROW', role: 'SUPPORT', color: '#bd8dff', sigil: '✳', skill: 'Afterglow: restore health', ultimate: 'Second Dawn: restore health and armor' },
  { name: 'TINKER', role: 'SENTINEL', color: '#f0b857', sigil: '⌘', skill: 'Tripwire: damage nearby hostiles', ultimate: 'Lockdown: damage all hostiles' },
  { name: 'VEX', role: 'DUELIST', color: '#fa687e', sigil: '◈', skill: 'Siphon: drain a nearby target', ultimate: 'Redline: damage nearby hostiles' },
  { name: 'UMBRA', role: 'CONTROLLER', color: '#7599ff', sigil: '◐', skill: 'Veilstep: short shadow reposition', ultimate: 'Night Shift: evade and recover' },
];
const modes: { id: Mode; title: string; subtitle: string; detail: string; count: string; icon: string }[] = [
  { id: 'skirmish', title: '1 VS 3 BOT SKIRMISH', subtitle: 'SOLO COMBAT', detail: '혼자서 무작위 요원 봇 3명과 교전합니다. 봇을 모두 제압하면 승리합니다.', count: '1 PLAYER · 3 ENEMY BOTS', icon: '◈' },
  { id: 'team', title: '5 VS 5 TEAM BATTLE', subtitle: 'SQUAD SIMULATION', detail: '플레이어와 아군 봇 4명이 적 팀 봇 5명과 전투합니다.', count: '1 PLAYER + 4 ALLIES · 5 ENEMIES', icon: '⬡' },
  { id: 'practice', title: 'AIM TRAINING', subtitle: 'UNLIMITED PRACTICE', detail: '움직이는 표적을 상대로 조준을 연습합니다. 탄약과 궁극기가 무제한입니다.', count: 'INFINITE AMMO · INFINITE ULTIMATE', icon: '◎' },
];
const guns = [
  { name: 'SIDEKICK', mag: 12, damage: 35, rate: 0.26 },
  { name: 'VECTOR-9', mag: 28, damage: 22, rate: 0.11 },
  { name: 'ARC RIFLE', mag: 25, damage: 38, rate: 0.17 },
  { name: 'LONGSHOT', mag: 5, damage: 85, rate: 0.75 },
];
const targetPositions: [number, number, number][] = [[-9, 0, -16], [-5, 0, -20], [-1, 0, -17], [3, 0, -21], [7, 0, -16], [10, 0, -23]];
const randomAgent = () => Math.floor(Math.random() * agents.length);
const makeUnit = (id: number, team: Team, agent: number, spawn: [number, number, number]): Unit => ({ id, team, agent, hp: 100, alive: true, spawn, nextShot: 0, nextAbility: 0 });
function makeUnits(mode: Mode): Unit[] {
  if (mode === 'practice') return targetPositions.map((position, index) => makeUnit(index, 'target', index % agents.length, position));
  if (mode === 'skirmish') return Array.from({ length: 3 }, (_, id) => makeUnit(id, 'red', randomAgent(), [(id - 1) * 5, 0, -16 - (id % 2) * 4]));
  const allies = Array.from({ length: 4 }, (_, id) => makeUnit(id, 'blue', randomAgent(), [-8 + id * 2.7, 0, 7]));
  const enemies = Array.from({ length: 5 }, (_, id) => makeUnit(id + 4, 'red', randomAgent(), [targetPositions[id][0], 0, targetPositions[id][2] - 2]));
  return [...allies, ...enemies];
}

function UnitAvatar({ unit, refUnit }: { unit: Unit; refUnit: (node: THREE.Group | null) => void }) {
  const agent = agents[unit.agent];
  const teamColor = unit.team === 'blue' ? '#58e1c4' : unit.team === 'target' ? '#ffd16e' : agent.color;
  return <group ref={refUnit} position={unit.spawn} userData={{ unitId: unit.id, team: unit.team }} visible={unit.alive}>
    <OperatorModel operator={agent} index={unit.agent} idle={false} scale={0.72} />
    <mesh position={[0, 2.55, 0]}><planeGeometry args={[0.95, 0.07]} /><meshBasicMaterial color="#15191b" /></mesh>
    <mesh position={[-0.06, 2.56, 0.01]}><planeGeometry args={[0.82 * Math.max(0, unit.hp / 100), 0.035]} /><meshBasicMaterial color={teamColor} /></mesh>
    <mesh position={[0, 2.72, 0]}><planeGeometry args={[0.75, 0.035]} /><meshBasicMaterial color={unit.team === 'blue' ? '#58e1c4' : unit.team === 'target' ? '#ffd16e' : '#f06b77'} /></mesh>
  </group>;
}

function Arena({ mode, agent, difficulty, weaponIndex, resetKey, onStats, onEnd, onMessage, onHit }: { mode: Mode; agent: Agent; difficulty: Difficulty; weaponIndex: number; resetKey: number; onStats: (s: Partial<Stats>) => void; onEnd: (won: boolean) => void; onMessage: (message: string) => void; onHit: () => void }) {
  const { camera } = useThree();
  const controls = useRef<any>(null);
  const unitRefs = useRef<(THREE.Group | null)[]>([]);
  const obstacles = useMemo(() => [
    new THREE.Box3(new THREE.Vector3(-3.2, 0, -10.5), new THREE.Vector3(-1.3, 3.5, -7.5)),
    new THREE.Box3(new THREE.Vector3(2.4, 0, -17), new THREE.Vector3(5.2, 2.4, -14.2)),
    new THREE.Box3(new THREE.Vector3(-10, 0, -20), new THREE.Vector3(-7.3, 3, -17)),
    new THREE.Box3(new THREE.Vector3(7, 0, -8), new THREE.Vector3(10, 3, -5)),
  ], []);
  const [units, setUnits] = useState<Unit[]>(() => makeUnits(mode));
  const unitsRef = useRef(units);
  const input = useRef<Record<string, boolean>>({});
  const player = useRef<PlayerState>({ hp: 100, alive: true, ammo: guns[weaponIndex].mag, reserve: guns[weaponIndex].mag * 3, lastShot: 0, lastAbility: 0, ult: 100, kills: 0, reload: false, ended: false, move: new THREE.Vector3() });
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const difficultyConfig = { Easy: { aim: 0.24, interval: 2.0, speed: 1.15 }, Standard: { aim: 0.46, interval: 1.35, speed: 1.5 }, Hard: { aim: 0.68, interval: 0.88, speed: 1.8 } }[difficulty];
  const isPractice = mode === 'practice';
  const applyUnits = useCallback((update: (previous: Unit[]) => Unit[]) => {
    setUnits(previous => { const next = update(previous); unitsRef.current = next; return next; });
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => { input.current[event.code] = true; if (event.code === 'Space') event.preventDefault(); };
    const up = (event: KeyboardEvent) => { input.current[event.code] = false; };
    const fire = (event: MouseEvent) => {
      if (event.button !== 0 || !controls.current?.isLocked || !player.current.alive) return;
      const state = player.current; const now = performance.now() / 1000; const gun = guns[weaponIndex];
      if (state.reload || (!isPractice && state.ammo <= 0) || now - state.lastShot < gun.rate) return;
      state.lastShot = now;
      if (!isPractice) { state.ammo--; setAmmoDisplay(state.ammo); }
      camera.updateMatrixWorld(); raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const liveUnits = unitsRef.current;
      const candidates = unitRefs.current.filter((node, index) => node && liveUnits[index]?.alive && (isPractice ? liveUnits[index]?.team === 'target' : liveUnits[index]?.team === 'red')) as THREE.Group[];
      const intersection = raycaster.intersectObjects(candidates, true)[0];
      if (intersection) {
        let parent: THREE.Object3D | null = intersection.object;
        while (parent && parent.userData.unitId === undefined) parent = parent.parent;
        const targetId = parent?.userData.unitId as number | undefined;
        if (targetId !== undefined) applyUnits(previous => previous.map(unit => {
          if (unit.id !== targetId || !unit.alive) return unit;
          const hp = unit.hp - gun.damage;
          if (hp <= 0) {
            state.kills++;
            if (isPractice) {
              window.setTimeout(() => applyUnits(current => current.map(target => target.id === targetId ? { ...target, hp: 100, alive: true } : target)), 700);
              onMessage('TARGET HIT // +1');
            } else onMessage(`${agents[unit.agent].name} DOWN`);
            return { ...unit, hp: 0, alive: false };
          }
          onMessage('HIT CONFIRMED'); return { ...unit, hp };
        }));
        onHit();
      }
      onStats({ ammo: isPractice ? Infinity : state.ammo, kills: state.kills });
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('mousedown', fire);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('mousedown', fire); };
  }, [applyUnits, camera, isPractice, onHit, onMessage, onStats, raycaster, weaponIndex]);

  const [ammoDisplay, setAmmoDisplay] = useState(guns[weaponIndex].mag);
  useEffect(() => {
    const state = player.current;
    state.hp = 100; state.alive = true; state.ammo = guns[weaponIndex].mag; state.reserve = guns[weaponIndex].mag * 3; state.ult = 100; state.kills = 0; state.reload = false; state.ended = false;
    const nextUnits = makeUnits(mode); unitsRef.current = nextUnits; setUnits(nextUnits); setAmmoDisplay(state.ammo); camera.position.set(0, 1.65, 10);
    onStats({ hp: 100, ammo: isPractice ? Infinity : state.ammo, kills: 0, blue: mode === 'team' ? 5 : 1, red: mode === 'practice' ? 6 : mode === 'skirmish' ? 3 : 5, message: '', ultimate: 100 });
  }, [resetKey, mode, camera, weaponIndex, isPractice, onStats]);

  useFrame((_, rawDelta) => {
    const state = player.current; const dt = Math.min(rawDelta, 0.05); const now = performance.now() / 1000;
    if (controls.current?.isLocked && state.alive) {
      const keys = input.current; const speed = keys.ShiftLeft ? 3.1 : keys.ControlLeft ? 2.4 : 5.2;
      state.move.set(Number(keys.KeyD) - Number(keys.KeyA), 0, Number(keys.KeyS) - Number(keys.KeyW));
      if (state.move.lengthSq() > 0) {
        state.move.normalize().multiplyScalar(speed * dt); const previousPosition = camera.position.clone();
        controls.current.moveRight(state.move.x); controls.current.moveForward(-state.move.z); camera.position.y = keys.Space ? 2.05 : 1.65;
        if (obstacles.some(box => box.containsPoint(new THREE.Vector3(camera.position.x, 0, camera.position.z)))) { camera.position.x = previousPosition.x; camera.position.z = previousPosition.z; }
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -14, 14); camera.position.z = THREE.MathUtils.clamp(camera.position.z, -26, 13);
      }
      if (keys.KeyR && !isPractice && !state.reload && state.ammo < guns[weaponIndex].mag && state.reserve > 0) {
        state.reload = true; onMessage('RELOADING');
        window.setTimeout(() => { const loaded = Math.min(guns[weaponIndex].mag - state.ammo, state.reserve); state.ammo += loaded; state.reserve -= loaded; state.reload = false; setAmmoDisplay(state.ammo); onStats({ ammo: state.ammo }); }, 900);
      }
      if (keys.KeyE && now - state.lastAbility > 0.6) {
        state.lastAbility = now;
        if (agent.role === 'MOBILITY') controls.current.moveForward(-3.5);
        else if (agent.role === 'SUPPORT') { state.hp = Math.min(100, state.hp + 35); onStats({ hp: state.hp }); }
        else if (agent.role === 'SENTINEL' || agent.role === 'DUELIST') applyUnits(previous => previous.map(unit => unit.team === 'red' && unit.alive ? { ...unit, hp: Math.max(0, unit.hp - 22), alive: unit.hp - 22 > 0 } : unit));
        else camera.position.z -= 2.5;
        onMessage(`${agent.name} // SIGNATURE`);
      }
      if (keys.KeyX && (isPractice || state.ult >= 100) && now - state.lastAbility > 0.6) {
        state.lastAbility = now; if (!isPractice) state.ult = 0; state.hp = Math.min(100, state.hp + 45);
        if (agent.role === 'MOBILITY') controls.current.moveForward(-6);
        else if (agent.role === 'SENTINEL' || agent.role === 'DUELIST') applyUnits(previous => previous.map(unit => unit.team === 'red' && unit.alive ? { ...unit, hp: Math.max(0, unit.hp - 45), alive: unit.hp - 45 > 0 } : unit));
        onStats({ hp: state.hp }); onMessage(isPractice ? 'UNLIMITED ULTIMATE // READY' : `${agent.name} // ULTIMATE`);
      }
    }
    state.ult = isPractice ? 100 : Math.min(100, state.ult + dt * 2.6);
    const liveUnits = unitsRef.current;
    liveUnits.forEach((unit, index) => {
      const group = unitRefs.current[index]; if (!group || !unit.alive) return;
      if (unit.team === 'target') { group.position.x = unit.spawn[0] + Math.sin(now * (0.55 + unit.id * 0.06)) * 1.5; group.position.z = unit.spawn[2] + Math.cos(now * 0.44 + unit.id) * 1.1; return; }
      if (mode === 'skirmish' && unit.team === 'red') {
        const playerPosition = new THREE.Vector3(camera.position.x, 0, camera.position.z); const distance = group.position.distanceTo(playerPosition);
        if (distance > 6) { const direction = playerPosition.sub(group.position).normalize(); group.position.addScaledVector(direction, difficultyConfig.speed * dt); group.rotation.y = Math.atan2(direction.x, direction.z); }
        if (distance < 19 && now > unit.nextShot) { unit.nextShot = now + difficultyConfig.interval * (0.75 + Math.random() * 0.5); if (Math.random() < difficultyConfig.aim) { state.hp = Math.max(0, state.hp - 10); onStats({ hp: state.hp }); } }
      } else if (mode === 'team') {
        const allied = unit.team === 'blue'; const enemies = liveUnits.filter(other => other.alive && other.team === (allied ? 'red' : 'blue'));
        let target: Unit | undefined; let targetGroup: THREE.Group | null = null; let nearest = Infinity;
        for (const candidate of enemies) { const targetIndex = liveUnits.findIndex(other => other.id === candidate.id); const node = unitRefs.current[targetIndex]; if (!node) continue; const distance = group.position.distanceTo(node.position); if (distance < nearest) { nearest = distance; target = candidate; targetGroup = node; } }
        if (target && targetGroup) {
          if (nearest > 6.2) { const direction = targetGroup.position.clone().sub(group.position); direction.y = 0; direction.normalize(); group.position.addScaledVector(direction, difficultyConfig.speed * dt); group.rotation.y = Math.atan2(direction.x, direction.z); }
          if (nearest < 19 && now > unit.nextShot) { unit.nextShot = now + difficultyConfig.interval * (0.75 + Math.random() * 0.5); if (Math.random() < difficultyConfig.aim) applyUnits(previous => previous.map(entry => entry.id === target!.id ? { ...entry, hp: Math.max(0, entry.hp - (allied ? 18 : 12)), alive: entry.hp - (allied ? 18 : 12) > 0 } : entry)); }
        }
      }
      if (unit.agent === 1 && unit.hp < 60 && now > unit.nextAbility) { unit.nextAbility = now + 8; applyUnits(previous => previous.map(entry => entry.id === unit.id ? { ...entry, hp: Math.min(100, entry.hp + 25) } : entry)); }
    });
    const currentUnits = unitsRef.current; const enemiesLeft = currentUnits.filter(unit => unit.team === 'red' && unit.alive).length; const livingAllies = currentUnits.filter(unit => unit.team === 'blue' && unit.alive).length;
    if (!isPractice && !state.ended && enemiesLeft === 0) { state.ended = true; onMessage('VICTORY // SITE SECURED'); onEnd(true); }
    if (mode === 'team' && !state.ended && livingAllies === 0 && state.hp <= 0) { state.ended = true; onMessage('DEFEAT // SQUAD ELIMINATED'); onEnd(false); }
    if (state.hp <= 0 && state.alive) { state.alive = false; if (!state.ended) { state.ended = true; onMessage('OPERATOR DOWN'); onEnd(false); } }
    onStats({ hp: state.hp, ammo: isPractice ? Infinity : state.ammo, kills: state.kills, blue: mode === 'team' ? livingAllies + (state.alive ? 1 : 0) : 1, red: isPractice ? currentUnits.filter(unit => unit.alive).length : enemiesLeft, ultimate: state.ult });
  });

  return <>
    <PointerLockControls ref={controls} camera={camera} pointerSpeed={0.8} />
    <color attach="background" args={['#9aaeb0']} /><fog attach="fog" args={['#b4c1b6', 24, 58]} />
    <ambientLight intensity={0.8} /><directionalLight position={[-8, 15, 7]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} /><Sky sunPosition={[40, 35, -20]} turbidity={8} rayleigh={1.4} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -5]} receiveShadow><planeGeometry args={[80, 80]} /><meshStandardMaterial color="#777a6d" roughness={0.93} /></mesh>
    <gridHelper args={[80, 80, '#657368', '#858779']} position={[0, 0, -5]} />
    <mesh position={[0, 2, -30]} castShadow><boxGeometry args={[34, 4, 1]} /><meshStandardMaterial color="#344149" /></mesh>
    <mesh position={[-17, 3, -13]} castShadow><boxGeometry args={[1, 6, 34]} /><meshStandardMaterial color="#39464b" /></mesh>
    <mesh position={[17, 3, -13]} castShadow><boxGeometry args={[1, 6, 34]} /><meshStandardMaterial color="#39464b" /></mesh>
    {obstacles.map((box, index) => { const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3()); return <mesh key={index} position={[center.x, size.y / 2, center.z]} castShadow><boxGeometry args={[size.x, size.y, size.z]} /><meshStandardMaterial color={index % 2 ? '#78624b' : '#68716b'} /></mesh>; })}
    {units.map((unit, index) => <UnitAvatar key={`${unit.id}-${unit.team}`} unit={unit} refUnit={node => { unitRefs.current[index] = node; }} />)}
    <group position={[0.34, -0.3, -0.65]}>
      <mesh><boxGeometry args={[0.19, 0.17, 0.6]} /><meshStandardMaterial color="#252d31" metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, 0.04, -0.36]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.055, 0.055, 0.36, 12]} /><meshStandardMaterial color="#111619" /></mesh>
      <mesh position={[0, 0.11, 0.05]}><boxGeometry args={[0.055, 0.035, 0.16]} /><meshBasicMaterial color={agent.color} /></mesh>
    </group>
  </>;
}

export default function GameModes() {
  const [page, setPage] = useState<'lobby' | 'game' | 'result'>('lobby');
  const [mode, setMode] = useState<Mode | null>(null);
  const [agentIndex, setAgentIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('Standard');
  const [weaponIndex, setWeaponIndex] = useState(2);
  const [resetKey, setResetKey] = useState(0);
  const [won, setWon] = useState(false);
  const [hit, setHit] = useState(false);
  const [stats, setStats] = useState<Stats>({ hp: 100, ammo: 25, kills: 0, blue: 1, red: 3, message: '', ultimate: 100 });
  const agent = agents[agentIndex];
  const start = () => { if (mode) setPage('game'); };
  const updateStats = useCallback((update: Partial<Stats>) => setStats(previous => ({ ...previous, ...update })), []);
  const showMessage = useCallback((message: string) => setStats(previous => ({ ...previous, message })), []);
  const end = useCallback((result: boolean) => { setWon(result); setPage('result'); }, []);
  const onHit = useCallback(() => { setHit(true); window.setTimeout(() => setHit(false), 120); }, []);

  if (page === 'lobby') return <main className="mode-lobby">
    <header className="mode-top"><div className="brand"><span className="brand-mark">Z</span><span>ZZAP<span className="brand-slash"> //</span></span></div><div className="mode-build">TACTICAL TRAINING NETWORK <i /> BUILD 0.3.2</div></header>
    <section className="mode-content"><div className="mode-eyebrow"><i /> COMBAT SIMULATOR // MODE SELECT</div><h1>CHOOSE YOUR<br /><em>MISSION.</em></h1><p className="mode-intro">전투 방식을 선택하고 훈련을 시작하세요. 모든 전투는 로컬 AI 시뮬레이션입니다.</p>
      <div className="mode-cards">{modes.map(item => <button key={item.id} className={`mode-card ${mode === item.id ? 'chosen' : ''}`} onClick={() => setMode(item.id)}><span className="mode-icon">{item.icon}</span><small>{item.subtitle}</small><b>{item.title}</b><p>{item.detail}</p><span className="mode-count">{item.count}</span><i className="mode-check">{mode === item.id ? '✓' : '＋'}</i></button>)}</div>
      <div className="lobby-controls"><section className="lobby-panel"><div className="lobby-panel-title">01 // SELECT YOUR OPERATOR</div><div className="operator-picks">{agents.map((item, index) => <button key={item.name} className={agentIndex === index ? 'operator-pick active' : 'operator-pick'} onClick={() => setAgentIndex(index)} style={{ '--agent-color': item.color } as React.CSSProperties}><span>{item.sigil}</span><b>{item.name}</b><small>{item.role}</small></button>)}</div></section>
        <section className="lobby-panel options-panel"><div className="lobby-panel-title">02 // SIMULATION SETTINGS</div><div className="option-line"><span>AI DIFFICULTY</span><div className="option-buttons">{(['Easy', 'Standard', 'Hard'] as const).map(item => <button key={item} className={difficulty === item ? 'active' : ''} onClick={() => setDifficulty(item)}>{item}</button>)}</div></div><div className="option-line"><span>STARTING WEAPON</span><select value={weaponIndex} onChange={event => setWeaponIndex(Number(event.target.value))}>{guns.map((gun, index) => <option value={index} key={gun.name}>{gun.name}</option>)}</select></div><div className="option-line"><span>OPERATOR ABILITY</span><small>{agent.skill}</small></div></section></div>
      <footer className="launch-row"><div><b>{mode ? modes.find(item => item.id === mode)?.count : 'SELECT A MODE TO CONTINUE'}</b><small>WASD MOVE · MOUSE AIM · CLICK FIRE · E SKILL · X ULTIMATE · R RELOAD</small></div><button disabled={!mode} onClick={start}>DEPLOY <span>↗</span></button></footer>
    </section><div className="lobby-bottom">ZZAP PROTOCOL // OFFLINE AI SIMULATION <span>NO ONLINE MULTIPLAYER</span></div>
  </main>;

  return <main className="mode-game"><Canvas shadows dpr={[1, 1.5]} camera={{ fov: 75, near: 0.1, far: 100 }}><Arena key={`${mode}-${resetKey}`} mode={mode || 'skirmish'} agent={agent} difficulty={difficulty} weaponIndex={weaponIndex} resetKey={resetKey} onStats={updateStats} onEnd={end} onMessage={showMessage} onHit={onHit} /></Canvas>
    <div className="mode-hud"><header><b><i>Z</i> ZZAP <small>// {modes.find(item => item.id === mode)?.title}</small></b><span>BLUE {stats.blue} <i /> RED {stats.red}</span><button onClick={() => setPage('lobby')}>EXIT</button></header>
      <div className="mode-site">◈ TRAINING SITE <small>— {agent.name} / {agent.role}</small></div><div className="mode-crosshair"><i /><i /><i /><i />{hit && <b>×</b>}</div><div className="mode-notice">{stats.message}</div>
      <div className="mode-bottom"><div className="mode-vitals"><small>VITALS</small><b>{Math.ceil(stats.hp)}</b><i><span style={{ width: `${stats.hp}%` }} /></i></div><div className="mode-ability"><b>E <small>SIGNATURE</small></b><b className={mode === 'practice' || stats.ultimate >= 100 ? 'ready' : ''}>X <small>{mode === 'practice' ? 'ULT ∞' : `ULT ${Math.floor(stats.ultimate)}%`}</small></b></div><div className="mode-ammo"><small>{guns[weaponIndex].name}</small><b>{mode === 'practice' ? '∞' : stats.ammo}</b><button onClick={() => setWeaponIndex(index => (index + 1) % guns.length)}>CHANGE [1]</button></div></div>
      <div className="mode-lock-hint">CLICK GAME TO LOCK MOUSE · WASD MOVE · LMB FIRE · E SKILL · X ULTIMATE · R RELOAD</div>
    </div>
    {page === 'result' && <div className="mode-result"><section><small>SIMULATION COMPLETE</small><h2>{won ? 'VICTORY.' : 'DEFEAT.'}</h2><p>{won ? 'OPPOSING TEAM ELIMINATED.' : 'YOUR TEAM HAS BEEN ELIMINATED.'}</p><div className="result-line"><span>ELIMINATIONS <b>{stats.kills}</b></span><span>MODE <b>{modes.find(item => item.id === mode)?.title}</b></span></div><button onClick={() => { setResetKey(key => key + 1); setPage('game'); }}>PLAY AGAIN ↗</button><button className="exit-result" onClick={() => setPage('lobby')}>CHANGE MODE</button></section></div>}
  </main>;
}
