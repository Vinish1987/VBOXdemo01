import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canUpload,
  canManageSeries,
  canAccessAdmin,
  canApplyToCreate,
  hasRole,
  type Principal,
} from "../src/lib/rbac";

const viewer: Principal = { id: "v1", role: "VIEWER", creatorStatus: "NONE" };
const pending: Principal = { id: "c0", role: "VIEWER", creatorStatus: "PENDING" };
const approvedCreator: Principal = { id: "c1", role: "CREATOR", creatorStatus: "APPROVED" };
const unapprovedCreator: Principal = { id: "c2", role: "CREATOR", creatorStatus: "PENDING" };
const admin: Principal = { id: "a1", role: "ADMIN", creatorStatus: "NONE" };

test("only approved creators (or admins) can upload", () => {
  assert.equal(canUpload(viewer), false);
  assert.equal(canUpload(unapprovedCreator), false); // creator role but not approved
  assert.equal(canUpload(approvedCreator), true);
  assert.equal(canUpload(admin), true);
  assert.equal(canUpload(null), false);
});

test("creators manage only their own series; admins manage any", () => {
  assert.equal(canManageSeries(approvedCreator, "c1"), true); // owns it
  assert.equal(canManageSeries(approvedCreator, "someone-else"), false);
  assert.equal(canManageSeries(admin, "anyone"), true);
  assert.equal(canManageSeries(unapprovedCreator, "c2"), false); // not approved
  assert.equal(canManageSeries(viewer, "v1"), false);
});

test("admin areas are admin-only", () => {
  assert.equal(canAccessAdmin(admin), true);
  assert.equal(canAccessAdmin(approvedCreator), false);
  assert.equal(canAccessAdmin(viewer), false);
});

test("who can apply to become a creator", () => {
  assert.equal(canApplyToCreate(viewer), true);
  assert.equal(canApplyToCreate({ ...viewer, creatorStatus: "REJECTED" }), true); // may reapply
  assert.equal(canApplyToCreate(pending), false); // already pending
  assert.equal(canApplyToCreate(approvedCreator), false);
  assert.equal(canApplyToCreate(admin), false);
});

test("generic role gate", () => {
  assert.equal(hasRole(admin, ["ADMIN"]), true);
  assert.equal(hasRole(approvedCreator, ["ADMIN"]), false);
  assert.equal(hasRole(approvedCreator, ["CREATOR", "ADMIN"]), true);
  assert.equal(hasRole(null, ["VIEWER"]), false);
});
