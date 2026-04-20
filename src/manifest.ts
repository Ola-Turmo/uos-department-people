import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "uos.department-people",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Department People",
  description: "Department overlay for people roles, jobs, skills, and connector policy.",
  author: "turmo.dev",
  categories: ["automation"],
  capabilities: [
    "events.subscribe",
    "plugin.state.read",
    "plugin.state.write",
    "ui.dashboardWidget.register"
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui"
  },
  ui: {
    slots: [
      {
        type: "dashboardWidget",
        id: "health-widget",
        displayName: "Department People Health",
        exportName: "DashboardWidget"
      },
      {
        type: "dashboardWidget",
        id: "onboarding-widget",
        displayName: "Onboarding Dashboard",
        exportName: "OnboardingWidget"
      },
      {
        type: "dashboardWidget",
        id: "policy-widget",
        displayName: "Policy Q&A Dashboard",
        exportName: "PolicyWidget"
      }
    ]
  }
};

export default manifest;
