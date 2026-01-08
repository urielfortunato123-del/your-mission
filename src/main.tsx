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

createRoot(document.getElementById("root")!).render(<App />);
