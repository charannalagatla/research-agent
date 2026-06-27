import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// removed reportWebVitals import — we don't need performance monitoring for this project

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);