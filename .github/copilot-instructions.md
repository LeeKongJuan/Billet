# Copilot Instructions — Billet

Please follow the guidelines in `AGENTS.md` and `docs/BUSINESS_RULES.md` at all times:
- Language: JavaScript (ES Modules, Node >= 22 LTS).
- Frontend: React + Vite, Bootstrap 5.3 (react-bootstrap), Recharts, TanStack Query.
- Backend: Node.js + Express, Knex with mysql2 driver (MySQL 8+).
- Money values must always be integer VND (BIGINT in MySQL, integer numbers in JS). Never use floating point calculations for money.
- All errors returned in API must follow the standard format:
  `{ "error": { "code": "...", "message": "...", "fields": { ... } } }` with friendly Vietnamese messages.
- Always enforce IDOR checks by scoping queries with `req.user.id`.
