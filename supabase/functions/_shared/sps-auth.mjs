// Token requests only. Logs may include the SPS error code and a short
// response snippet. client_id, client_secret, and tokens are stripped first.
var TOKEN_SKEW_MS = 60 * 1000;
var DEFAULT_ATTEMPTS = 6;
var MAX_ATTEMPTS = 8;
var cachedToken = null;

export function clearSpsTokenCache() {
  cachedToken = null;
}

export function defaultPause(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

// Failed attempt 1 waits ~0.5s, then 1s, 2s, 4s, 8s. rand is 0..1 and adds
// up to 25% so two isolates do not retry on the same instant.
export function retryDelayMs(attempt, rand) {
  var n = Math.max(1, Number(attempt) || 1);
  var base = 500 * Math.pow(2, n - 1);
  var unit = rand == null ? Math.random() : Number(rand);
  if (!isFinite(unit) || unit < 0) unit = 0;
  if (unit > 1) unit = 1;
  return base + Math.round(unit * base * 0.25);
}

export function redactAuth(text) {
  return String(text || "")
    .replace(/client_secret=[^&\s"]+/gi, "client_secret=***")
    .replace(/client_id=[^&\s"]+/gi, "client_id=***")
    .replace(/"(client_secret|client_id|access_token|refresh_token|id_token)"\s*:\s*"[^"]*"/gi, '"$1":"***"')
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer ***")
    .slice(0, 300);
}

export function isRetryableStatus(status) {
  if (!status) return true;
  if (status === 400 || status === 408 || status === 425 || status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  return false;
}

function errorCode(bodyText) {
  try {
    var parsed = JSON.parse(String(bodyText || ""));
    if (parsed && typeof parsed.error === "string") return parsed.error.slice(0, 80);
  } catch (e) { /* body is not JSON */ }
  return "";
}

function authFailure(status, bodyText) {
  var safe = redactAuth(bodyText);
  var code = errorCode(bodyText);
  var err = new Error("SPS auth failed (" + (status || "network") + ")" + (code ? " " + code : "") + (safe ? " " + safe : ""));
  err.status = status || 0;
  err.code = code;
  err.retryable = isRetryableStatus(status);
  return err;
}

export async function requestSpsToken(id, secret, fetchFn) {
  var body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", id);
  body.set("client_secret", secret);
  body.set("audience", "https://spscommerce.com");
  var res;
  try {
    res = await fetchFn("https://auth.spscommerce.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
  } catch (err) {
    throw authFailure(0, err && err.message);
  }
  var text = "";
  try { text = await res.text(); } catch (e2) { text = ""; }
  if (!res.ok) throw authFailure(res.status, text);
  var parsed;
  try { parsed = JSON.parse(text); } catch (e3) {
    var bad = authFailure(res.status || 200, text);
    bad.retryable = false;
    throw bad;
  }
  if (!parsed.access_token) {
    var missing = authFailure(res.status || 200, "no access_token");
    missing.retryable = false;
    throw missing;
  }
  var expiresIn = Number(parsed.expires_in);
  return {
    token: parsed.access_token,
    expiresIn: isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 0
  };
}

// A warm isolate keeps one unexpired token per client id. A cold start
// fetches again. expires_in is required; a response without it is not cached.
export async function getSpsToken(id, secret, options) {
  options = options || {};
  var fetchFn = options.fetchFn || fetch;
  var pause = options.pause || defaultPause;
  var attempts = options.attempts == null ? DEFAULT_ATTEMPTS : options.attempts;
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > MAX_ATTEMPTS) {
    throw new Error("SPS auth attempts must be between 1 and " + MAX_ATTEMPTS + ".");
  }
  var nowFn = options.now || function () { return Date.now(); };
  var now = nowFn();
  if (!options.noCache && cachedToken && cachedToken.id === String(id) && cachedToken.token && cachedToken.expiresAt - TOKEN_SKEW_MS > now) {
    return { token: cachedToken.token, attempts: 0, auth_retries: 0, cached: true, expiresAt: cachedToken.expiresAt };
  }
  var lastErr = null;
  for (var attempt = 1; attempt <= attempts; attempt++) {
    try {
      var got = await requestSpsToken(id, secret, fetchFn);
      var expiresAt = got.expiresIn ? nowFn() + got.expiresIn * 1000 : 0;
      if (expiresAt && !options.noCache) {
        cachedToken = { id: String(id), token: got.token, expiresAt: expiresAt };
      }
      if (attempt > 1 && options.log) options.log("SPS auth recovered attempt=" + attempt);
      return { token: got.token, attempts: attempt, auth_retries: attempt - 1, cached: false, expiresAt: expiresAt };
    } catch (err) {
      lastErr = err;
      var retryable = !!(err && err.retryable);
      if (options.log) {
        options.log("SPS auth attempt=" + attempt + " status=" + (err && err.status ? err.status : "network") + (err && err.code ? " code=" + err.code : "") + " " + redactAuth(err && err.message));
      }
      if (!retryable) throw err;
      if (attempt < attempts) {
        var unit = typeof options.rand === "function" ? options.rand() : (options.rand == null ? Math.random() : options.rand);
        await pause(retryDelayMs(attempt, unit));
      }
    }
  }
  var status = lastErr && lastErr.status ? lastErr.status : "network";
  var code = lastErr && lastErr.code ? " " + lastErr.code : "";
  throw new Error("SPS authentication failed (HTTP " + status + code + ") after " + attempts + " attempts. Check SPS credentials if all scheduled regions fail.");
}
