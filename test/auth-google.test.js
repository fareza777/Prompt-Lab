import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGoogleOAuthOptions, getUserDisplayName, humanizeAuthError } from "../src/authGoogle.js";

describe("authGoogle", () => {
  it("getUserDisplayName prefers full_name then name", () => {
    assert.equal(getUserDisplayName({ email: "a@b.com", user_metadata: { name: "Ada" } }), "Ada");
    assert.equal(getUserDisplayName({ email: "a@b.com", user_metadata: { full_name: "Full Ada" } }), "Full Ada");
    assert.equal(getUserDisplayName({ email: "hello@x.com", user_metadata: {} }), "hello");
  });

  it("humanizeAuthError maps provider-not-enabled", () => {
    const msg = humanizeAuthError('{"msg":"Unsupported provider: provider is not enabled"}');
    assert.match(msg, /not configured on the server/i);
  });

  it("buildGoogleOAuthOptions targets /app redirect", () => {
    const opts = buildGoogleOAuthOptions("https://prompt-lab.xyz/app");
    assert.equal(opts.provider, "google");
    assert.equal(opts.options.redirectTo, "https://prompt-lab.xyz/app");
    assert.equal(opts.options.queryParams.prompt, "select_account");
  });
});
