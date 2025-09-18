import React, { lazy } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";

const Index = lazy(() => import("../pages/Index"))


const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<Index />} />
      </Routes>
    </HashRouter>
  );
};

export default AppRouter;
