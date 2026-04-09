# @uos/department-people

@uos/department-people packages people operations, onboarding, policy guidance, employee-service workflows, and manager enablement into a privacy-aware operating layer. Its job is to make employee-facing operations reliable, humane, and compliant.

Built as part of the UOS split workspace on top of [Paperclip](https://github.com/paperclipai/paperclip), which remains the upstream control-plane substrate.

## What This Repo Owns

- Onboarding and employee lifecycle workflow support.
- Policy retrieval, explanation, and ambiguity identification.
- Manager enablement and coordination workflows.
- Service request routing and operational follow-through.
- Learning loops from policy questions and repeated friction points.

## Runtime Form

- Split repo with package code as the source of truth and a Paperclip plugin scaffold available for worker, manifest, UI, and validation surfaces when the repo needs runtime or operator-facing behavior.

## Highest-Value Workflows

- New-hire onboarding and manager coordination.
- Answering policy questions with evidence and confidence handling.
- Routing and tracking people-service requests.
- Identifying policy ambiguity or repeated pain points.
- Improving manager enablement assets from recurring support demand.

## Key Connections and Operating Surfaces

- HRIS and ATS systems such as BambooHR, Workday, Ashby, Greenhouse, onboarding tools, docs, policy stores, forms, surveys, Gmail/Google Workspace, Slack, and calendar surfaces needed to support real employee and candidate workflows.
- Spreadsheets, approvals, case-management systems, learning systems, audit trails, and manager-review surfaces when people work requires traceability, handoffs, or human review.
- Browser access for admin flows, policy lookup, and employee-service workflows when official integrations are incomplete or insufficiently expressive.
- Only use the maximum available tool surface in ways that preserve privacy, fairness, consent, least privilege, and clear human ownership for sensitive cases.

## KPI Targets

- Day-1 onboarding readiness reaches >= 90% for maintained onboarding flows.
- Policy-answer citation coverage reaches 100% for employee-facing policy responses.
- People-service SLA stays <= 2 business days for standard requests and <= 1 business day for urgent routed cases.
- Sensitive-case automation leakage remains at 0 incidents.

## Implementation Backlog

### Now
- Define the onboarding, people-service, and policy-answer workflows with explicit privacy boundaries.
- Build cited policy retrieval and routing for common employee and manager questions.
- Set up sensitive-case escalation and auditability so human ownership is never ambiguous.

### Next
- Improve manager enablement assets based on recurring pain points from onboarding and policy demand.
- Measure SLA performance and repeated friction so the team can prioritize improvements rationally.
- Integrate ATS, HRIS, and onboarding context where it shortens time to resolution without increasing risk.

### Later
- Support more proactive people-ops recommendations using aggregated, privacy-safe operational patterns.
- Extend the overlay from support and onboarding into broader employee lifecycle coordination.

## Local Plugin Use

```bash
curl -X POST http://127.0.0.1:3100/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName":"<absolute-path-to-this-repo>","isLocalPath":true}'
```

## Validation

```bash
npm install
npm run check
npm run plugin:typecheck
npm run plugin:test
```
