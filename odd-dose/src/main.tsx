import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameProvider } from "./store/GameContext";
import { App } from "./ui/App";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
