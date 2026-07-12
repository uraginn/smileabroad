import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/pro/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  return <Outlet />;
}
