import { test } from "node:test";
import assert from "node:assert/strict";
import { newToken, expiryFromNow, isExpired } from "../src/lib/tokens";

test("newToken is random hex of the expected length", () => {
  const a = newToken(32);
  const b = newToken(32);
  assert.equal(a.length, 64); // 32 bytes -> 64 hex chars
  assert.match(a, /^[0-9a-f]+$/);
  assert.notEqual(a, b); // effectively never collides
});

test("expiryFromNow is in the future and isExpired agrees", () => {
  const future = expiryFromNow(1);
  assert.ok(future.getTime() > Date.now());
  assert.equal(isExpired(future), false);

  const past = new Date(Date.now() - 1000);
  assert.equal(isExpired(past), true);
});
