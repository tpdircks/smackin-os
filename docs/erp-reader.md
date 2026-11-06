# ERP read-only access

The `os-viewer` edge function is a GET-only gateway. Brian and Cole send the shared bearer. The function reads Postgres as `erp_reader`, a role with SELECT only. It does not fall back to the anon key.

Nothing in this repo is a secret. Do not commit `OS_VIEWER_TOKEN` or `ERP_READER_KEY`.

## What Troy applies

Run these files in order in the Supabase SQL editor for project `otwjxqhhwljwfyqbfuxz`, or with the Supabase CLI against that project. This repository does not apply them.

1. `supabase/migrations/20261106095944_erp_reader.sql`
2. `supabase/migrations/20261106100319_audit_log.sql`

The first file creates `erp_reader` (NOLOGIN, no write grants, SELECT policies, default SELECT on future tables). It does not change anon or authenticated grants. The second file adds the edit trail. See `docs/audit-log.md`.

Confirm in the SQL editor:

```sql
select count(*) from information_schema.role_table_grants
 where grantee = 'erp_reader' and privilege_type <> 'SELECT';
```

That count must be 0.

## Issue the read-only token

1. In the Supabase dashboard open Project Settings, then JWT Keys (or the legacy JWT secret).
2. On your own machine, with the secret only in the environment, mint a JWT whose payload role is `erp_reader`:

```js
const crypto = require("crypto");
const secret = process.env.SUPABASE_JWT_SECRET;
if (!secret) throw new Error("Set SUPABASE_JWT_SECRET in the environment.");
function b64(obj) { return Buffer.from(JSON.stringify(obj)).toString("base64url"); }
const now = Math.floor(Date.now() / 1000);
const data = b64({ alg: "HS256", typ: "JWT" }) + "." + b64({
  role: "erp_reader",
  iss: "supabase",
  iat: now,
  exp: now + 60 * 60 * 24 * 365 * 5
});
const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
process.stdout.write(data + "." + sig + "\n");
```

3. Set Edge Function secrets (do not put them in git):

- `ERP_READER_KEY`: the JWT from step 2
- `OS_VIEWER_TOKEN`: the bearer Brian already uses on the deployed `os-viewer` function. Copy it from the current function configuration or from Brian's client. This repo does not store that value.

4. Deploy `os-viewer` from `supabase/functions/os-viewer`. `verify_jwt` stays false because the gateway checks `OS_VIEWER_TOKEN` itself. The database call sends the publishable key as `apikey` (project id only) and `ERP_READER_KEY` as `Authorization`.

5. Prove the role cannot write:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "apikey: <publishable key>" \
  -H "Authorization: Bearer <ERP_READER_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"id":"erp-reader-write-test"}' \
  "https://otwjxqhhwljwfyqbfuxz.supabase.co/rest/v1/items"
```

Expect 401 or 403, not 201. A GET with the same headers and `?select=id&limit=1` should return 200.

6. Prove the gateway:

```bash
curl -s -H "Authorization: Bearer <OS_VIEWER_TOKEN>" \
  "https://otwjxqhhwljwfyqbfuxz.supabase.co/functions/v1/os-viewer/tables"
```

The list includes the public tables. `POST` to the same URL returns 405.

Deploy the function only after the migration and both secrets exist. Until then the current gateway keeps serving the old 19-table allowlist.
