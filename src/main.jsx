import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { preventInspect } from "./utils/preventInspect";
import { displayAttribution } from "./utils/attribution";
import App from "./App";
import "./styles/index.css";

// Prevent developer tools inspection
preventInspect();

// Display attribution
displayAttribution();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
