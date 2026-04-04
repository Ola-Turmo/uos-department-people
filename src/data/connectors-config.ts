/**
 * Connectors Configuration
 * 
 * This module exports the connectors configuration as a TypeScript object
 * to avoid JSON import issues across different module resolution modes.
 */

export const connectorsConfig = {
  requiredToolkits: [
    "gmail",
    "googledrive",
    "googledocs",
    "slack"
  ],
  roleToolkits: [
    {
      roleKey: "people",
      toolkits: ["slack", "googledocs"]
    },
    {
      roleKey: "people-ops-lead",
      toolkits: ["googledrive", "googledocs", "slack"]
    },
    {
      roleKey: "people-talent-lead",
      toolkits: ["gmail", "googledocs", "slack"]
    }
  ]
} as const;

export type ConnectorsConfig = typeof connectorsConfig;
