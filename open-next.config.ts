import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// CF-WORKERS-ADAPTER: minimal OpenNext config — defaults work for Umami.
// Tracker bundle (public/script.js) is built ahead of time via `pnpm
// build-tracker` and served from the asset binding.
export default defineCloudflareConfig({});
