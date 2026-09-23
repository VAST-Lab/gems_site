import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Viewer from "./pages/Viewer";
import Search from "./pages/Search";
import Vault from "./pages/Vault";
import Convert from "./pages/Convert";
import OrderDisclosure from "./pages/OrderDisclosure";
import Directions from "./pages/Directions";
import { ModelsProvider } from "./context/ModelsContext";

export default function App() {
  return (
    <ModelsProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="vault" element={<Vault />} />
          <Route path="convert" element={<Convert />} />
          <Route path="order-disclosure" element={<OrderDisclosure />} />
          <Route path="directions" element={<Directions />} />
        </Route>

        <Route path="/viewer/:id" element={<Viewer />} />
      </Routes>
    </ModelsProvider>
  );
}
