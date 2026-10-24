import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import App from './pilot/PilotApp';
class AppBoundary extends React.Component<React.PropsWithChildren,{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<main style={{padding:32,maxWidth:700,margin:'auto'}}><h1>No pudimos abrir esta vista</h1><p>Tus datos guardados se conservan. Recarga la página para volver a intentarlo.</p><button onClick={()=>location.assign(location.origin)}>Volver al inicio</button></main>:this.props.children;}}
try{document.documentElement.dataset.theme=localStorage.getItem('nextone-theme')==='light'?'light':'dark';}catch{document.documentElement.dataset.theme='dark';}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppBoundary><App /></AppBoundary></React.StrictMode>);
