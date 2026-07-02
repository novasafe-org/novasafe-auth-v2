import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildProductionSafeDefaults, isFlagEnabled } from "./defaults.ts";
import { mergeFlagSnapshots, resolveBootstrapSnapshot } from "./resolve.ts";

describe("feature-flags defaults", () => {
  it("parked product flags default false in production-safe snapshot", () => {
    const defaults = buildProductionSafeDefaults();
    assert.equal(defaults.teams, false);
    assert.equal(defaults.enterprise, false);
    assert.equal(defaults.sso, false);
  });

  it("unknown flags resolve false", () => {
    assert.equal(isFlagEnabled({}, "unknown_flag"), false);
    assert.equal(isFlagEnabled({ teams: true }, "enterprise"), false);
  });

  it("falls back to defaults when remote is unavailable", () => {
    const boot = resolveBootstrapSnapshot(null);
    assert.equal(boot.source === "defaults" || boot.source === "cache", true);
    assert.equal(boot.snapshot.flags.teams, false);
  });

  it("merges remote flags over safe defaults", () => {
    const boot = resolveBootstrapSnapshot({
      version: "2",
      flags: { teams: true },
    });
    assert.equal(boot.snapshot.flags.teams, true);
    assert.equal(boot.snapshot.flags.enterprise, false);
  });

  it("overlay wins in mergeFlagSnapshots", () => {
    const merged = mergeFlagSnapshots({ teams: false }, { teams: true });
    assert.equal(merged.teams, true);
  });
});
