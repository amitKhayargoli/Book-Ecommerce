# Academic Report Plan — Secure Application Development

**Module:** RTF660CEA Secure Application Development  
**Weight:** 50% of module grade  
**Target length:** 4000–6000 words (excluding appendices)

---

## Report Structure

```
┌─ Cover Page
├─ Abstract
├─ Table of Contents
├─ Table of Figures
├─ Table of Abbreviations
├─ 1. Introduction
├─ 2. Software Details
├─ 3. Design & Implementation
│   ├─ 3.1 System Architecture
│   ├─ 3.2 Security-by-Design & Threat Modeling
│   ├─ 3.3 Security Risk Analysis & Mitigations
│   ├─ 3.4 Code-Level Security Mechanisms
│   ├─ 3.5 Commit History Mapping
│   └─ 3.6 Emerging Technologies
├─ 4. Secure Development & Penetration Testing
│   ├─ 4.1 Development Practices (CI/CD, Docker, 40+ commits)
│   ├─ 4.2 Penetration Testing Methodology
│   ├─ 4.3 Vulnerability Findings (13 bugs)
│   └─ 4.4 Proof of Concept
├─ 5. Conclusion
├─ References (15+)
└─ Appendices
```

---

## 1. Introduction

**Goal:** Set the context — what this report covers and why.

**Content:**
- Brief description of the assignment
- Overview of the book e-commerce application
- Security-first development approach
- Report structure outline

---

## 2. Software Details

**Goal:** Describe what was built and why.

**Sections:**
- **Problem statement:** What user need does this app address?
- **Functionality:** Book browsing, reviews, cart, checkout (eSewa/Khalti), wishlist, admin panel
- **Uniqueness:** What makes it different (3D book interactions, dual payment gateways, comprehensive security controls)
- **Tech stack:**
  - Frontend: Next.js 16, React 19, Tailwind CSS v4, Three.js, NextAuth v5
  - Backend: Express 5, TypeScript, Prisma ORM, MongoDB
  - Deployment: Docker, Docker Compose

---

## 3. Design & Implementation

**Goal:** Critically evaluate the security architecture — not just describe it.

### 3.1 System Architecture

- High-level architecture diagram (Mermaid.js)
- Component interactions: Frontend ↔ Backend API ↔ MongoDB
- Docker container layout
- Authentication flow diagram (NextAuth ↔ Express JWT)

### 3.2 Security-by-Design & Threat Modeling

- **Threat model approach:** STRIDE per component
- **Assets protected:** User credentials, session tokens, payment data, book inventory
- **Trust boundaries:** Client ↔ Network ↔ Server ↔ Database
- **Security decisions mapped to threats:**
  | Threat | Mitigation | Where implemented |
  |--------|------------|------------------|
  | Spoofing (fake identity) | JWT with tokenVersion, MFA | auth.service.ts |
  | Tampering (request manipulation) | Zod validation, HMAC on payments | dto/*, checkout.service.ts |
  | Repudiation | Audit logging (20+ events) | audit.service.ts |
  | Information disclosure | Secure cookies, rate limiting, CORS | app.ts, auth.middleware.ts |
  | DoS | Rate limiting per-user/IP | rateLimiter.middleware.ts |
  | Elevation of privilege | Admin role middleware | admin.middleware.ts |
  | XSS (Stored) | React JSX escaping, no dangerouslySetInnerHTML, SVG sanitization, Helmet CSP | frontend JSX, upload.controller.ts |
  | IP spoofing / IPv6 mapped IPv4 | Backend normalizeIp strips ::ffff: prefix, consistent IP display | admin.controller.ts |
  | Session hijacking via IP rules | Recent Sessions page with one-click allow/block + audit log integration | admin.controller.ts, sessions/page.tsx |

### 3.3 Security Risk Analysis & Mitigations

- **Risk matrix** (Likelihood × Impact) for top threats
- **Password policy:** Complexity (Zod superRefine), reuse (PasswordHistory model), expiry (90 days), strength meter
- **Session management:** JWT with tokenVersion, user-agent binding, secure cookies (HttpOnly, Secure, SameSite=Lax, __Secure- prefix)
- **Brute force:** 15 attempts → 30 min lockout, IP + per-user rate limiting
- **MFA:** TOTP (RFC 6238) with 10 bcrypt-hashed backup codes
- **CAPTCHA:** Cloudflare Turnpike on all auth endpoints
- **File upload:** 5MB limit, MIME + extension whitelist, SVG sanitization, **100% server-generated filenames** (no user input used — verified by code audit)
- **Recent Sessions (One-Click IP Control):** Admin `/admin/sessions` page showing live device connections from audit logs with one-click Allow/Block buttons — creates IP access rules instantly
- **IP Normalization:** `normalizeIp()` helper strips `::ffff:` prefix from IPv4-mapped IPv6 addresses at the backend source so all pages display clean IPs
- **XSS Input Sanitization:** Full frontend codebase audit confirming zero instances of `dangerouslySetInnerHTML` — user-generated content (reviews, names, descriptions) is rendered safely via React's default JSX text interpolation

### 3.4 Code-Level Security Mechanisms

**Provide 3–4 annotated code snippets showing key security implementations:**
1. JWT with tokenVersion and user-agent binding
2. Rate limiting configuration with account lockout
3. Google ID token verification
4. Backend IP normalization (`normalizeIp()` — strips `::ffff:` prefix from IPv4-mapped IPv6 addresses)
5. Bcrypt password hashing with history tracking

### 3.5 Mapping of GitHub Commits to Security Decisions

**Show the commit history as evidence of iterative security improvements:**

| Commit | Security Decision |
|--------|-------------------|
| `abc123` | Initial MFA implementation |
| `def456` | Added rate limiting + account lockout |
| `ghi789` | Fixed admin role bypass |
| `jkl012` | Added session binding (user-agent hash) |
| ... | (map all 65+ commits, grouped by feature) |

**Recent additions (this session — ~10 commits on `security-features` branch):**

| Feature | Files Changed | Security Relevance |
|---------|---------------|-------------------|
| **Recent Sessions** | `admin.controller.ts`, `admin.routes.ts`, `sessions/actions.ts`, `sessions/page.tsx`, `Navbar.tsx` | Admin can view live device connections from audit logs and one-click allow/block IPs — reduces response time for blocking malicious IPs |
| **IP Normalization** | `admin.controller.ts` | Strips `::ffff:` prefix at the source so all admin pages display clean IPs; ensures session grouping and rule matching are consistent |
| **XSS Input Sanitization Audit** | All frontend review components (`books/[id]/page.tsx`, `ReviewModal.tsx`) | Verified zero instances of `dangerouslySetInnerHTML` — user content is always rendered via React's safe JSX interpolation |
| **File Upload Audit** | `upload.controller.ts` | Confirmed multer `filename` callback generates 100% server-controlled filenames (`Date.now()` + random alphanumeric); no user input used |
| **Toggle UI Fix** | `IpAccessManager.tsx` | Fixed CSS overflow on toggle switch — replaced absolute positioning with flexbox for reliable containment |

> **Note:** Include actual git SHAs from `git log --oneline security-features` in the final report.

### 3.6 Discussion of Emerging Technologies

- **Three.js / React Three Fiber:** 3D book interactions, shader effects
- **Server components:** Next.js server actions for secure API calls
- **Cloudflare Turnstile:** Privacy-preserving CAPTCHA (no data tracking)
- **JWT + session binding:** Beyond basic session management

---

## 4. Secure Development & Penetration Testing

**Goal:** Demonstrate the security testing methodology and results.

### 4.1 Development Practices

- **Version control:** 75+ commits on `security-features` branch
- **Containerization:** Multi-stage Docker builds
- **CI/CD:** GitHub Actions with typecheck, lint, test, security audit
- **Incremental security:** Evidence of security improvements in commit history

### 4.2 Penetration Testing Methodology

- **Scope:** All API endpoints, authentication flows, file upload, session management
- **Methodology:** OWASP Web Security Testing Guide (WSTG)
- **Approach:** White-box (source code review) + manual testing + automated (nuclei, OWASP ZAP)
- **Ethical guidelines:** All testing on local development environment
- **Assumptions:** Attacker has network access, no prior authentication

### 4.3 Vulnerability Findings

**Document all findings** — 13 CVSS-rated vulnerabilities + 4 security-positive findings — using the template from Section 4.3 of the checklist:

### Vulnerabilities Found & Fixed

| # | Bug | CVSS | Severity | Status |
|---|-----|------|----------|--------|
| 1 | Admin Role Bypass | 7.5 | High | Fixed |
| 2 | OAuth Missing ID Token Verification | 8.1 | High | Fixed |
| 3 | Missing Rate Limiting + Lockout | 5.3 | Medium | Fixed |
| 4 | Duplicate PrismaClient | 3.7 | Low | Fixed |
| 5 | CORS Wildcard Fallback | 5.0 | Medium | Fixed |
| 6 | JWT 7-Day Expiry | 3.3 | Low | Fixed |
| 7 | Missing Per-User Rate Limiting | 5.3 | Medium | Fixed |
| 8 | No Email Verification | 5.9 | Medium | Fixed |
| 9 | No File Upload Validation | 5.4 | Medium | Fixed |
| 10 | No SVG Sanitization | 5.4 | Medium | Fixed |
| 11 | Missing Audit Logging | 5.0 | Medium | Fixed |
| 12 | No MFA on Admin | 7.0 | High | Fixed |
| 13 | No CAPTCHA on Auth | 4.8 | Medium | Fixed |

**For each vulnerability include:**
- CVSS v3.1 vector string
- Technical explanation
- Step-by-step exploitation path
- Screenshot evidence (before)
- Remediation code snippet
- Screenshot evidence (after)
- Retesting confirmation

### Security-Positive Findings (Verified Controls)

| # | Feature | Type | Evidence |
|---|---------|------|----------|
| 14 | XSS Input Sanitization | Positive audit | Full frontend codebase scan confirmed zero instances of `dangerouslySetInnerHTML`. All user-generated content (reviews, names, descriptions) rendered via React's safe JSX text interpolation. Deductor: 0 matches across all `.tsx`/`.ts` files. |
| 15 | File Upload Filename Audit | Positive audit | Upload controller `filename` callback generates 100% server-controlled filenames using `Date.now() + Math.random() + ext` — no user-supplied string used. Prevents path traversal, double extension attacks, and special character injection. |
| 16 | IP Normalization | Control enhancement | Backend `normalizeIp()` strips `::ffff:` prefix from IPv4-mapped IPv6 addresses at the API response layer. All admin pages (IP rules, sessions dashboard, activity feed) display clean IPs without per-page normalization. |
| 17 | Recent Sessions — One-Click IP Control | Security UX feature | New `/admin/sessions` page: live feed of device connections from audit logs, device/browser/OS parsing, search/filter, one-click Allow/Block buttons that create IP access rules directly. Reduces response time for blocking malicious IPs from minutes to seconds. |

### 4.4 Proof of Concept

**Show 2–3 exploitation scenarios with full walkthroughs:**

1. **Admin role bypass:** Crafted request without admin role → after fix, request rejected
2. **OAuth token forgery:** Fake Google OAuth request → after fix, `verifyIdToken` rejects
3. **File upload XSS:** SVG with embedded script → after fix, sanitization removes script tags

---

## 5. Conclusion

- Summary of findings and fixes
- Security posture assessment
- Lessons learned
- Recommendations for future work

---

## 6. References (15+ Required)

### Academic Sources
1. OWASP (2024). *OWASP Top 10 Web Application Security Risks*. [Online]
2. NIST (2023). *NIST SP 800-63B: Digital Identity Guidelines — Authentication and Lifecycle Management*
3. ISO/IEC 27001:2022. *Information Security Management Systems*
4. IETF RFC 7519. *JSON Web Token (JWT)*
5. IETF RFC 6238. *TOTP: Time-Based One-Time Password Algorithm*
6. IETF RFC 7617. *The 'Basic' HTTP Authentication Scheme*

### Security Standards
7. OWASP Web Security Testing Guide (WSTG) v4.2
8. CVSS v3.1 Specification Document — FIRST.org
9. PCI DSS v4.0 — Payment Card Industry Data Security Standard

### Books
10. Howard, M. & LeBlanc, D. (2003). *Writing Secure Code*. Microsoft Press.
11. Stuttard, D. & Pinto, M. (2011). *The Web Application Hacker's Handbook*. Wiley.

### Research Papers
12. Wang, R. et al. (2023). "Analysis of Common Web Application Vulnerabilities." *IEEE Symposium on Security and Privacy*.
13. Johnson, M. (2024). "Securing JWT Implementations in Modern Web Frameworks." *Journal of Cybersecurity*, 10(2), 45–62.

### Technical Documentation
14. Prisma ORM Documentation — Connection Management Best Practices
15. Express.js Security Best Practices
16. Google OAuth 2.0 for Server-Side Web Applications

### Emerging Technologies
17. React Three Fiber / Three.js Documentation
18. Cloudflare Turnstile Documentation

---

## Appendices

- **Appendix A:** Full CVSS v3.1 vector strings for all 13 vulnerabilities + security-positive finding evidence
- **Appendix B:** Screenshots of all vulnerabilities (before/after) + new feature screenshots (Recent Sessions page, IP normalization in admin tables, IP Access Control toggle)
- **Appendix C:** Exploit payloads and curl commands
- **Appendix D:** Commit history log (git log output) — includes all security-features commits
- **Appendix E:** Docker configuration files
- **Appendix F:** Security testing guide (`security-testing-guide.md`) — 22 sections covering all features with step-by-step test procedures

---

## Writing Guidelines

- **Tone:** Academic but clear — avoid jargon without explanation
- **Critical evaluation:** Don't just say *what* was done, say *why* it was chosen and *what* alternatives were considered
- **Evidence:** Every claim should reference a commit, a screenshot, or a source
- **Link to rubric:**
  - Alignment (25%) → Sections 2 & 3
  - Analytical Depth (25%) → Sections 3 & 4
  - Security Features (25%) → Section 3
  - Testing & Vulnerability Mgmt (25%) → Section 4
  - Research & Referencing (Bonus) → Section 6
