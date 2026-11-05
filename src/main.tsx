import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import CharacterSelectionEnhancer from './CharacterSelection';
import './styles.css';
import './character-selection.css';
import './operator-stage.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <>
      <App />
      <CharacterSelectionEnhancer />
    </>
  </React.StrictMode>,
);
