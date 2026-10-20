# Katalyst — OTM Consultant OS (demo prototype)

A working, demo-ready prototype of Katalyst: a multi-tenant SaaS for Oracle OTM consultants.
It runs fully offline on your laptop with **mock OTM environments and realistic demo data**. No accounts, no cloud, no real OTM.

## Run it on Windows

1. Install **Node.js 20 LTS or newer** from https://nodejs.org (tick "Add to PATH").
2. Unzip `katalyst-prototype.zip`, open **PowerShell** in the `katalyst-app` folder.
3. Run:
   ```powershell
   npm install
   npm run dev
   ```
4. Open http://localhost:3000 and use one of the quick-login buttons.

No native modules are used (data is a JSON file), so `npm install` works on Windows, macOS and Linux.
Other commands: `npm test` (unit tests), `npm run build` then `npm start` (production mode).

## Demo logins (password for all: `demo123`)

| Email | Role | What you see |
|---|---|---|
| `admin@katalyst.demo` | Super-admin | Super-admin console: create tenants, change plan, toggle features, suspend/reactivate, audit log, reset demo data. Can enter every workspace. |
| `owner@ksap.demo` | Partner owner | **KSAP Consulting** (partner, Enterprise) + manages client workspaces **Acme** and **Nordic** via the workspace switcher. Everything unlocked incl. Prod. |
| `consultant@acme.demo` | Consultant | **Acme Logistics** (Pro): SQL Assist with live runs, Agent Compare, Agent Studio. Dev + Test only. Config Compare, Playbooks and Prod are locked. |
| `viewer@nordic.demo` | Read-only | **Nordic Freight** (Starter): Column Jargon, dictionary and Query Cockpit. Cannot run queries. Other modules show upgrade cards. |

## 5-minute demo script
1. Sign in as **Partner owner** → home page "What do you need to do?".
2. Top right **Connect demo envs** → Dev/Test/Prod go green with the OTM user and domain (environment health strip).
3. **Column Jargon** → *Load sample* → try formats, *Remove domain* (duplicates collapse), *Undo* toast.
4. **SQL Assist** → pick `SHIPMENT` + `LOCATION` → *Plan joins* → choose *source location* → *Run on DEV*. Switch to Prod → confirmation dialog. Try `DELETE`, `FOR UPDATE` or `@dblink` → blocked.
5. **Agent Compare** → Dev → Prod with mapping `KSAP → KSAP_PRD` (remove the mapping to see everything "Missing").
6. **Playbooks** → *Run playbook* (pre-migration check) → sign-off checklist.
7. Switch workspace to **Nordic** → locked modules show upgrade cards.
8. Sign in as **Super-admin** → enable *Config Compare* for Acme, or suspend Nordic, and watch the audit log.

## Reset demo data
- In the app: Super-admin console → **↺ Reset demo data**, or
- From a terminal: `npm run reset` (deletes `data/store.json`; it is re-seeded on next request).

OTM demo data (tables, rows, agents) is generated deterministically in code, so it never needs resetting.
Saved queries (Query Cockpit) live in your browser's localStorage; OTM tokens live in sessionStorage per tab.

## What's inside

| Area | Where |
|---|---|
| Tenants, users, plans, audit (JSON store) | `src/lib/store.ts`, `data/store.json` |
| Plans and entitlements (enforced in API routes and UI) | `src/lib/entitlements.ts`, `src/lib/api.ts` |
| Demo session (signed cookie) | `src/lib/auth.ts` |
| **OTM connector interface**: `MockOtmConnector` + `DbxmlOtmConnector` stub | `src/lib/otm/connector.ts` |
| Data dictionary (44 OTM-like tables with PK/FK, computed hubs) | `src/lib/otm/dictionary.ts` |
| Demo data with Dev/Test/Prod drift | `src/lib/otm/demoData.ts` |
| Column Jargon pipeline | `src/lib/listCleaner.ts` |
| Read-only SQL guard | `src/lib/sqlGuard.ts` |
| Join planner (hubs, choose-link, explicit aliased columns) | `src/lib/joinPlanner.ts` |
| Agent diff (domain mapping incl. parameter text, parent block + sequence) | `src/lib/agentDiff.ts` |
| Unit tests | `tests/*.test.ts` |

### Swapping in real OTM
Implement `DbxmlOtmConnector` (`getToken`, `query`, `exportAgents`) once the DBXML envelope (O-1) and auth method (A-4) are confirmed, then start with `OTM_CONNECTOR=dbxml`.

## Prototype limitations
- Demo login only (no SSO, no password hashing). Change `KATALYST_SESSION_SECRET` for anything shared.
- Queries run on an in-memory SQL engine (alasql) over the demo rows. Most SELECT / JOIN / WHERE / GROUP BY / ORDER BY works; Oracle-specific functions (DECODE, TO_CHAR, ROWNUM, CONNECT BY) are not supported.
- Config Compare covers rate offerings only; Playbooks has one working playbook (pre-migration check).
- No billing; "Request upgrade" is a demo toast. Prices are TBD.
- The JSON store is single-process and not meant for concurrent production use.
