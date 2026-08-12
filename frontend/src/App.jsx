import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Apply from "./pages/Apply";
import Status from "./pages/Status";
import BankDashboard from "./pages/BankDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/status/:id" element={<Status />} />
          <Route path="/bank" element={<BankDashboard />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
