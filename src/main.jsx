// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Tailwind CSS

// For debugging Tailwind
console.log('Main.jsx loaded - checking if Tailwind CSS is applied');

// Add some inline styles to the root to ensure basic styling works
document.documentElement.style.height = '100%';
document.body.style.margin = '0';
document.body.style.minHeight = '100%';
document.body.style.fontFamily = 'sans-serif';

// Function to check if Tailwind is working
const checkTailwind = () => {
  const testElement = document.createElement('div');
  testElement.className = 'hidden';
  document.body.appendChild(testElement);
  const computedStyle = window.getComputedStyle(testElement);
  const isTailwindWorking = computedStyle.display === 'none';
  document.body.removeChild(testElement);
  console.log('Tailwind check result:', isTailwindWorking ? 'WORKING' : 'NOT WORKING');
  return isTailwindWorking;
};

// Run check after a small delay to ensure styles are loaded
setTimeout(checkTailwind, 500);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);