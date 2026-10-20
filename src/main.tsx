import '@fontsource/kanit/thai-500.css';
import '@fontsource/kanit/thai-700.css';
import '@fontsource/kanit/thai-800.css';
import '@fontsource/kanit/latin-500.css';
import '@fontsource/kanit/latin-700.css';
import '@fontsource/kanit/latin-800.css';
import '@fontsource/sarabun/thai-400.css';
import '@fontsource/sarabun/thai-500.css';
import '@fontsource/sarabun/thai-600.css';
import '@fontsource/sarabun/latin-400.css';
import '@fontsource/sarabun/latin-500.css';
import '@fontsource/sarabun/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { APP_NAME } from './config/app';

document.title = APP_NAME;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
