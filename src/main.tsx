import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Howler } from 'howler';

function Root() {
  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add("dark");

    // iOS Audio unlock
    const unlockAudio = () => {
      if (Howler.ctx?.state === 'suspended') {
        Howler.ctx.resume();
      }
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };

    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
  }, []);

  return <App />;
}

createRoot(document.getElementById("root")!).render(<Root />);
