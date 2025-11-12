import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes
} from "react-router-dom";
import './App.css';
import Home from "./routes/Home";
import Shop from "./routes/Shop"
import Schemes from "./routes/Schemes";
import Helpdesk from "./routes/Helpdesk";
import Predict from "./routes/Predict";
import PredictCrop from "./routes/PredictCrop";
import Homepage from "./routes/Homepage";
import CartReview from "./routes/CartReview";
import CropDetails from "./routes/CropDetails";
import Predictloan from "./routes/Predictloan";
import Orders from "./routes/Orders";
import ProtectedRoute from "./routes/ProtectedRoute";
import Footer from "./components/Footer";

function App() {
  return (
    <Router>
      <div className="app-shell">
        <div className="app-content">
          <Routes>
            <Route exact path="/" element={<Home/>} />
            <Route exact path="/shop" element={<Shop />} />
            <Route exact path="/schemes" element={<Schemes />} />
            <Route exact path="/helpdesk" element={<Helpdesk />} />
            <Route exact path="/predict" element={<Predict />} />
            <Route exact path="/predict/crop" element={<PredictCrop />} />
            <Route exact path="/predict/loan" element={<Predictloan />} />
            <Route exact path="/marketplace" element={<Homepage/>} />
            <Route exact path="/orders" element={<ProtectedRoute><Orders/></ProtectedRoute>} />
            <Route exact path="/review/cart" element={<CartReview/>} />
            <Route exact path="/food/details/:keys" element={<CropDetails/>} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
