import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/start")({ component: StartRedirect });
function StartRedirect() {
  return <Navigate to="/assessment" replace />;
}
