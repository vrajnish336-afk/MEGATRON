# MEGADRONE Security Architecture & Governance

## 1. Zero Trust AI Model
MEGADRONE implements a Zero Trust architecture for AI operations:
1. **Never Trust LLM Outputs Blindly**: Structural schemas are verified with runtime validation.
2. **Never Allow AI to Execute Financial Transactions**: Hard guardrails explicitly prohibit money movements, wire transfers, card charges, or bank actions.
3. **Mandatory Human-in-the-Loop Gate**: Actions classified as `HIGH` risk (e.g. dispatching communications to customers, deleting records, changing roles) are paused and queued in the Approvals table until authorized by a human supervisor.

---

## 2. Secret Redaction & Sanitizer
The `backend/security/sanitizer.js` module automatically redacts sensitive keywords and regex patterns:
- Passwords & password hashes
- API keys (`sk-...`, `AIza...`)
- Bearer tokens & JWTs
- Credit card patterns
- Personal emails/phones when minimizing outbound AI payloads

---

## 3. Role-Based Access Control (RBAC) Matrix

| Permission | OWNER | ADMIN | MANAGER | EMPLOYEE | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|
| `org:read` / `org:update` | ✅ | ✅ | ✅ (read) | ✅ (read) | ✅ (read) |
| `user:create` / `user:update` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `lead:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `lead:create` / `lead:update` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `lead:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `task:read` / `task:create` | ✅ | ✅ | ✅ | ✅ | ✅ (read) |
| `task:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `workflow:execute` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `approval:action` (Approve/Reject) | ✅ | ✅ | ✅ | ❌ | ❌ |
| `ai:use` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `audit:read` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `settings:update` | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 4. Multi-Tenant Isolation
Tenant boundaries are strictly checked at:
1. **JWT Verification**: Token encodes `{ userId, orgId }`.
2. **Authentication Middleware**: Populates `req.user.orgId`.
3. **Repository Layer**: All SQL queries enforce `WHERE org_id = ?`.
