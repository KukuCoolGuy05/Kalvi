/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma needs to be treated as an external package in server components / route handlers.
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "@anthropic-ai/sdk"],
  },
};

export default nextConfig;
