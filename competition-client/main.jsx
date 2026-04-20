import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import CompetitionApp from "../src/CompetitionApp";
import { preventInspect } from "../src/utils/preventInspect";
import { displayAttribution } from "../src/utils/attribution";
import "../src/styles/index.css";

preventInspect();
displayAttribution();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <CompetitionApp />
    </BrowserRouter>
  </React.StrictMode>
);
