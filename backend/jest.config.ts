import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.[tj]s$": "ts-jest",
  },
  transformIgnorePatterns: ["/node_modules/(?!@scure/base|@noble|@otplib)"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
};

export default config;
