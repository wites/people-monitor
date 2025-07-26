import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Check if this is a backend route that should not be handled by React
const isBackendRoute = (path) => {
  return path.startsWith('/respond/') || path.startsWith('/api/');
};

// If it's a backend route, redirect to the backend
if (isBackendRoute(window.location.pathname)) {
  window.location.href = window.location.href;
} else {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
