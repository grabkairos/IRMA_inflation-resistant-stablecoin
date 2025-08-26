import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: require.resolve("buffer"),
      };
    }

    config.plugins = config.plugins || [];

    return config;
  },
  transpilePackages: ["@openbook-dex/openbook-v2"],
};

export default nextConfig;
