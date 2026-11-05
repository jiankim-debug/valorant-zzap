import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import OperatorModel, { type OperatorLook } from './OperatorModel';

type Character = OperatorLook & { skill: string; ultimate: string };
const characters: Character[] = [
  { name: 'KITE', role: 'MOBILITY', color: '#55d6c2', sigil: '↗', skill: 'Slipstream — 짧은 돌진으로 위치를 바꿉니다.', ultimate: 'JETSTREAM — 이동 속도와 연사 안정성 증가.' },
  { name: 'MORROW', role: 'SUPPORT', color: '#bd8dff', sigil: '✳', skill: 'Afterglow — 자신을 회복합니다.', ultimate: 'SECOND DAWN — 체력과 탄약을 완전히 회복합니다.' },
  { name: 'TINKER', role: 'SENTINEL', color: '#f0b857', sigil: '⌘', skill: 'Tripwire — 주변 적에게 피해를 주는 드론을 배치합니다.', ultimate: 'LOCKDOWN — 인근 적을 약화시킵니다.' },
  { name: 'VEX', role: 'DUELIST', color: '#fa687e', sigil: '◈', skill: 'Siphon — 처치 시 체력을 흡수합니다.', ultimate: 'REDLINE — 다음 탄창 피해량 증가.' },
  { name: 'UMBRA', role: 'CONTROLLER', color: '#7599ff', sigil: '◐', skill: 'Veilstep — 시야를 가리는 연막을 생성합니다.', ultimate: 'NIGHT SHIFT — 잠시 은폐하고 재배치합니다.' },
];

function OperatorStage({ selected }: { selected: number | null }) {
  return <div className="operator-stage" aria-label="오리지널 3D 오퍼레이터 라인업">
    <div className="stage-backdrop" />
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 2.25, 10.8], fov: 36 }} onCreated={({ camera }) => camera.lookAt(0, 1.12, 0)}>
      <color attach="background" args={['#11171d']} /><fog attach="fog" args={['#11171d', 11, 20]} />
      <ambientLight intensity={1.05} /><directionalLight position={[-4, 8, 5]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, 3, -3]} intensity={13} color="#ff536f" distance={12} /><pointLight position={[-5, 2, 1]} intensity={8} color="#625dff" distance={10} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow><planeGeometry args={[18, 12]} /><meshStandardMaterial color="#1a2227" metalness={0.35} roughness={0.48} /></mesh>
      <gridHelper args={[18, 36, '#56636b', '#303c43']} position={[0, 0.01, 0]} />
      {characters.map((character, index) => <group key={character.name} position={[(index - 2) * 1.85, 0, 0]}><OperatorModel operator={character} index={index} selected={selected === index} scale={0.88} /></group>)}
    </Canvas>
    <div className="stage-labels" aria-hidden="true">{characters.map((character, index) => <span className={selected === index ? 'stage-label active' : 'stage-label'} key={character.name} style={{ '--portrait-color': character.color } as React.CSSProperties}>{character.sigil} {character.name}</span>)}</div>
    <span className="stage-caption">ZZAP FIELD OPERATIVES // ORIGINAL 3D ROSTER</span>
  </div>;
}

function PortraitFallback({ character, index }: { character: Character; index: number }) {
  return <div className="portrait-fallback" style={{ '--portrait-color': character.color } as React.CSSProperties} aria-hidden="true">
    <div className="portrait-orbit" /><div className={`portrait-figure portrait-figure-${index}`}><span className="portrait-hair" /><span className="portrait-face"><i /></span><span className="portrait-neck" /><span className="portrait-shoulders" /><span className="portrait-visor" /></div>
    <span className="portrait-sigil">{character.sigil}</span><span className="portrait-fallback-label">FIELD OPERATIVE</span>
  </div>;
}

function CharacterAvatar({ character, index }: { character: Character; index: number }) {
  const [failed, setFailed] = useState(false);
  return <div className="character-avatar" style={{ '--portrait-color': character.color } as React.CSSProperties}>
    {!failed ? <img className={`character-atlas-image atlas-${index}`} src="/character-atlas.svg" alt={`${character.name} 아바타`} onError={() => setFailed(true)} /> : <PortraitFallback character={character} index={index} />}
    <span className="avatar-index">0{index + 1}</span>
  </div>;
}

export default function CharacterSelectionEnhancer() {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setVisible(Boolean(document.querySelector('.selection-screen')));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (visible) setSelected(null); }, [visible]);
  if (!visible) return null;

  const choose = (index: number) => {
    setSelected(index);
    document.querySelectorAll<HTMLButtonElement>('.agent-row')[index]?.click();
  };
  const character = selected === null ? null : characters[selected];
  return <section className="character-picker" aria-label="캐릭터 선택"><div className="picker-inner">
    <div className="picker-heading"><div><div className="picker-eyebrow"><span /> OPERATOR SELECT // 05 AVAILABLE</div><h1>CHOOSE YOUR <em>EDGE.</em></h1><p>작전에 투입할 오리지널 오퍼레이터를 선택하세요. 선택한 요원은 실제 플레이에 적용됩니다.</p></div><div className="picker-mode"><span>◉</span><div><b>SOLO SIMULATION</b><small>TRAINING SITE · 5 OPERATIVES</small></div></div></div>
    <OperatorStage selected={selected} />
    <div className="character-grid" role="radiogroup" aria-label="플레이 가능한 캐릭터">{characters.map((item, index) => <button className={`character-card${selected === index ? ' is-selected' : ''}`} key={item.name} type="button" role="radio" aria-checked={selected === index} aria-label={`${item.name}, ${item.role}`} onClick={() => choose(index)} style={{ '--portrait-color': item.color } as React.CSSProperties}><CharacterAvatar character={item} index={index} /><span className="character-card-info"><b>{item.name}</b><small>{item.role}</small></span><span className="character-card-check" aria-hidden="true">{selected === index ? '✓' : item.sigil}</span></button>)}</div>
    <div className={`character-detail${character ? ' has-character' : ''}`} aria-live="polite">{character ? <>
      <div className="detail-identity" style={{ '--portrait-color': character.color } as React.CSSProperties}><span className="detail-sigil">{character.sigil}</span><div><small>SELECTED OPERATIVE // {character.role}</small><b>{character.name}</b></div></div>
      <div className="detail-ability"><span>E</span><div><small>SIGNATURE</small><p>{character.skill}</p></div></div><div className="detail-ability"><span className="ultimate-key">X</span><div><small>ULTIMATE</small><p>{character.ultimate}</p></div></div>
    </> : <div className="selection-prompt"><span>←</span> 요원 카드를 선택해 능력 정보를 확인하세요</div>}
      <button className="character-deploy" type="button" disabled={selected === null} onClick={() => document.querySelector<HTMLButtonElement>('.deploy-button')?.click()}>DEPLOY <span>↗</span></button>
    </div><div className="picker-controls">TAP OR CLICK TO SELECT <i /> SELECTED OPERATIVE APPLIES TO GAMEPLAY</div>
  </div></section>;
}
