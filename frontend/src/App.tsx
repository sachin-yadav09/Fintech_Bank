// src\App.tsx
import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { Toaster } from "sonner";

const App: React.FC = () => {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        richColors
        position="top-right"
        closeButton
        expand={false}
        duration={4000}
      />
    </>
  );
};

export default App;