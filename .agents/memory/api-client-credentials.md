---
name: API client credentials fix
description: customFetch must include credentials:"include" for cookie-based auth to work in the browser.
---

## Rule
`credentials: "include"` must be set in the `fetch()` call inside `lib/api-client-react/src/custom-fetch.ts`.

**Why:** Without it, the browser silently omits session cookies on every API request, so cookie-based admin auth always fails in the browser even though curl tests pass (curl sends cookies unconditionally).

**How to apply:** The fix is already in place. If auth ever breaks again after regenerating the custom-fetch, check this line:
`const response = await fetch(input, { credentials: "include", ...init, method, headers });`
