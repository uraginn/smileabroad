import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/register")({ component: RegisterRedirect });
function RegisterRedirect() {
  return <Navigate to="/login" replace />;
}
