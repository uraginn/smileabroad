import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/patient/$")({ component: LegacyPatientRedirect });
// Legacy compatibility only: old patient portal URLs resume at the public assessment.
function LegacyPatientRedirect() { return <Navigate to="/assessment" replace />; }
