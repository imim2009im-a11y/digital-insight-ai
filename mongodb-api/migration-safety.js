export function expectedMigrationConfirmation(dbName) {
  if (typeof dbName !== "string" || !dbName.trim()) {
    throw new Error("MongoDB database name is required for migration confirmation");
  }
  return `replace-target:${dbName.trim()}`;
}

export function validateMigrationRequest({
  migrateOnStart,
  sourceUri,
  targetUri,
  dbName,
  confirmation,
}) {
  if (!migrateOnStart) {
    return { enabled: false, identical: false };
  }

  if (!sourceUri || !targetUri) {
    throw new Error("Migration requires both source and target MongoDB connections");
  }

  if (sourceUri === targetUri) {
    return { enabled: false, identical: true };
  }

  const expected = expectedMigrationConfirmation(dbName);
  if (confirmation !== expected) {
    const error = new Error(
      `Migration requires explicit MIGRATION_CONFIRM=${expected}`,
    );
    error.code = "MIGRATION_CONFIRMATION_REQUIRED";
    throw error;
  }

  return { enabled: true, identical: false };
}
