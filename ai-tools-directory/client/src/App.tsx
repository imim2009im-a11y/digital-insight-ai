// Style reminder: keep the global RTL editorial directory intact while route chunks load progressively.
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const AddTool = lazy(() => import("./pages/AddTool"));
const ContentTools = lazy(() => import("./pages/ContentTools"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#151514] px-6 text-center text-[#f4efe7]"
    >
      <div role="status" aria-live="polite">
        <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-[#e8753a] border-t-transparent" />
        <p className="text-sm text-[#c9c2b9]">جارٍ تحميل الصفحة…</p>
      </div>
    </main>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/add-tool" component={AddTool} />
        <Route path="/content-tools" component={ContentTools} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
