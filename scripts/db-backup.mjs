#!/usr/bin/env node
/**
 * Local backup of the linked Supabase project.
 *
 * Supabase's Free plan takes no automated backups and has no point-in-time recovery
 * (https://supabase.com/docs/guides/platform/backups: daily backups are Pro/Team/Enterprise only,
 * and free projects are told to "regularly export their data using the Supabase CLI db dump
 * command and maintain off-site backups"). This script is that export.
 *
 * It writes three files per run, because no single one of them can rebuild the product:
 *   roles.sql   cluster roles (-–role-only). Passwords are never included by pg_dump.
 *   schema.sql  the public schema: tables, views, functions, triggers, indexes, grants, RLS
 *               policies. Auth and storage DDL is excluded on purpose — Supabase provisions
 *               those itself, and restoring someone else's copy of them breaks the platform.
 *   data.sql    every row, including auth.users and storage metadata, as COPY statements.
 *
 * Restore runbook: docs/DEPLOYMENT.md → "Restoring from a local backup".
 *
 * Usage:  npm run db:backup
 * Env:    SQLACADEMY_BACKUP_DIR   destination root (default: ~/DataMindsBackups)
 *         SQLACADEMY_BACKUP_KEEP  how many timestamped runs to keep (default: 8)
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const KEEP = Number(process.env.SQLACADEMY_BACKUP_KEEP ?? 8);
const ROOT = process.env.SQLACADEMY_BACKUP_DIR ?? path.join(os.homedir(), "DataMindsBackups");

/** Files the dump must produce, with a marker proving the dump is not an empty shell. */
const ARTEFACTS = [
  { file: "roles.sql", args: ["--role-only"], marker: "ROLE", minBytes: 100 },
  { file: "schema.sql", args: [], marker: "CREATE POLICY", minBytes: 10_000 },
  {
    file: "data.sql",
    args: ["--data-only", "--use-copy"],
    marker: 'COPY "auth"."users"',
    minBytes: 1_000,
  },
];

/**
 * The Supabase CLI is invoked through npx, which on Windows is a .cmd shim that Node can only
 * start through a shell. Passing one pre-quoted command string (rather than shell + argv) keeps
 * Node from concatenating arguments unsafely.
 */
function run(args) {
  const command = ["npx", "supabase", ...args]
    .map((part) => (/[\s"]/.test(part) ? `"${part.replaceAll('"', '\\"')}"` : part))
    .join(" ");
  const result = spawnSync(command, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    encoding: "utf8",
  });
  return { code: result.status, stderr: result.stderr ?? "", stdout: result.stdout ?? "" };
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function humanBytes(n) {
  if (n > 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n > 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function gitCommit() {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "unknown";
}

const stamp = timestamp();
const dest = path.join(ROOT, stamp);
fs.mkdirSync(dest, { recursive: true });

const CLOUD_FOLDERS = ["onedrive", "dropbox", "google drive", "icloud drive", "iclouddrive"];
const cloudSynced = dest
  .split(/[\/]/)
  .some((segment) => CLOUD_FOLDERS.includes(segment.toLowerCase()));
if (cloudSynced) {
  console.warn(
    `WARNING: ${dest} looks like a cloud-synced folder. These dumps contain learner personal\n` +
      "data (emails, progress, purchases). Point SQLACADEMY_BACKUP_DIR at a local disk instead.",
  );
}

console.log(`Backing up the linked Supabase project into ${dest}`);

const manifest = { created_at: new Date().toISOString(), git_commit: gitCommit(), files: [] };
let failed = false;

for (const artefact of ARTEFACTS) {
  const target = path.join(dest, artefact.file);
  process.stdout.write(`  ${artefact.file} ... `);
  const { code, stderr } = run(["db", "dump", "--linked", "-f", target, ...artefact.args]);
  if (code !== 0 || !fs.existsSync(target)) {
    console.log("FAILED");
    console.error(stderr.trim());
    failed = true;
    continue;
  }
  const content = fs.readFileSync(target);
  const size = content.length;
  const hasMarker = content.includes(artefact.marker);
  // A dump that ran without error but came back empty is the failure mode that silently
  // destroys a backup strategy, so treat "too small" and "missing marker" as failures.
  if (size < artefact.minBytes || !hasMarker) {
    console.log(`SUSPECT (${humanBytes(size)}, marker ${hasMarker ? "present" : "MISSING"})`);
    failed = true;
    continue;
  }
  manifest.files.push({
    name: artefact.file,
    bytes: size,
    sha256: createHash("sha256").update(content).digest("hex"),
  });
  console.log(`ok (${humanBytes(size)})`);
}

if (failed) {
  console.error("\nBackup incomplete. The folder above is NOT a usable restore point.");
  process.exit(1);
}

fs.writeFileSync(path.join(dest, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(
  path.join(dest, "LEEME.txt"),
  [
    `Backup de la base de datos de Data Minds SQL Academy — ${stamp}`,
    `Commit del repositorio en ese momento: ${manifest.git_commit}`,
    "",
    "roles.sql   roles del cluster (sin contrasenas)",
    "schema.sql  esquema public: tablas, vistas, funciones, triggers, indices, permisos y RLS",
    "data.sql    todas las filas, incluidas auth.users (las cuentas) y los datos de los alumnos",
    "",
    "Como restaurar: docs/DEPLOYMENT.md, seccion 'Restoring from a local backup'.",
    "Este backup NO incluye las variables de entorno (.env.local ni las de Vercel).",
    "Sin esas variables la base restaurada no alcanza para volver a levantar el sitio.",
    "",
    "Contiene datos personales de alumnos: no lo subas a un repositorio ni a una carpeta compartida.",
  ].join("\n") + "\n",
);

// Retention: keep the newest KEEP runs, delete older ones.
const runs = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(e.name))
  .map((e) => e.name)
  .sort();
for (const old of runs.slice(0, Math.max(0, runs.length - KEEP))) {
  fs.rmSync(path.join(ROOT, old), { recursive: true, force: true });
  console.log(`  pruned ${old}`);
}

console.log(`\nDone. ${manifest.files.length} files, restore point ${stamp}.`);
console.log(`Keeping the newest ${KEEP} runs in ${ROOT}.`);
