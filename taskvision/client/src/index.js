import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Set CSS variables for toast styling
document.documentElement.style.setProperty('--toast-bg', '#ffffff');
document.documentElement.style.setProperty('--toast-color', '#1f2937');
document.documentElement.style.setProperty('--toast-border', '#e5e7eb');

// Update CSS variables based on theme
const updateToastTheme = () => {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.style.setProperty('--toast-bg', '#374151');
    document.documentElement.style.setProperty('--toast-color', '#f9fafb');
    document.documentElement.style.setProperty('--toast-border', '#4b5563');
  } else {
    document.documentElement.style.setProperty('--toast-bg', '#ffffff');
    document.documentElement.style.setProperty('--toast-color', '#1f2937');
    document.documentElement.style.setProperty('--toast-border', '#e5e7eb');
  }
};

// Watch for theme changes
const observer = new MutationObserver(updateToastTheme);
observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['class']
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
