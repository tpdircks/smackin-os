// The request body is scoped to the local URLSearchParams instance.
// Never include credentials or upstream response bodies in logs or errors.
export function defaultPause(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

export async function requestSpsToken(id, secret, fetchFn) {
  var body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", id);
  body.set("client_secret", secret);
  body.set("audience", "https://spscommerce.com");
  var res = await fetchFn("https://auth.spscommerce.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!res.ok) throw new Error("SPS auth failed (" + res.status + ")");
  var parsed = await res.json();
  if (!parsed.access_token) throw new Error("SPS auth returned no access_token");
  return parsed.access_token;
}

export async function getSpsToken(id, secret, options) {
  options = options || {};
  var fetchFn = options.fetchFn || fetch;
  var pause = options.pause || defaultPause;
  var attempts = options.attempts == null ? 3 : options.attempts;
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 3) {
    throw new Error("SPS auth attempts must be between 1 and 3.");
  }
  var lastStatus = null;
  for (var attempt = 1; attempt <= attempts; attempt++) {
    try {
      var token = await requestSpsToken(id, secret, fetchFn);
      if (attempt > 1 && options.log) options.log("SPS auth recovered attempt=" + attempt);
      return { token: token, attempts: attempt, auth_retries: attempt - 1 };
    } catch (err) {
      var match = String(err && err.message || "").match(/^SPS auth failed \((\d{3})\)$/);
      lastStatus = match ? Number(match[1]) : null;
      // The observed regional test-feed failure was an upstream 400. Bounded retries
      // handle that and transient 5xx/408/429; permanent credential errors fail.
      if (lastStatus !== 400 && ![408, 425, 429].includes(lastStatus) && !(lastStatus >= 500 && ![501, 505].includes(lastStatus))) throw err;
      if (attempt < attempts) await pause(attempt * 250);
    }
  }
  throw new Error("SPS authentication failed (HTTP " + lastStatus + ") after " + attempts + " attempts. Check SPS credentials if all scheduled regions fail.");
}
