import { render, h } from './htm-preact.js';
import { App } from './App.js';

render(h(App), document.getElementById('app'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.error('SW registration failed:', err));
  });
}
