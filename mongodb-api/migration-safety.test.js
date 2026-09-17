import test from "node:test";
import assert from "node:assert/strict";
import {
  expectedMigrationConfirmation,
  validateMigrationRequest,
} from "./migration-safety.js";

test("migration confirmation value is scoped to the database name", () => {
  assert.equal(
    expectedMigrationConfirmation("digitalinsightai"),
    "replace-target:digitalinsightai",
  );
});

test("disabled migrations do not require connection details", () => {
  assert.deepEqual(
    validateMigrationRequest({
      migrateOnStart: false,
      sourceUri: undefined,
      targetUri: undefined,
      dbName: "digitalinsightai",
      confirmation: undefined,
    }),
    { enabled: false, identical: false },
  );
});

test("enabled migration requires both source and target connections", () => {
  assert.throws(
    () =>
      validateMigrationRequest({
        migrateOnStart: true,
        sourceUri: "mongodb://source",
        targetUri: undefined,
        dbName: "digitalinsightai",
        confirmation: "replace-target:digitalinsightai",
      }),
    /requires both source and target/i,
  );
});

test("identical source and target are treated as a safe no-op", () => {
  assert.deepEqual(
    validateMigrationRequest({
      migrateOnStart: true,
      sourceUri: "mongodb://same",
      targetUri: "mongodb://same",
      dbName: "digitalinsightai",
      confirmation: undefined,
    }),
    { enabled: false, identical: true },
  );
});

test("destructive migration requires an explicit database-scoped confirmation", () => {
  assert.throws(
    () =>
      validateMigrationRequest({
        migrateOnStart: true,
        sourceUri: "mongodb://source",
        targetUri: "mongodb://target",
        dbName: "digitalinsightai",
        confirmation: undefined,
      }),
    (error) => error?.code === "MIGRATION_CONFIRMATION_REQUIRED",
  );

  assert.deepEqual(
    validateMigrationRequest({
      migrateOnStart: true,
      sourceUri: "mongodb://source",
      targetUri: "mongodb://target",
      dbName: "digitalinsightai",
      confirmation: "replace-target:digitalinsightai",
    }),
    { enabled: true, identical: false },
  );
});
