#!/usr/bin/env node
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const connectDB = require("../src/config/db");
const Package = require("../src/models/Package");

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const VERBOSE = process.argv.includes("--verbose");

const uploadsRoot = path.join(__dirname, "..", "public", "uploads");
const variantsRoot = path.join(uploadsRoot, "variants");
const IMAGE_VARIANTS = [
  { key: "thumb", width: 480, quality: 72 },
  { key: "medium", width: 960, quality: 78 },
  { key: "large", width: 1600, quality: 84 },
];
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

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

function toAbsolute(base, relativePath) {
  if (!relativePath) return relativePath;
  return `${base}${relativePath}`;
}

function getBaseUrl() {
  return String(process.env.PUBLIC_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
}

function resolveUploadsFile(relativePath) {
  if (!relativePath || !relativePath.startsWith("/uploads/")) return null;
  return path.join(uploadsRoot, relativePath.replace(/^\/uploads\//, ""));
}

async function buildVariants(absPath, filenameBase) {
  const source = sharp(absPath, { failOnError: false }).rotate();
  const meta = await source.metadata();
  const width = Number(meta?.width) || undefined;
  const height = Number(meta?.height) || undefined;
  const variants = {};

  for (const variant of IMAGE_VARIANTS) {
    const outputName = `${filenameBase}-${variant.key}.webp`;
    const outputPath = path.join(variantsRoot, outputName);

    if (APPLY) {
      await source
        .clone()
        .resize({ width: variant.width, withoutEnlargement: true })
        .webp({ quality: variant.quality })
        .toFile(outputPath);
    }

    const probeMeta =
      APPLY || fs.existsSync(outputPath)
        ? await sharp(outputPath).metadata().catch(() => ({}))
        : {};
    const relativePath = `/uploads/variants/${outputName}`;
    variants[variant.key] = {
      url: toAbsolute(getBaseUrl(), relativePath),
      relativePath,
      width: Number(probeMeta?.width) || undefined,
      height: Number(probeMeta?.height) || undefined,
      format: "webp",
    };
  }

  return { width, height, variants };
}

function mediaNeedsBackfill(media) {
  if (!media || media.type !== "image") return false;
  if (FORCE) return true;

  const hasDims = Number.isFinite(Number(media.width)) && Number.isFinite(Number(media.height));
  const variants = media.variants || {};
  const hasAllVariants = IMAGE_VARIANTS.every((variant) => {
    const item = variants?.[variant.key];
    return item?.relativePath && fs.existsSync(resolveUploadsFile(item.relativePath));
  });

  return !(hasDims && hasAllVariants);
}

async function main() {
  ensureDir(variantsRoot);
  await connectDB();

  const base = getBaseUrl();
  const packages = await Package.find({}).select("title media").lean();

  let scanned = 0;
  let updatedPackages = 0;
  let updatedMedia = 0;

  for (const pkg of packages) {
    let packageChanged = false;
    const nextMedia = [];

    for (const media of pkg.media || []) {
      scanned += 1;

      if (!media || media.type !== "image") {
        nextMedia.push(media);
        continue;
      }

      const relativePath =
        normalizeUploadsPath(media.relativePath) || normalizeUploadsPath(media.url);
      const absPath = resolveUploadsFile(relativePath);
      const ext = path.extname(absPath || "").toLowerCase();

      if (!absPath || !fs.existsSync(absPath) || !IMAGE_EXT.has(ext)) {
        nextMedia.push(media);
        continue;
      }

      if (!mediaNeedsBackfill(media)) {
        nextMedia.push(media);
        continue;
      }

      const stem = path.parse(absPath).name;
      const derived = await buildVariants(absPath, stem);
      const merged = {
        ...media,
        relativePath,
        url: media.url && /^https?:\/\//i.test(media.url) ? media.url : toAbsolute(base, relativePath),
        ...(derived.width ? { width: derived.width } : {}),
        ...(derived.height ? { height: derived.height } : {}),
        variants: derived.variants,
      };

      nextMedia.push(merged);
      packageChanged = true;
      updatedMedia += 1;

      if (VERBOSE) {
        console.log(`${APPLY ? "BACKFILL" : "DRY"} ${pkg.title} :: ${relativePath}`);
      }
    }

    if (!packageChanged) continue;

    updatedPackages += 1;
    if (APPLY) {
      await Package.updateOne({ _id: pkg._id }, { $set: { media: nextMedia } });
    }
  }

  console.log(`Scanned ${scanned} media entries.`);
  console.log(`${APPLY ? "Updated" : "Would update"} ${updatedMedia} image entries across ${updatedPackages} packages.`);

  if (!APPLY) {
    console.log("Dry run only. Re-run with --apply to write variants and persist metadata.");
  }
}

main()
  .catch((error) => {
    console.error("backfill-image-variants failed:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await connectDB.disconnectDB?.();
    } catch {
      // ignore disconnect failures
    }
  });
