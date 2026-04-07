import "../styles/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App";
import { bootstrapThemeFromStorageCache } from "../hooks/useTheme";

bootstrapThemeFromStorageCache();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App isSidePanel />
  </React.StrictMode>
);
