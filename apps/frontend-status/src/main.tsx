import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Set document title based on subdomain
const setDocumentTitle = () => {
  const hostname = window.location.hostname;
  
  // Get subdomain or nest name
  let nestName = 'Status';
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const urlParams = new URLSearchParams(window.location.search);
    nestName = urlParams.get('nest') || 'Demo';
  } else {
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[1] === 'guardant' && parts[2] === 'me') {
      nestName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  }
  
  document.title = `${nestName} Status - GuardAnt`;
};

setDocumentTitle();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)