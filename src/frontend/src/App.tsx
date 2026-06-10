import { Layout } from "@/components/Layout";
import { ScreenerPage } from "@/pages/ScreenerPage";
import { TickerDetailPage } from "@/pages/TickerDetailPage";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ScreenerPage,
});

const tickerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ticker/$symbol",
  component: TickerDetailPage,
});

const routeTree = rootRoute.addChildren([indexRoute, tickerRoute]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
