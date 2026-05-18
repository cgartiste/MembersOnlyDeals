import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/administrator/")({
  beforeLoad: () => {
    throw redirect({ to: "/administrator/dashboard" });
  },
});