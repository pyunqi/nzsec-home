'use strict';

/**
 * db.js — unified data access layer
 *
 * If SUPABASE_URL + SUPABASE_SERVICE_KEY are set (production / Netlify),
 * reads and writes go to a Supabase `settings` table (key/value jsonb).
 *
 * Otherwise falls back to the local JSON files in data/ (local dev).
 */

const path = require('path');
const fs   = require('fs');

const CONTENT_PATH = path.join(__dirname, '../data/content.json');
const PAGES_PATH   = path.join(__dirname, '../data/pages.json');

// ---- Local file fallback ----

function readFileSync(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeFileSync(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

// ---- Supabase client (lazy init) ----

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return supabase;
}

async function sbRead(key) {
  const db = getSupabase();
  const { data, error } = await db
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error) throw new Error(`Supabase read '${key}': ${error.message}`);
  return data.value;
}

async function sbWrite(key, value) {
  const db = getSupabase();
  const { error } = await db
    .from('settings')
    .upsert({ key, value });
  if (error) throw new Error(`Supabase write '${key}': ${error.message}`);
}

// ---- Public API (always async) ----

async function readContent() {
  if (!getSupabase()) return readFileSync(CONTENT_PATH);
  return sbRead('content');
}

async function writeContent(value) {
  if (!getSupabase()) return writeFileSync(CONTENT_PATH, value);
  return sbWrite('content', value);
}

async function readPages() {
  if (!getSupabase()) return readFileSync(PAGES_PATH);
  return sbRead('pages');
}

async function writePages(value) {
  if (!getSupabase()) return writeFileSync(PAGES_PATH, value);
  return sbWrite('pages', value);
}

module.exports = { readContent, writeContent, readPages, writePages };
