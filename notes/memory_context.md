# Memory Context: Product Roadmap (MVP to Production)

Last updated: 2026-04-16
Source PDF: `notes/reference/Product_Development_Roadmap_MVP_to_Production.pdf`
Original path: `c:\Users\dp256\Downloads\Product_Development_Roadmap_MVP_to_Production (1).pdf`

## Why this context exists
This note captures the product and engineering direction from the roadmap PDF so implementation decisions in this repo stay aligned with phase goals, architecture, and compliance constraints.

## Core direction
- Product type: AI-powered enterprise automation SaaS for Indian finance/compliance workflows.
- Horizon: 4 phases across ~18+ months from MVP to enterprise scale.
- System shape: 3 layers - Presentation, Business Logic, Data + AI.
- Non-negotiable: compliance rules engine (GST/TDS/ITC/reconciliation) must be hand-written, fully tested, and CA-reviewed (not vibe-coded).

## Phase plan snapshot
- Phase 1 (Months 1-4, Foundation MVP): Tally import, GST flows, basic dashboard, 5 design partners.
- Phase 2 (Months 5-10, Growth): inventory + bank reconciliation + WhatsApp + CA dashboard; target ~200 paying customers.
- Phase 3 (Months 11-18, Full production): HR/payroll, multi-entity, embedded credit, advanced analytics; target ~1000 customers.
- Phase 4 (18+ months, Enterprise scale): white-label, API platform, on-prem, SAP/Oracle connectors; target 5000+ customers.

## Architecture and stack anchors
- Frontend: React + Next.js (App Router), React Native for mobile.
- Backend: Node.js/NestJS API plus Python/FastAPI services for AI/compliance workloads.
- Data: PostgreSQL + Redis + S3; grow toward AWS production architecture in later phases.
- AI/agents: LangGraph-oriented agent workflows with human approval gates for high-risk actions.

## Phase 1 implementation priorities (most relevant now)
- Tally XML importer is a day-1 onboarding critical path feature.
- Compliance engines require strict deterministic logic and test coverage (50+ scenario target in roadmap).
- Filing/reconciliation features should be auditable and review-first.
- Exit gate before growth phase:
  - 5 design partners onboarded.
  - GSTR-1 and GSTR-3B drafts are error-free on test data.
  - ITC mismatch detection validated by CA.
  - No compliance calculation failures for 2 full weeks of daily usage.

## Safety, governance, and ops constraints
- Human-in-the-loop for sensitive actions (filings, payments, loan submissions).
- "Decide vs execute" separation: AI suggests, humans approve/execute.
- Security baseline: encryption at rest/in transit, RLS multi-tenancy, immutable audit logs.
- CI/CD gate: compliance test suite must pass before merge/deploy.
- DPDP alignment and India data residency expectations are part of platform assumptions.

## Team and process implications
- Early compliance quality depends on active CA involvement in rule design/review.
- Engineering process should separate:
  - Green-zone (can move fast with assisted coding).
  - Red-zone compliance logic (manual implementation + strict tests + review).

