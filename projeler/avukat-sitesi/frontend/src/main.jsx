// src/main.jsx
import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import AuthEventsBridge from "./components/AuthEventsBridge.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthEventsBridge />
      <App />
    </BrowserRouter>
  </StrictMode>
);
