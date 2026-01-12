import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA
registerSW({
  onNeedRefresh() {
    // Show a prompt to user when new content is available
    if (confirm('Nova versão disponível! Atualizar agora?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('App pronto para uso offline');
  },
});

// Log uncaught errors so we can debug "tela branca" issues
window.addEventListener('error', (event) => {
  console.error('[GlobalError] error event:', event.error ?? event.message, event);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[GlobalError] unhandledrejection:', event.reason, event);
});

createRoot(document.getElementById("root")!).render(<App />);
