import { test } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-that-is-long-enough-1234";
process.env.PLAYBACK_TICKET_TTL_SECONDS = "300";

import {
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
  bearerFromHeader,
} from "../src/lib/auth";
import { issuePlaybackTicket, verifyPlaybackTicket } from "../src/lib/playback";

test("password hashes verify correctly and reject wrong passwords", async () => {
  const hash = await hashPassword("s3cret-pass");
  assert.equal(await verifyPassword("s3cret-pass", hash), true);
  assert.equal(await verifyPassword("wrong", hash), false);
});

test("session token round-trips claims", () => {
  const token = signSession({ sub: "u1", role: "CREATOR" });
  const claims = verifySession(token);
  assert.equal(claims?.sub, "u1");
  assert.equal(claims?.role, "CREATOR");
});

test("tampered/garbage session token is rejected", () => {
  assert.equal(verifySession("not.a.token"), null);
});

test("bearer header parsing", () => {
  assert.equal(bearerFromHeader("Bearer abc.def"), "abc.def");
  assert.equal(bearerFromHeader("bearer xyz"), "xyz");
  assert.equal(bearerFromHeader(null), null);
  assert.equal(bearerFromHeader("Basic abc"), null);
});

test("playback ticket is scoped to a single episode", () => {
  const { ticket } = issuePlaybackTicket({ episodeId: "ep42", userId: "u1", adSupported: true });
  assert.ok(verifyPlaybackTicket(ticket, "ep42"));
  assert.equal(verifyPlaybackTicket(ticket, "ep43"), null); // wrong episode rejected
});
