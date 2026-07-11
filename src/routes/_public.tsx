import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PublicHeader, PublicFooter } from "@/components/public-shell";

export const Route = createFileRoute("/_public")({ component: PublicLayout });

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1"><Outlet /></main>
      <PublicFooter />
    </div>
  );
}
