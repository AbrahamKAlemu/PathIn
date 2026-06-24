import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-only on-screen indicator (the floating "N" button) so it never
  // overlaps app UI such as the detail modal's action buttons. Next.js still
  // surfaces real build/runtime errors. This has no effect on production.
  devIndicators: false,
};

export default nextConfig;
