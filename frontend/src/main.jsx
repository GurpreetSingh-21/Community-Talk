// frontend/src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Grab root element
const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("❌ Root element #root not found in index.html");

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);