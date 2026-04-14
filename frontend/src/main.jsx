import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import CustomToaster from "./components/CustomToaster/CustomToaster.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <CustomToaster />
  </React.StrictMode>
);