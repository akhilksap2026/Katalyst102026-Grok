/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["alasql"],
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
