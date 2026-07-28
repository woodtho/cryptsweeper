import { createRoot } from 'react-dom/client';
import { App } from './ui/App.jsx';
import './ui/atlasSets.js';
import './styles.css';
import './gba-theme.css';

createRoot(document.getElementById('root')).render(<App />);
