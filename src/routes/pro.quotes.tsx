import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/pro/quotes")({ component: LegacyQuotesRedirect });

function LegacyQuotesRedirect() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/pro/quotes") return <Outlet />;
  return <Navigate to="/pro/treatment-plans" replace />;
}
