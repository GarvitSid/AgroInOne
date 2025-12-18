import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes
} from "react-router-dom";
import './App.css';
import Home from "./routes/Home";
import Schemes from "./routes/Schemes";
import Helpdesk from "./routes/Helpdesk";
import Predict from "./routes/Predict";
import PredictCrop from "./routes/PredictCrop";
import Predictloan from "./routes/Predictloan";
import Footer from "./components/Footer";

function App() {
  return (
    <Router>
      <div className="app-shell">
        <div className="app-content">
          <Routes>
            <Route exact path="/" element={<Home />} />
            <Route exact path="/schemes" element={<Schemes />} />
            <Route exact path="/helpdesk" element={<Helpdesk />} />
            <Route exact path="/predict" element={<Predict />} />
            <Route exact path="/predict/crop" element={<PredictCrop />} />
            <Route exact path="/predict/loan" element={<Predictloan />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

