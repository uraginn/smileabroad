import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/pro/branding")({
  component: LegacyBrandingRedirect,
});

function LegacyBrandingRedirect() {
  return <Navigate to="/pro/settings" replace />;
}
