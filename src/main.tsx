import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import App from './pilot/PilotApp';
document.documentElement.dataset.theme=localStorage.getItem('nextone-theme')==='light'?'light':'dark';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
