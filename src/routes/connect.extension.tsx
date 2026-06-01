import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * `/connect/extension` layout — children render their own UI:
 *   - `/connect/extension`        → authorize (connect.extension.index.tsx)
 *   - `/connect/extension/success` → handoff
 *   - `/connect/extension/failure` → error / device limit
 */
export const Route = createFileRoute("/connect/extension")({
  ssr: false,
  component: ConnectExtensionLayout,
});

function ConnectExtensionLayout() {
  return <Outlet />;
}
