import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PRDSessionProvider } from "@/contexts/PRDSessionContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import WorkspacePage from './pages/Workspace';

const App = () => {
  // Force dark theme like Cursor IDE style
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark')
  }
  return (
    <TooltipProvider>
      <PRDSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PRDSessionProvider>
    </TooltipProvider>
  );
};

export default App;
