# Meridian — Agentic Banking-Policy Copilot (Angular)

> A modern, **zoneless, signals-first Angular 21** application that re-imagines a
> bank's generative-AI policy assistant (the "Lumi" pattern) as a transparent,
> governable **agentic RAG** copilot — grounded answers with citations, MCP-style
> tool calls, **human-in-the-loop approval**, a tamper-evident audit chain, and a
> **FAPI 2.0 / DPoP** security architecture.

Built as a senior-engineer showcase: it demonstrates current Angular at depth
**and** production-grade agentic AI in one app.

---

## What it does

Ask a banking-policy question (wire limits, KYC/AML, FAPI security, mortgage
stress test, AI governance…). Meridian runs a transparent agent loop:

```
plan → retrieve → grade (retry if weak) → MCP tool calls →
stream a grounded, cited draft → output guardrails →
HUMAN-IN-THE-LOOP approval → hash-chained audit
```

Every step is visible in a live **agent trace**, every answer shows its
**citations** and a **groundedness** score, MCP tools (`policy_search`,
`compliance_check`, `portfolio_scan`, `rate_lookup`) appear as they fire, and
material answers are **paused for advisor sign-off** before release.

The whole agent runs **client-side and deterministically** (no API keys) so the
pattern is fully inspectable. A real deployment swaps the mock steps for Azure
OpenAI + a vector store behind the same signal surface (the design seam).

## Pages

| Route | What it shows |
|-------|---------------|
| `/` | **Copilot console** — the agentic RAG chat with trace, tools, citations, approval gate, audit |
| `/policies` | **Policy library** — the RAG corpus, searched/filtered with pure signals + a `computed` |
| `/security` | **Security architecture** — OAuth2 Auth-Code + PKCE + PAR + **DPoP**, OIDC, BFF, token handling, defense-in-depth |
| `/guardrails` | **AI guardrails** — dev-time (anti-drift/anti-hallucination) **and** run-time (grounding, eval, HITL) |
| `/architecture` | **Angular architecture** — every modern Angular primitive mapped to where Meridian uses it, plus micro-frontends |

## Modern Angular on display

- **Zoneless** change detection (`provideZonelessChangeDetection`) — no zone.js
- **Signals** everywhere: `signal` / `computed` / `effect`, signal **`input()`** in `AgentTrace`
- **Standalone** components, **OnPush** throughout
- **New control flow** `@if` / `@for` / `@switch` and **`@defer`** (audit panel)
- **Functional HTTP interceptor** (`dpopInterceptor`) — attaches `Authorization: DPoP …` + proof header (FAPI 2.0)
- **Functional route guards** — `authGuard` + `scopeGuard('advice.draft')`
- **Lazy routes** + `PreloadAllModules`, `withComponentInputBinding()`
- Signal-based **state service** (`CopilotEngine`) as the data layer
- Ready for **Angular 22** (OnPush default, stable Signal Forms, Resource API)

## Run it

```bash
npm install
npm start          # ng serve → http://localhost:4200
npm run build      # production bundle
```

## 90-second demo script

1. **Console** — click a suggested question. Narrate the **agent trace** lighting
   up: plan → retrieve → grade → tools → draft. Point out streaming + **citations**.
2. **Approval gate** — "material answers are paused for **human sign-off** (AI-601)."
   Click **Approve** → verdict + **audit** entry (hash-chained).
3. **/security** — step through the **PKCE + PAR + DPoP** flow; "stolen Bearer tokens
   work anywhere; **DPoP** binds the token to a client key."
4. **/guardrails** — toggle the **hallucination guard** bad→good; "this is how we ship
   AI safely — and faster, because reviewers trust the output."
5. **/architecture** — the concept→usage table; "fully zoneless, signals-first,
   micro-frontend ready."

## Disclaimer

All policy content is **synthetic** (no real institution's data). Meridian is a
portfolio/interview demonstration, not financial advice.
