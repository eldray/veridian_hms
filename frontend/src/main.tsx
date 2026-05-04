import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { initTheme } from './store/themeStore';
import './index.css';

// Must run before render so CSS vars are set before first paint
initTheme();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);