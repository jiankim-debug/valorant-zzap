import React from 'react';
import ReactDOM from 'react-dom/client';
import GameModes from './GameModes';
import './styles.css';
import './game-modes.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><GameModes /></React.StrictMode>,
);
