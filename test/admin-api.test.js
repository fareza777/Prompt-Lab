import test from "node:test";
import assert from "node:assert/strict";
import { patchAdminUser } from "../server/adminApi.js";

test("patchAdminUser rejects invalid plan", async () => {
  const admin = {
    from: () => ({
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    }),
  };
  await assert.rejects(() => patchAdminUser(admin, "user-id", { plan: "Enterprise" }), /Invalid plan/);
});

test("patchAdminUser updates allowed fields", async () => {
  let captured = null;
  const admin = {
    from() {
      return {
        update(payload) {
          captured = payload;
          return {
            eq(_col, id) {
              assert.equal(id, "abc");
              return {
                select() {
                  return {
                    maybeSingle: () =>
                      Promise.resolve({
                        data: { id: "abc", email: "a@b.com", role: "admin", plan: "Business" },
                        error: null,
                      }),
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await patchAdminUser(admin, "abc", { role: "admin", plan: "Business", quotaLimit: 2147483647 });
  assert.equal(captured.role, "admin");
  assert.equal(captured.plan, "Business");
  assert.equal(captured.quota_limit, 2147483647);
  assert.equal(result.role, "admin");
});
