import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Terminal from "./ui/Terminal";
import "./index.css";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Terminal />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;