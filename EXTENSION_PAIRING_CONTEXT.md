# Extension pairing — context persistence

## Problem

Fresh browser profiles must sign in before authorizing the extension. Login redirects can drop nested query parameters:

```
/login?next=https://auth/connect/extension?installId=…&redirect_uri=…&state=…
```

If `next` is not fully URL-encoded, the browser may parse `redirect_uri` and `state` as **login** query params instead of part of `next`. After login, `/connect/extension` loads without params → Zod crash.

## Solution

1. **sessionStorage** (`novasafe.extension.pairingContext`) — saved on first valid visit, 15 min TTL.
2. **Restore on load** — `resolveExtensionPairingSearch()` reads URL, merges stray params, then sessionStorage.
3. **Friendly UI** — missing context shows `ExtensionPairingExpiredCard` (no Zod throw).
4. **Login `next`** — always a fully encoded absolute URL via `buildConnectExtensionReturnUrl()`.
5. **Already signed in** — `/login?next=…` redirects to pairing via `resolvePostAuthRedirect`, not `/vault`.

## Debug logging

Set `VITE_EXTENSION_PAIRING_DEBUG=true` or run in development. Logs:

- Pairing params from URL / sessionStorage
- Redirect to login
- Post-auth redirect destination

## Test scenarios

| Scenario | Expected |
|----------|----------|
| Already logged in → connect | Pairing screen immediately |
| Fresh profile → login → connect | Params restored, Connect works |
| Second Chrome profile | Independent `installId` per extension |
| Login tab closed > 15 min | Expired card, retry from extension |
| Invalid state | API error on Connect, failure page |
