import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppStorage } from './services/storage';
import './index.css';

// Load persisted state (SQLite through the local API) before the first render:
// components read from the storage cache synchronously in useState initializers.
AppStorage.init().finally(() => {
  createRoot(document.getElementById('root')!).render(<App />);
});
