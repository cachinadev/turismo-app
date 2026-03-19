#!/usr/bin/env node
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const connectDB = require("../src/config/db");
const Package = require("../src/models/Package");

const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");
const uploadsRoot = path.join(__dirname, "..", "public", "uploads");

function normalizeUploadsPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (raw.startsWith("/uploads/")) return raw;

  try {
    const parsed = new URL(raw);
    if (parsed.pathname.startsWith("/uploads/")) return parsed.pathname;
  } catch {
    // ignore invalid URLs
  }

  return null;
}

function walkFiles(dir, baseDir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absPath, baseDir, out);
      continue;
    }
    if (!entry.isFile()) continue;

    const relToUploads = path.relative(baseDir, absPath).split(path.sep).join("/");
    out.push({
      absPath,
      relativePath: `/uploads/${relToUploads}`,
      size: fs.statSync(absPath).size,
    });
  }

  return out;
}

async function collectReferencedPaths() {
  const packages = await Package.find({})
    .select("media.url brochurePdf.url brochurePdf.relativePath")
    .lean();

  const referenced = new Set();
  for (const pkg of packages) {
    for (const media of pkg.media || []) {
      const mediaPath = normalizeUploadsPath(media?.url);
      if (mediaPath) referenced.add(mediaPath);
    }

    const brochureRelative = normalizeUploadsPath(pkg?.brochurePdf?.relativePath);
    if (brochureRelative) referenced.add(brochureRelative);

    const brochureUrl = normalizeUploadsPath(pkg?.brochurePdf?.url);
    if (brochureUrl) referenced.add(brochureUrl);
  }

  return referenced;
}

async function main() {
  await connectDB();

  const referenced = await collectReferencedPaths();
  const existingFiles = walkFiles(uploadsRoot, uploadsRoot);
  const orphaned = existingFiles.filter((file) => !referenced.has(file.relativePath));

  const totalBytes = orphaned.reduce((sum, file) => sum + file.size, 0);

  console.log(`Scanned ${existingFiles.length} upload files.`);
  console.log(`Found ${referenced.size} referenced upload paths.`);
  console.log(`Found ${orphaned.length} orphaned files (${totalBytes} bytes).`);

  if (VERBOSE || !APPLY) {
    for (const file of orphaned) {
      console.log(`${APPLY ? "DELETE" : "DRY"} ${file.relativePath} (${file.size} bytes)`);
    }
  }

  if (!APPLY) {
    console.log("Dry run only. Re-run with --apply to delete orphaned files.");
    return;
  }

  let deleted = 0;
  for (const file of orphaned) {
    fs.unlinkSync(file.absPath);
    deleted += 1;
  }

  console.log(`Deleted ${deleted} orphaned files.`);
}

main()
  .catch((error) => {
    console.error("cleanup-uploads failed:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await connectDB.disconnectDB?.();
    } catch {
      // ignore disconnect failures on exit
    }
  });
