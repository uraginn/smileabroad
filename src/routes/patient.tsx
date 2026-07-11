import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/patient")({ component: PatientPortalRedirect });
// Legacy compatibility only: the authenticated patient portal was removed.
function PatientPortalRedirect() { return <Navigate to="/assessment" replace />; }
