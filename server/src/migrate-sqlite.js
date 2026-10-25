import { DatabaseSync } from 'node:sqlite';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { db, runWithRequestContext } from './db.js';

const migrationId = 'legacy-sqlite-v1';
const batchSize = 500;
const defaultSource = fileURLToPath(new URL('../data/tasis.db', import.meta.url));
const sourcePath = resolve(process.env.SQLITE_SOURCE || defaultSource);
const apply = process.argv.includes('--apply');

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;
const readSourceTables = (source) => source.prepare(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
).all().map(({ name }) => name);

async function existingTables() {
  const rows = await db.prepare(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  ).all();
  return new Set(rows.map(({ table_name }) => table_name));
}

async function targetRowCount(table) {
  const row = await db.prepare(`SELECT COUNT(*)::bigint AS count FROM ${quoteIdentifier(table)}`).get();
  return Number(row.count);
}

async function validateTargetIsEmpty(tables, availableTables) {
  const populated = [];
  for (const table of tables) {
    if (availableTables.has(table)) {
      const count = await targetRowCount(table);
      if (count > 0) populated.push({ table, count });
    }
  }
  if (populated.length) {
    throw new Error(
      `PostgreSQL already contains application records; no import was performed. ` +
      `Resolve destination conflicts before retrying: ${JSON.stringify(populated)}`
    );
  }
}

async function getColumnMapping(source, table, availableTables) {
  if (!availableTables.has(table)) {
    throw new Error(`PostgreSQL schema is missing the source table "${table}".`);
  }
  const sourceColumns = source.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all();
  const targetColumns = await db.prepare(
    `SELECT column_name, is_nullable, column_default, is_generated
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ?`
  ).all(table);
  const targetByName = new Map(targetColumns.map((column) => [column.column_name, column]));
  const missing = sourceColumns.filter(({ name }) => !targetByName.has(name));
  if (missing.length) {
    throw new Error(`PostgreSQL table "${table}" is missing source columns: ${missing.map(({ name }) => name).join(', ')}`);
  }
  const sourceColumnNames = new Set(sourceColumns.map(({ name }) => name));
  const requiredTargetColumns = targetColumns.filter((column) =>
    !sourceColumnNames.has(column.column_name)
    && column.is_nullable === 'NO'
    && column.column_default === null
    && column.is_generated === 'NEVER'
  );
  if (requiredTargetColumns.length) {
    throw new Error(
      `PostgreSQL table "${table}" has required columns missing from SQLite: ` +
      requiredTargetColumns.map(({ column_name }) => column_name).join(', ')
    );
  }
  const primaryKey = sourceColumns.filter(({ pk }) => pk).sort((left, right) => left.pk - right.pk).map(({ name }) => name);
  if (!primaryKey.length) throw new Error(`SQLite table "${table}" does not have a primary key.`);
  return { columns: sourceColumns.map(({ name }) => name), primaryKey };
}

function* rowBatches(source, table, columns) {
  const statement = source.prepare(
    `SELECT ${columns.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(table)}`
  );
  let batch = [];
  for (const row of statement.iterate()) {
    batch.push(row);
    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length) yield batch;
}

async function insertTable(source, table, columns, primaryKey) {
  let imported = 0;
  for (const rows of rowBatches(source, table, columns)) {
    const valuesPerRow = columns.length;
    const values = rows.map((_, rowIndex) =>
      `(${columns.map((__, columnIndex) => `$${rowIndex * valuesPerRow + columnIndex + 1}`).join(', ')})`
    ).join(', ');
    const sql = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')}) VALUES ${values}
      RETURNING ${columns.map(quoteIdentifier).join(', ')}`;
    const params = rows.flatMap((row) => columns.map((column) => row[column]));
    const insertedRows = await db.prepare(sql).all(...params);
    if (insertedRows.length !== rows.length) {
      throw new Error(`Row-count mismatch while importing "${table}".`);
    }
    const keyFor = (row) => JSON.stringify(primaryKey.map((column) => row[column]));
    const sourceByKey = new Map(rows.map((row) => [keyFor(row), row]));
    if (sourceByKey.size !== rows.length) throw new Error(`Duplicate source primary key in "${table}".`);
    for (const insertedRow of insertedRows) {
      const sourceRow = sourceByKey.get(keyFor(insertedRow));
      if (!sourceRow || columns.some((column) => !isDeepStrictEqual(sourceRow[column], insertedRow[column]))) {
        throw new Error(`Data verification failed while importing "${table}".`);
      }
    }
    imported += insertedRows.length;
  }
  return imported;
}

async function main() {
  let source;
  try {
    source = new DatabaseSync(sourcePath, { readOnly: true });
    const integrity = source.prepare('PRAGMA integrity_check').get().integrity_check;
    if (integrity !== 'ok') throw new Error(`SQLite integrity check failed: ${integrity}`);

    const tables = readSourceTables(source);
    if (!tables.length) throw new Error('SQLite source has no application tables.');
    const existing = await existingTables();
    if (existing.has('data_migrations')) {
      const previous = await db.prepare(
        'SELECT source_name, completed_at, row_counts FROM data_migrations WHERE migration_id = ?'
      ).get(migrationId);
      if (previous) {
        console.log(JSON.stringify({
          status: 'already_migrated',
          source: previous.source_name,
          completedAt: previous.completed_at,
          rowCounts: JSON.parse(previous.row_counts),
        }, null, 2));
        return;
      }
    }
    await validateTargetIsEmpty(tables, existing);

    await db.initialize();
    const availableTables = await existingTables();
    await validateTargetIsEmpty(tables, availableTables);

    const plan = [];
    for (const table of tables) {
      const { columns, primaryKey } = await getColumnMapping(source, table, availableTables);
      const count = source.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`).get().count;
      plan.push({ table, columns, primaryKey, count });
    }
    const totalRows = plan.reduce((sum, item) => sum + item.count, 0);
    console.log(JSON.stringify({
      status: apply ? 'applying' : 'dry_run',
      source: basename(sourcePath),
      tables: plan.map(({ table, count }) => ({ table, rows: count })),
      totalRows,
    }, null, 2));
    if (!apply) {
      console.log('Dry run only. Re-run with --apply to import all rows in one transaction.');
      return;
    }

    await runWithRequestContext(async () => {
      await db.exec('BEGIN IMMEDIATE');
      try {
        const importedCounts = {};
        for (const { table, columns, primaryKey, count } of plan) {
          const imported = await insertTable(source, table, columns, primaryKey);
          if (imported !== count) {
            throw new Error(`Row-count mismatch for "${table}": expected ${count}, inserted ${imported}.`);
          }
          importedCounts[table] = imported;
        }
        for (const { table, count } of plan) {
          const actual = await targetRowCount(table);
          if (actual !== count) {
            throw new Error(`Pre-commit verification failed for "${table}": expected ${count}, found ${actual}.`);
          }
        }
        const completedAt = new Date().toISOString();
        await db.prepare(
          `INSERT INTO data_migrations(migration_id, source_name, completed_at, row_counts)
           VALUES(?, ?, ?, ?)`
        ).run(migrationId, basename(sourcePath), completedAt, JSON.stringify(importedCounts));
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }
    });

    for (const { table, count } of plan) {
      const actual = await targetRowCount(table);
      if (actual !== count) {
        throw new Error(`Post-import verification failed for "${table}": expected ${count}, found ${actual}.`);
      }
    }
    console.log(JSON.stringify({
      status: 'completed',
      source: basename(sourcePath),
      totalRows,
      tables: Object.entries(plan.reduce((counts, { table, count }) => {
        counts[table] = count;
        return counts;
      }, {})),
    }, null, 2));
  } finally {
    source?.close();
    await db.close();
  }
}

await main().catch((error) => {
  console.error('[sqlite-migration] Import failed:', error.message);
  process.exitCode = 1;
});
