import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Gate } from "./ui/Gate";
import "./styles/app.css";
import "./styles/v12.css";
import "./styles/gate.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Gate />
  </StrictMode>,
);
