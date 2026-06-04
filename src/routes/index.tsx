import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/" as never, replace: true, search: {} as never });
  },
  loader: () => {
    throw redirect({ to: "/_authenticated" as never });
  },
  component: () => null,
});
