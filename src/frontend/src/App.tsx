import { Layout } from "@/components/Layout";
import { DashboardPage } from "@/pages/DashboardPage";
import { StockDetailPage } from "@/pages/StockDetailPage";
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
  component: DashboardPage,
});

const stockRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stock/$symbol",
  component: StockDetailPage,
});

const routeTree = rootRoute.addChildren([indexRoute, stockRoute]);

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
