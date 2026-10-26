import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Home from "./pages/Home";
import Viewer from "./pages/Viewer";
import Search from "./pages/Search";
import Vault from "./pages/Vault";
import Convert from "./pages/Convert";
import { ModelsProvider } from "./context/ModelsContext";

export default function App() {
  return (
    <ModelsProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="search" element={<Search />} />
          <Route path="vault" element={<Vault />} />
          <Route path="convert" element={<Convert />} />
          <Route path="contact" element={<Contact />} />
        </Route>

        <Route path="/viewer/:id" element={<Viewer />} />
      </Routes>
    </ModelsProvider>
  );
}
