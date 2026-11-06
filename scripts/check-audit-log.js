#!/usr/bin/env node
/* Audit trail: one row per save, anon stays anon, heartbeats are skipped.
   Uses a throwaway local database when psql is available. Never the live project. */
"use strict";

var fs = require("fs");
var path = require("path");
var cp = require("child_process");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var sql = read("supabase/migrations/20261106100319_audit_log.sql");
eq(sql.indexOf("os_private.log_change") >= 0, "trigger function");
eq(sql.indexOf("for each row execute function os_private.log_change()") >= 0, "row trigger");
eq(sql.indexOf(":(last_sync|lock|source)$") >= 0, "heartbeat exclusion");
eq(sql.indexOf("tg_table_name = 'audit_log'") >= 0, "skip self");
eq(sql.indexOf("exception when others") >= 0, "save survives a trail error");
eq(sql.indexOf("revoke all on table public.audit_log from anon") >= 0, "anon cannot write the trail");
eq(sql.indexOf("grant select on table public.audit_log to authenticated") >= 0, "signed-in read");
eq(sql.indexOf("grant select on table public.audit_log to erp_reader") >= 0, "reader can select");
eq(sql.indexOf("v_claims->>'email'") >= 0 && sql.indexOf("v_claims->>'sub'") >= 0, "jwt user");
eq(sql.indexOf("received_by") >= 0 && sql.indexOf("updated_by") >= 0, "operator columns");
["receiving_log", "transactions", "stock", "production_pallets", "seasoning_lots"].forEach(function (name) {
  eq(sql.indexOf("'" + name + "'") < 0 || sql.indexOf("skip " + name) < 0, name + " is not excluded");
});
eq(read("session-bind.js").indexOf("smk-persist") >= 0, "session storage");
eq(read("index.html").indexOf("session-bind.js?b=1") >= 0, "session script");
eq(read("docs/audit-log.md").indexOf(":last_sync") >= 0, "exclusion docs");
eq(sql.indexOf("\u2014") < 0 && read("docs/audit-log.md").indexOf("\u2014") < 0, "no em dash");

function psql(db, statement) {
  var args = ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-q"];
  if (db) args.push("-d", db);
  args.push("-c", statement);
  var res = cp.spawnSync("sudo", args, { encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error((res.stderr || res.stdout || "psql failed").trim());
  }
  return res.stdout || "";
}
function psqlFile(db, file) {
  var res = cp.spawnSync("sudo", ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-q", "-d", db, "-f", file], { encoding: "utf8" });
  if (res.status !== 0) throw new Error((res.stderr || res.stdout || "psql file failed").trim());
}

function prove() {
  var which = cp.spawnSync("psql", ["--version"], { encoding: "utf8" });
  if (which.status !== 0) {
    console.log("postgres proof skipped (psql missing)");
    return;
  }
  cp.spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], { encoding: "utf8" });
  psql("postgres", "drop database if exists smackin_audit_proof;");
  psql("postgres", "create database smackin_audit_proof;");
  ["anon", "authenticated", "authenticator", "service_role"].forEach(function (role) {
    psql("smackin_audit_proof", "do $$ begin if not exists (select 1 from pg_roles where rolname = '" + role + "') then create role " + role + " nologin; end if; end $$;");
  });
  psql("smackin_audit_proof", [
    "create table public.items (id text primary key, code text, name text);",
    "create table public.stock (item_id text, location text, lot text, qty numeric, primary key (item_id, location, lot));",
    "create table public.receiving_log (id bigint generated always as identity primary key, supplier text, lot text, item_id text, received_by text, qty_received numeric, notes text);",
    "create table public.transactions (id bigint generated always as identity primary key, action text, detail text, operator text);",
    "create table public.production_pallets (id bigint generated always as identity primary key, flavor_code text, cases numeric);",
    "create table public.production_days (id bigint generated always as identity primary key, prod_date date, channel text, lot text, updated_by text);",
    "create table public.seasoning_lots (id bigint generated always as identity primary key, lot text, flavor_code text);",
    "create table public.kv_status (key text primary key, value text);"
  ].join("\n"));
  psqlFile("smackin_audit_proof", path.join(root, "supabase/migrations/20261106095944_erp_reader.sql"));
  psqlFile("smackin_audit_proof", path.join(root, "supabase/migrations/20261106100319_audit_log.sql"));

  var uid = "11111111-1111-4111-8111-111111111111";
  function asUser(email, role, statement) {
    var claims = JSON.stringify({ sub: uid, email: email, role: role }).replace(/'/g, "''");
    return psql("smackin_audit_proof", "begin; select set_config('request.jwt.claims', '" + claims + "', true); " + statement + " commit;");
  }
  function count(where) {
    var out = psql("smackin_audit_proof", "copy (select count(*) from public.audit_log" + (where ? " where " + where : "") + ") to stdout;");
    return parseInt(String(out).trim(), 10);
  }

  asUser("troy@smackinsnacks.com", "authenticated", "insert into public.transactions (action, detail, operator) values ('Count/Adjust', 'BAG4-S01', 'Adriana');");
  eq(count("table_name = 'transactions'") === 1, "adjust log is one row");
  var tx = psql("smackin_audit_proof", "copy (select user_email || '|' || coalesce(operator,'') || '|' || actor_role from public.audit_log where table_name = 'transactions') to stdout;");
  eq(tx.trim() === "troy@smackinsnacks.com|Adriana|authenticated", "adjust user " + tx.trim());

  asUser("jesus@smackinsnacks.com", "authenticated", "insert into public.receiving_log (supplier, lot, item_id, received_by, qty_received, notes) values ('Acme', 'L1', 'BAG4-S01', 'Jesus', 10, 'dock');");
  eq(count("table_name = 'receiving_log'") === 1, "dock insert is one row");
  var dock = psql("smackin_audit_proof", "copy (select user_email || '|' || coalesce(operator,'') from public.audit_log where table_name = 'receiving_log') to stdout;");
  eq(dock.trim() === "jesus@smackinsnacks.com|Jesus", "dock user " + dock.trim());

  asUser("jesus@smackinsnacks.com", "authenticated", "insert into public.production_pallets (flavor_code, cases) values ('S05', 12);");
  eq(count("table_name = 'production_pallets'") === 1, "pallet insert is one row");

  asUser("allen@smackinsnacks.com", "authenticated", "insert into public.seasoning_lots (lot, flavor_code) values ('6105', 'S07');");
  eq(count("table_name = 'seasoning_lots'") === 1, "seasoning insert is one row");

  asUser("troy@smackinsnacks.com", "authenticated", "insert into public.stock (item_id, location, lot, qty) values ('BAG4-S01', 'A-01-L1', '', 5); update public.stock set qty = 8 where item_id = 'BAG4-S01';");
  eq(count("table_name = 'stock' and action = 'insert'") === 1, "stock insert is one row");
  eq(count("table_name = 'stock' and action = 'update'") === 1, "stock update is one row");

  var beforeBeat = count("");
  asUser("svc@smackinsnacks.com", "service_role", "insert into public.kv_status (key, value) values ('pmac:last_sync', 'ok'); update public.kv_status set value = 'ok2' where key = 'pmac:last_sync';");
  eq(count("") === beforeBeat, "heartbeat writes no trail rows");
  asUser("troy@smackinsnacks.com", "authenticated", "insert into public.kv_status (key, value) values ('plant-note', 'hello');");
  eq(count("table_name = 'kv_status'") === 1, "other kv rows are kept");

  asUser("", "anon", "insert into public.items (id, code, name) values ('BAG4-S01', 'B4-S01', 'OG');");
  var anon = psql("smackin_audit_proof", "copy (select actor_role || '|' || coalesce(user_email, '') from public.audit_log where table_name = 'items') to stdout;");
  eq(anon.trim() === "anon|", "anon write shows as anon " + JSON.stringify(anon.trim()));

  psql("smackin_audit_proof", "create table public.future_widget (id int primary key, name text); insert into public.future_widget values (1, 'n');");
  eq(count("table_name = 'future_widget'") === 1, "future table is audited");

  var denied = cp.spawnSync("sudo", ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-d", "smackin_audit_proof", "-c", "set role anon; update public.audit_log set note = 'nope';"], { encoding: "utf8" });
  eq(denied.status !== 0, "anon cannot update the trail");
  var deniedAuth = cp.spawnSync("sudo", ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-d", "smackin_audit_proof", "-c", "grant usage on schema public to authenticated; set role authenticated; delete from public.audit_log;"], { encoding: "utf8" });
  eq(deniedAuth.status !== 0, "authenticated cannot delete the trail");
  var readerRead = psql("smackin_audit_proof", "grant usage on schema public to erp_reader; set role erp_reader; select count(*) from public.audit_log;");
  eq(/[0-9]/.test(readerRead), "erp_reader can read the trail");
  var readerWrite = cp.spawnSync("sudo", ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-d", "smackin_audit_proof", "-c", "set role erp_reader; insert into public.audit_log (table_name, action) values ('items', 'insert');"], { encoding: "utf8" });
  eq(readerWrite.status !== 0, "erp_reader cannot insert the trail");

  psql("postgres", "drop database if exists smackin_audit_proof;");
}

try {
  prove();
} catch (e) {
  fail.push(e.message || String(e));
}

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("ok audit log");
