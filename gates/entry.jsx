// Mount entry for the bundle. chess.jsx only DEFINES the App component (#351 lesson: bundling chess.jsx
// directly ships a bundle with no createRoot call and the live app is a white screen). build.sh copies
// chess.jsx next to this file and bundles THIS file.
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./chess.jsx";
createRoot(document.getElementById("root")).render(<App />);
