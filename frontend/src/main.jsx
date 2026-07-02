import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import Presenter from "./pages/Presenter.jsx";
import Display from "./pages/Display.jsx";
import Team from "./pages/Team.jsx";
import Home from "./pages/Home.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/presenter" element={<Presenter />} />
        <Route path="/display" element={<Display />} />
        <Route path="/team/:teamId" element={<Team />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
