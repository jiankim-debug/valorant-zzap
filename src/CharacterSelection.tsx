import { useEffect, useState } from 'react';

type Character = {
  name: string;
  role: string;
  color: string;
  sigil: string;
  skill: string;
  ultimate: string;
};

// Keep this roster aligned with the playable agents in App.tsx. Selection is
// forwarded to the existing agent buttons so the chosen agent still controls
// the real gameplay model and ability logic.
const characters: Character[] = [
  { name: 'KITE', role: 'MOBILITY', color: '#55d6c2', sigil: '↗', skill: 'Slipstream — 짧은 돌진으로 위치를 바꿉니다.', ultimate: 'JETSTREAM — 이동 속도와 연사 안정성 증가.' },
  { name: 'MORROW', role: 'SUPPORT', color: '#bd8dff', sigil: '✳', skill: 'Afterglow — 자신을 회복합니다.', ultimate: 'SECOND DAWN — 체력과 탄약을 완전히 회복합니다.' },
  { name: 'TINKER', role: 'SENTINEL', color: '#f0b857', sigil: '⌘', skill: 'Tripwire — 주변 적에게 피해를 주는 드론을 배치합니다.', ultimate: 'LOCKDOWN — 인근 적을 약화시킵니다.' },
  { name: 'VEX', role: 'DUELIST', color: '#fa687e', sigil: '◈', skill: 'Siphon — 처치 시 체력을 흡수합니다.', ultimate: 'REDLINE — 다음 탄창 피해량 증가.' },
  { name: 'UMBRA', role: 'CONTROLLER', color: '#7599ff', sigil: '◐', skill: 'Veilstep — 시야를 가리는 연막을 생성합니다.', ultimate: 'NIGHT SHIFT — 잠시 은폐하고 재배치합니다.' },
];

function PortraitFallback({ character, index }: { character: Character; index: number }) {
  return (
    <div className="portrait-fallback" style={{ '--portrait-color': character.color } as React.CSSProperties} aria-hidden="true">
      <div className="portrait-orbit" />
      <div className={`portrait-figure portrait-figure-${index}`}>
        <span className="portrait-hair" />
        <span className="portrait-face"><i /></span>
        <span className="portrait-neck" />
        <span className="portrait-shoulders" />
        <span className="portrait-visor" />
      </div>
      <span className="portrait-sigil">{character.sigil}</span>
      <span className="portrait-fallback-label">FIELD OPERATIVE</span>
    </div>
  );
}

function CharacterAvatar({ character, index }: { character: Character; index: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  // Place the supplied 6×4 portrait sheet at public/character-atlas.png to use
  // its individual portraits. A custom vector portrait is used if it is absent.
  const cell = [0, 4, 8, 12, 16][index];
  const column = cell % 6;
  const row = Math.floor(cell / 6);

  return (
    <div className="character-avatar" style={{ '--portrait-color': character.color } as React.CSSProperties}>
      {!imageFailed ? (
        <img
          className="character-atlas-image"
          src="/character-atlas.png"
          alt={`${character.name} 캐릭터 아바타`}
          style={{ objectPosition: `${column * 20}% ${row * 33.333}%` }}
          onError={() => setImageFailed(true)}
        />
      ) : <PortraitFallback character={character} index={index} />}
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
    const originalAgentButton = document.querySelectorAll<HTMLButtonElement>('.agent-row')[index];
    originalAgentButton?.click();
  };

  const deploy = () => {
    if (selected === null) return;
    document.querySelector<HTMLButtonElement>('.deploy-button')?.click();
  };

  const character = selected === null ? null : characters[selected];

  return (
    <section className="character-picker" aria-label="캐릭터 선택">
      <div className="picker-inner">
        <div className="picker-heading">
          <div>
            <div className="picker-eyebrow"><span /> OPERATOR SELECT // 05 AVAILABLE</div>
            <h1>CHOOSE YOUR <em>EDGE.</em></h1>
            <p>작전에 투입할 오퍼레이터를 선택하세요. 선택한 요원은 실제 플레이에 적용됩니다.</p>
          </div>
          <div className="picker-mode"><span>◉</span><div><b>SOLO SIMULATION</b><small>TRAINING SITE · {characters.length} OPERATIVES</small></div></div>
        </div>

        <div className="character-grid" role="radiogroup" aria-label="플레이 가능한 캐릭터">
          {characters.map((item, index) => {
            const isSelected = selected === index;
            return (
              <button
                className={`character-card${isSelected ? ' is-selected' : ''}`}
                key={item.name}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${item.name}, ${item.role}`}
                onClick={() => chooseCharacter(index)}
                style={{ '--portrait-color': item.color } as React.CSSProperties}
              >
                <CharacterAvatar character={item} index={index} />
                <span className="character-card-info"><b>{item.name}</b><small>{item.role}</small></span>
                <span className="character-card-check" aria-hidden="true">{isSelected ? '✓' : item.sigil}</span>
              </button>
            );
          })}
        </div>

        <div className={`character-detail${character ? ' has-character' : ''}`} aria-live="polite">
          {character ? <>
            <div className="detail-identity" style={{ '--portrait-color': character.color } as React.CSSProperties}>
              <span className="detail-sigil">{character.sigil}</span>
              <div><small>SELECTED OPERATIVE // {character.role}</small><b>{character.name}</b></div>
            </div>
            <div className="detail-ability"><span>E</span><div><small>SIGNATURE</small><p>{character.skill}</p></div></div>
            <div className="detail-ability"><span className="ultimate-key">X</span><div><small>ULTIMATE</small><p>{character.ultimate}</p></div></div>
          </> : <div className="selection-prompt"><span>←</span> 요원 카드를 선택해 능력 정보를 확인하세요</div>}
          <button className="character-deploy" type="button" disabled={selected === null} onClick={deploy}>
            DEPLOY <span>↗</span>
          </button>
        </div>
        <div className="picker-controls">TAP OR CLICK TO SELECT <i /> SELECTED OPERATIVE APPLIES TO GAMEPLAY</div>
      </div>
    </section>
  );
}
