import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Character = {
  name: string;
  role: string;
  color: string;
  sigil: string;
  skill: string;
  ultimate: string;
};

// Original ZZAP operators: visual archetypes and silhouettes are distinct from
// characters and artwork belonging to other games or franchises.
const characters: Character[] = [
  { name: 'KITE', role: 'MOBILITY', color: '#55d6c2', sigil: '↗', skill: 'Slipstream — 짧은 돌진으로 위치를 바꿉니다.', ultimate: 'JETSTREAM — 이동 속도와 연사 안정성 증가.' },
  { name: 'MORROW', role: 'SUPPORT', color: '#bd8dff', sigil: '✳', skill: 'Afterglow — 자신을 회복합니다.', ultimate: 'SECOND DAWN — 체력과 탄약을 완전히 회복합니다.' },
  { name: 'TINKER', role: 'SENTINEL', color: '#f0b857', sigil: '⌘', skill: 'Tripwire — 주변 적에게 피해를 주는 드론을 배치합니다.', ultimate: 'LOCKDOWN — 인근 적을 약화시킵니다.' },
  { name: 'VEX', role: 'DUELIST', color: '#fa687e', sigil: '◈', skill: 'Siphon — 처치 시 체력을 흡수합니다.', ultimate: 'REDLINE — 다음 탄창 피해량 증가.' },
  { name: 'UMBRA', role: 'CONTROLLER', color: '#7599ff', sigil: '◐', skill: 'Veilstep — 시야를 가리는 연막을 생성합니다.', ultimate: 'NIGHT SHIFT — 잠시 은폐하고 재배치합니다.' },
];

function OperatorFigure({ character, index, active }: { character: Character; index: number; active: boolean }) {
  const root = useRef<THREE.Group>(null);
  const accent = character.color;
  const dark = index === 4 ? '#171b2b' : index === 1 ? '#282339' : '#202a2d';
  const armor = index === 2 ? '#6d5734' : index === 3 ? '#49313d' : '#394447';

  useFrame(({ clock }) => {
    if (!root.current) return;
    const t = clock.getElapsedTime() + index * 0.9;
    root.current.position.y = Math.sin(t * 1.25) * 0.035;
    root.current.rotation.y = Math.sin(t * 0.45) * 0.045;
  });

  return (
    <group ref={root} position-y={active ? 0.08 : 0} scale={active ? 1.02 : 0.91}>
      {/* boots and articulated legs */}
      <mesh position={[-0.22, 0.22, 0.04]} castShadow><boxGeometry args={[0.3, 0.4, 0.46]} /><meshStandardMaterial color="#151a1d" roughness={0.8} /></mesh>
      <mesh position={[0.22, 0.22, 0.04]} castShadow><boxGeometry args={[0.3, 0.4, 0.46]} /><meshStandardMaterial color="#151a1d" roughness={0.8} /></mesh>
      <mesh position={[-0.22, 0.83, 0]} castShadow><capsuleGeometry args={[0.14, 0.72, 4, 8]} /><meshStandardMaterial color={dark} roughness={0.85} /></mesh>
      <mesh position={[0.22, 0.83, 0]} castShadow><capsuleGeometry args={[0.14, 0.72, 4, 8]} /><meshStandardMaterial color={dark} roughness={0.85} /></mesh>
      <mesh position={[-0.22, 0.72, 0.11]} castShadow><boxGeometry args={[0.31, 0.23, 0.13]} /><meshStandardMaterial color={armor} roughness={0.68} /></mesh>
      <mesh position={[0.22, 0.72, 0.11]} castShadow><boxGeometry args={[0.31, 0.23, 0.13]} /><meshStandardMaterial color={armor} roughness={0.68} /></mesh>
      {/* utility belt, torso and layered chest armor */}
      <mesh position={[0, 1.35, 0]} castShadow><capsuleGeometry args={[0.34, 0.53, 5, 9]} /><meshStandardMaterial color={dark} roughness={0.72} /></mesh>
      <mesh position={[0, 1.44, 0.285]} castShadow><boxGeometry args={[0.49, 0.46, 0.12]} /><meshStandardMaterial color={armor} metalness={0.22} roughness={0.54} /></mesh>
      <mesh position={[0, 1.41, 0.355]}><boxGeometry args={[0.09, 0.54, 0.035]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} /></mesh>
      <mesh position={[0, 1.08, 0.02]} castShadow><boxGeometry args={[0.72, 0.11, 0.42]} /><meshStandardMaterial color="#111719" metalness={0.25} roughness={0.65} /></mesh>
      <mesh position={[0.23, 1.08, 0.24]}><boxGeometry args={[0.17, 0.16, 0.09]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.18} /></mesh>
      {/* shoulders, sleeves and gloves */}
      <mesh position={[-0.49, 1.58, 0]} castShadow><sphereGeometry args={[0.23, 10, 8]} /><meshStandardMaterial color={armor} roughness={0.62} /></mesh>
      <mesh position={[0.49, 1.58, 0]} castShadow><sphereGeometry args={[0.23, 10, 8]} /><meshStandardMaterial color={armor} roughness={0.62} /></mesh>
      <mesh position={[-0.57, 1.22, 0]} rotation={[0, 0, -0.12]} castShadow><capsuleGeometry args={[0.13, 0.55, 4, 7]} /><meshStandardMaterial color={dark} roughness={0.8} /></mesh>
      <mesh position={[0.57, 1.22, 0]} rotation={[0, 0, 0.12]} castShadow><capsuleGeometry args={[0.13, 0.55, 4, 7]} /><meshStandardMaterial color={dark} roughness={0.8} /></mesh>
      <mesh position={[-0.6, 0.87, 0.04]}><sphereGeometry args={[0.13, 8, 6]} /><meshStandardMaterial color="#252a2a" /></mesh>
      <mesh position={[0.6, 0.87, 0.04]}><sphereGeometry args={[0.13, 8, 6]} /><meshStandardMaterial color="#252a2a" /></mesh>
      {/* neck, face and character-specific headgear */}
      <mesh position={[0, 1.75, 0]}><cylinderGeometry args={[0.12, 0.14, 0.17, 8]} /><meshStandardMaterial color="#a77f6d" roughness={0.9} /></mesh>
      <mesh position={[0, 2.02, 0]} castShadow><sphereGeometry args={[0.25, 12, 10]} /><meshStandardMaterial color={index === 2 ? '#b88468' : '#c79b83'} roughness={0.85} /></mesh>
      <mesh position={[0, 2.04, 0.214]}><boxGeometry args={[0.37, 0.075, 0.045]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} metalness={0.3} /></mesh>
      <mesh position={[0, 2.25, -0.015]} castShadow>
        {index === 4 ? <coneGeometry args={[0.38, 0.58, 5]} /> : <sphereGeometry args={[0.285, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.48]} />}
        <meshStandardMaterial color={index === 0 ? '#d9e3df' : index === 2 ? '#293b33' : dark} roughness={0.74} side={THREE.DoubleSide} />
      </mesh>
      {/* compact field pack and role-specific silhouette details */}
      <mesh position={[0, 1.43, -0.29]} castShadow><boxGeometry args={[0.43, 0.59, 0.2]} /><meshStandardMaterial color={index === 1 ? '#342d49' : '#2b3437'} roughness={0.84} /></mesh>
      <mesh position={[0, 1.49, -0.405]}><boxGeometry args={[0.17, 0.42, 0.035]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.22} /></mesh>
      {index === 0 && <mesh position={[-0.55, 1.85, -0.04]} rotation={[0.25, 0, -0.42]}><coneGeometry args={[0.075, 0.55, 4]} /><meshStandardMaterial color="#a8fff0" emissive={accent} emissiveIntensity={0.24} /></mesh>}
      {index === 2 && <mesh position={[0.72, 1.58, -0.02]}><boxGeometry args={[0.28, 0.23, 0.25]} /><meshStandardMaterial color="#e0ad55" metalness={0.45} roughness={0.4} /></mesh>}
      {index === 3 && <mesh position={[0.52, 1.79, 0]}><sphereGeometry args={[0.095, 8, 8]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.3} /></mesh>}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.58, 20]} /><meshBasicMaterial color={accent} transparent opacity={active ? 0.28 : 0.1} /></mesh>
    </group>
  );
}

function OperatorStage({ selected }: { selected: number | null }) {
  return (
    <div className="operator-stage" aria-label="선택 가능한 오리지널 3D 오퍼레이터 미리보기">
      <div className="stage-backdrop" />
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 2.3, 10.6], fov: 36 }} onCreated={({ camera }) => camera.lookAt(0, 1.15, 0)}>
        <color attach="background" args={['#11171d']} />
        <fog attach="fog" args={['#11171d', 11, 20]} />
        <ambientLight intensity={1.05} />
        <directionalLight position={[-4, 8, 5]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[0, 3, -3]} intensity={13} color="#ff536f" distance={12} />
        <pointLight position={[-5, 2, 1]} intensity={8} color="#625dff" distance={10} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow><planeGeometry args={[18, 12]} /><meshStandardMaterial color="#1a2227" metalness={0.35} roughness={0.48} /></mesh>
        <gridHelper args={[18, 36, '#56636b', '#303c43']} position={[0, 0.01, 0]} />
        {characters.map((character, index) => <OperatorFigure key={character.name} character={character} index={index} active={selected === index} position={[ (index - 2) * 1.85, 0, 0 ] as any} />)}
      </Canvas>
      <div className="stage-labels" aria-hidden="true">{characters.map((character, index) => <span className={selected === index ? 'stage-label active' : 'stage-label'} key={character.name} style={{ '--portrait-color': character.color } as React.CSSProperties}>{character.sigil} {character.name}</span>)}</div>
      <span className="stage-caption">ZZAP FIELD OPERATIVES // ORIGINAL 3D ROSTER</span>
    </div>
  );
}

function PortraitFallback({ character, index }: { character: Character; index: number }) {
  return (
    <div className="portrait-fallback" style={{ '--portrait-color': character.color } as React.CSSProperties} aria-hidden="true">
      <div className="portrait-orbit" />
      <div className={`portrait-figure portrait-figure-${index}`}>
        <span className="portrait-hair" /><span className="portrait-face"><i /></span><span className="portrait-neck" />
        <span className="portrait-shoulders" /><span className="portrait-visor" />
      </div>
      <span className="portrait-sigil">{character.sigil}</span><span className="portrait-fallback-label">FIELD OPERATIVE</span>
    </div>
  );
}

function CharacterAvatar({ character, index }: { character: Character; index: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <div className="character-avatar" style={{ '--portrait-color': character.color } as React.CSSProperties}>
      {!imageFailed ? <img className={`character-atlas-image atlas-${index}`} src="/character-atlas.png" alt={`${character.name} 캐릭터 아바타`} onError={() => setImageFailed(true)} /> : <PortraitFallback character={character} index={index} />}
      <span className="avatar-index">0{index + 1}</span>
    </div>
  );
}

export default function CharacterSelectionEnhancer() {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const updateVisibility = () => {
      const isOnSelectionScreen = Boolean(document.querySelector('.selection-screen'));
      setVisible(previous => {
        if (previous !== isOnSelectionScreen && isOnSelectionScreen) setSelected(null);
        return isOnSelectionScreen;
      });
    };
    updateVisibility();
    const observer = new MutationObserver(updateVisibility);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  const chooseCharacter = (index: number) => {
    setSelected(index);
    document.querySelectorAll<HTMLButtonElement>('.agent-row')[index]?.click();
  };
  const deploy = () => {
    if (selected !== null) document.querySelector<HTMLButtonElement>('.deploy-button')?.click();
  };
  const character = selected === null ? null : characters[selected];

  return (
    <section className="character-picker" aria-label="캐릭터 선택">
      <div className="picker-inner">
        <div className="picker-heading">
          <div>
            <div className="picker-eyebrow"><span /> OPERATOR SELECT // 05 AVAILABLE</div>
            <h1>CHOOSE YOUR <em>EDGE.</em></h1>
            <p>작전에 투입할 오리지널 오퍼레이터를 선택하세요. 선택한 요원은 실제 플레이에 적용됩니다.</p>
          </div>
          <div className="picker-mode"><span>◉</span><div><b>SOLO SIMULATION</b><small>TRAINING SITE · {characters.length} OPERATIVES</small></div></div>
        </div>

        <OperatorStage selected={selected} />

        <div className="character-grid" role="radiogroup" aria-label="플레이 가능한 캐릭터">
          {characters.map((item, index) => {
            const isSelected = selected === index;
            return <button className={`character-card${isSelected ? ' is-selected' : ''}`} key={item.name} type="button" role="radio" aria-checked={isSelected} aria-label={`${item.name}, ${item.role}`} onClick={() => chooseCharacter(index)} style={{ '--portrait-color': item.color } as React.CSSProperties}>
              <CharacterAvatar character={item} index={index} />
              <span className="character-card-info"><b>{item.name}</b><small>{item.role}</small></span>
              <span className="character-card-check" aria-hidden="true">{isSelected ? '✓' : item.sigil}</span>
            </button>;
          })}
        </div>

        <div className={`character-detail${character ? ' has-character' : ''}`} aria-live="polite">
          {character ? <>
            <div className="detail-identity" style={{ '--portrait-color': character.color } as React.CSSProperties}><span className="detail-sigil">{character.sigil}</span><div><small>SELECTED OPERATIVE // {character.role}</small><b>{character.name}</b></div></div>
            <div className="detail-ability"><span>E</span><div><small>SIGNATURE</small><p>{character.skill}</p></div></div>
            <div className="detail-ability"><span className="ultimate-key">X</span><div><small>ULTIMATE</small><p>{character.ultimate}</p></div></div>
          </> : <div className="selection-prompt"><span>←</span> 요원 카드를 선택해 능력 정보를 확인하세요</div>}
          <button className="character-deploy" type="button" disabled={selected === null} onClick={deploy}>DEPLOY <span>↗</span></button>
        </div>
        <div className="picker-controls">TAP OR CLICK TO SELECT <i /> SELECTED OPERATIVE APPLIES TO GAMEPLAY</div>
      </div>
    </section>
  );
}
