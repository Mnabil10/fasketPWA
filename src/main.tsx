import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import './styles/design-tokens.css';
import './index.css';
import { initSentry } from './lib/sentry';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

initSentry().catch(() => undefined);
