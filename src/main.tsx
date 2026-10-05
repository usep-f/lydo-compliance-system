import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'
import App from './App.tsx'

// Canonical domain redirect: ensure all traffic is unified on .firebaseapp.com to maintain consistent auth sessions
if (window.location.hostname.endsWith('.web.app')) {
  window.location.replace(
    'https://lydo-compliance-system-ce8c3.firebaseapp.com' +
      window.location.pathname +
      window.location.search +
      window.location.hash
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
