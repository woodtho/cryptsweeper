import { createRoot } from 'react-dom/client';
import { App } from './ui/App.jsx';
import { CardSheetRenderer } from './ui/CardSheetRenderer.jsx';
import './ui/atlasSets.js';
import './styles.css';
import './gba-theme.css';

const cardSheet = new URLSearchParams(window.location.search).get('card-sheet');
if (cardSheet) document.documentElement.classList.add('card-sheet-mode');

createRoot(document.getElementById('root')).render(
  cardSheet ? <CardSheetRenderer sheetKey={cardSheet} /> : <App />,
);
