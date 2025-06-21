// In src/main.jsx - Replace the current content with this simplified version:

import './utils/hashHandler';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('Main.jsx loaded');

// Simplified document styling
document.documentElement.style.height = '100%';
document.body.style.margin = '0';
document.body.style.minHeight = '100%';
document.body.style.fontFamily = 'sans-serif';

// Improved Tailwind check with proper timing
const checkTailwind = () => {
  return new Promise((resolve) => {
    const testElement = document.createElement('div');
    testElement.className = 'hidden';
    testElement.style.position = 'absolute';
    testElement.style.top = '-9999px';
    
    document.body.appendChild(testElement);
    
    // Use requestAnimationFrame to ensure styles are computed
    requestAnimationFrame(() => {
      const computedStyle = window.getComputedStyle(testElement);
      const isTailwindWorking = computedStyle.display === 'none';
      
      document.body.removeChild(testElement);
      // console.log('Tailwind CSS check result:', isTailwindWorking ? 'WORKING' : 'NOT WORKING');
      resolve(isTailwindWorking);
    });
  });
};

// Run check after React has rendered
setTimeout(() => {
  checkTailwind();
}, 100);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);