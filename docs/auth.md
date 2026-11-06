# Password reset

Corporate mail scanners (Inky Phish Fence and similar tools) open links before the person does. The default Supabase reset link is `{{ .ConfirmationURL }}`, which hits `/auth/v1/verify` and spends the one-time token. The real click then fails with "Email link is invalid or has expired".

v290 keeps that token on the app URL until the person presses Save.

## Reset Password email template

In the Supabase dashboard: Authentication, Email Templates, Reset password. Do not use `{{ .ConfirmationURL }}`. Put this exact line in the link:

```
{{ .SiteURL }}/smackin-os/?token_hash={{ .TokenHash }}&type=recovery
```

```html
<a href="{{ .SiteURL }}/smackin-os/?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

That line assumes the project Site URL is `https://tpdircks.github.io` (no `/smackin-os` on the end). The address that must arrive in the inbox is:

```
https://tpdircks.github.io/smackin-os/?token_hash=...&type=recovery
```

If Site URL is already `https://tpdircks.github.io/smackin-os`, use this equivalent instead so the path is not doubled:

```
{{ .SiteURL }}/?token_hash={{ .TokenHash }}&type=recovery
```

The app reads `token_hash` and `type=recovery` on load and shows "Set your new Smackin OS password". It does not call `verifyOtp` until Save. Save verifies with `type: "recovery"`, then `updateUser({ password })`, then removes those query params and continues signed in.

A used or expired link shows: "This reset link expired. Use Forgot password to get a new one." A button on that screen returns to the Forgot password form.

Forgot password still sends the mail with `redirectTo: https://tpdircks.github.io/smackin-os/`.

Older links that redirect back with `#access_token=...&type=recovery` still open the same form. That path is only a fallback. New mail uses `token_hash`.
