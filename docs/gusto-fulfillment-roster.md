# Gusto fulfillment roster

Status: blocked on Gusto admin approval. Troy cannot link Gusto yet. He is asking Cole and Brian for authorization, with Michelle and Matt copied. This change does not call Gusto and does not invent a token.

## Dropdown today

Daily Fulfillment lists the Fulfillment department only. Shipping and the rest of the company are not in the dropdown.

Until a Gusto payload is stored, names come from the app directory (`PEOPLE`, department Fulfillment). Hires and people who leave will not update on their own yet. A name already logged on a past day still shows on that day after they leave the active list.

There is no Manage team editor. The list is not hand-maintained in the app.

## What the app will read

When a sync exists, it writes one row in Supabase `kv_status` on project `otwjxqhhwljwfyqbfuxz`. The table is already there. No SQL Editor step.

| Field | Value |
| --- | --- |
| key | `fulfillment-daily-roster` |
| value | JSON string below |

```json
{
  "source": "gusto",
  "department": "Fulfillment",
  "names": ["Jesus Arias"],
  "synced_at": "2026-10-28T00:00:00.000Z"
}
```

`gusto-roster.js` displays that row only when `source` is `gusto` and `department` is `Fulfillment`. Any other payload is ignored. Names are sorted A-Z. The last good payload is cached in the browser so a short cloud outage does not blank the dropdown. The existing `kv_status` realtime subscription and focus reload pick up a new list without another deploy.

`department` must stay `Fulfillment` even if the Gusto label differs. The department filter happens before the write. A whole-company list must not be stored under this key.

## Secrets to set after access is approved

Set these as Supabase Edge Function secrets. Do not put them in `config.js`, the browser, or git.

| Secret | Required | Purpose |
| --- | --- | --- |
| `GUSTO_API_TOKEN` | yes | Gusto API token with `employees:read`. Do not request pay scopes. |
| `GUSTO_COMPANY_ID` | yes | Gusto company UUID. |
| `GUSTO_FULFILLMENT_DEPARTMENT` | no | Department name to keep. Default `Fulfillment`. |
| `GUSTO_FULFILLMENT_DEPARTMENT_UUID` | no | When set, this UUID is the filter and the name is ignored. |
| `GUSTO_API_BASE` | no | Default `https://api.gusto.com`. Demo host is `https://api.gusto-demo.com`. |

## Sync rules for the later function

Not included in this change, so a deploy cannot call Gusto with a missing token or write a stand-in list.

Same pattern as `supabase/functions/shipping-sync`: server-side only, then a `pg_cron` schedule after the first successful manual run.

1. `GET {GUSTO_API_BASE}/v1/companies/{GUSTO_COMPANY_ID}/employees?terminated=false&per=100&page=N`
2. Headers: `Authorization: Bearer <GUSTO_API_TOKEN>` and `X-Gusto-API-Version: 2026-06-15`
3. Page until a short page. If any page fails, do not replace the stored roster.
4. Keep active employees in Troy's Fulfillment department only. Use `gusto-roster.js` `fulfillmentNames`. Skip anyone terminated, and skip a termination whose `active` flag is true.
5. Display name is preferred first name, otherwise first name, plus last name.
6. Sort A-Z. Write the `kv_status` row, then read it back and confirm the value matches.
7. If the filter matches nobody, leave the previous row in place. Do not store email, SSN, or pay.

## Still needed from Troy's side

Cole or Brian grants a Gusto API token and the company UUID (or creates them for Troy). Someone with Supabase access sets the secrets above. Then the sync function can be added. No roster edit in the app, and no code deploy after that to add or remove a Fulfillment employee.
