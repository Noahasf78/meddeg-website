import type { NextConfig } from 'next';
import { networkInterfaces } from 'node:os';

const config: NextConfig = {
  images: { qualities: [75, 90] },
  // iPhone/LAN previews must be able to connect to Next's dev runtime so that
  // client components hydrate. Allow only addresses assigned to this computer,
  // rather than a wildcard or a hard-coded address that breaks when DHCP changes.
  allowedDevOrigins: Object.values(networkInterfaces()).flatMap(addresses =>
    (addresses ?? []).filter(address => address.family === 'IPv4').map(address => address.address),
  ),
};

export default config;
