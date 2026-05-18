import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/administrator/mailing/system")({
  beforeLoad: () => {
    throw redirect({ to: "/administrator/settings" });
  },
  component: () => null,
});
