#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";

const WEBP_QUALITY = 85;

function printUsage() {
  console.log(
    "Usage: node packages/core/dev/scripts/rewrite-snapshot-svg-webp.mjs --path <snapshot-dir> [--quality <1-100>] [--dry-run]",
  );
  console.log("");
  console.log(
    "Rewrite legacy SVG media objects in a site snapshot to WebP and keep db.sql + storage-manifest.json in sync.",
  );
}

function ensureString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function replaceExtension(path, extension) {
  if (/\.[^.\\/]+$/u.test(path)) {
    return path.replace(/\.[^.\\/]+$/u, extension);
  }
  return `${path}${extension}`;
}

function escapeSqlString(value) {
  return String(value).replaceAll("'", "''");
}

function splitSqlCsv(text) {
  const parts = [];
  let current = "";
  let inString = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    current += char;

    if (char === "'") {
      if (inString && text[index + 1] === "'") {
        current += "'";
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (char === "," && !inString) {
      parts.push(current.slice(0, -1).trim());
      current = "";
    }
  }

  const tail = current.trim();
  if (tail) {
    parts.push(tail);
  }

  return parts;
}

function parseSqlValue(token) {
  if (token === "NULL") {
    return null;
  }

  if (token.startsWith("'") && token.endsWith("'")) {
    return token.slice(1, -1).replaceAll("''", "'");
  }

  if (/^-?\d+$/u.test(token)) {
    return Number(token);
  }

  return token;
}

function serializeSqlValue(value) {
  if (value === null) {
    return "NULL";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite SQL number: ${value}`);
    }
    return String(value);
  }

  return `'${escapeSqlString(value)}'`;
}

function parseInsertLine(line) {
  const match = line.match(/^INSERT INTO "([^"]+)" \((.*)\) VALUES\((.*)\);$/u);
  if (!match) {
    return null;
  }

  const [, table, rawColumns, rawValues] = match;
  const columns = rawColumns
    .split(",")
    .map((column) => column.trim().replace(/^"|"$/gu, ""));
  const values = splitSqlCsv(rawValues).map(parseSqlValue);

  if (columns.length !== values.length) {
    throw new Error(`Column/value count mismatch in line: ${line}`);
  }

  return { table, columns, values };
}

function serializeInsertLine(statement) {
  const columns = statement.columns.map((column) => `"${column}"`).join(", ");
  const values = statement.values.map(serializeSqlValue).join(", ");
  return `INSERT INTO "${statement.table}" (${columns}) VALUES(${values});`;
}

function findColumnIndex(columns, columnName) {
  return columns.findIndex((column) => column === columnName);
}

function isSvgManifestObject(object) {
  if (typeof object?.contentType === "string" && object.contentType === "image/svg+xml") {
    return true;
  }

  return (
    typeof object?.key === "string" &&
    typeof object?.file === "string" &&
    /\.svg$/iu.test(object.key) &&
    /\.svg$/iu.test(object.file)
  );
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function convertSvgToWebp(filePath, quality) {
  const input = await readFile(filePath);
  const { data, info } = await sharp(input)
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });

  return {
    bytes: data,
    height: info.height ?? null,
    mimeType: "image/webp",
    sha256: sha256(data),
    size: info.size ?? data.length,
    width: info.width ?? null,
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
      path: { type: "string" },
      quality: { type: "string", default: String(WEBP_QUALITY) },
    },
  });

  if (values.help) {
    printUsage();
    return;
  }

  const inputPath = ensureString(values.path, "--path");
  const snapshotDir = resolve(process.cwd(), inputPath);
  const manifestPath = join(snapshotDir, "storage-manifest.json");
  const dbSqlPath = join(snapshotDir, "db.sql");
  const metaPath = join(snapshotDir, "meta.json");
  const dryRun = values["dry-run"] === true;
  const quality = Number(values.quality);

  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new Error("--quality must be an integer between 1 and 100.");
  }

  await Promise.all([
    readFile(metaPath, "utf8"),
    readFile(manifestPath, "utf8"),
    readFile(dbSqlPath, "utf8"),
  ]);

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.objects)) {
    throw new Error("Snapshot storage-manifest.json must contain an objects array.");
  }

  const dbSqlOriginal = await readFile(dbSqlPath, "utf8");
  const conversions = [];

  for (const object of manifest.objects) {
    if (!isSvgManifestObject(object)) {
      continue;
    }

    const oldKey = ensureString(object.key, "Manifest object key");
    const oldFile = ensureString(object.file, "Manifest object file");
    const absoluteOldFile = join(snapshotDir, oldFile);
    const converted = await convertSvgToWebp(absoluteOldFile, quality);
    const newKey = replaceExtension(oldKey, ".webp");
    const newFile = replaceExtension(oldFile, ".webp");
    const absoluteNewFile = join(snapshotDir, newFile);

    if (!dryRun) {
      await mkdir(dirname(absoluteNewFile), { recursive: true });
      await writeFile(absoluteNewFile, converted.bytes);
      if (absoluteNewFile !== absoluteOldFile) {
        await rm(absoluteOldFile, { force: true });
      }
    }

    conversions.push({
      newFile,
      newKey,
      oldFile,
      oldKey,
      ...converted,
    });
  }

  if (conversions.length === 0) {
    console.log(`No legacy SVG objects found in ${snapshotDir}.`);
    return;
  }

  const conversionsByOldKey = new Map(
    conversions.map((conversion) => [conversion.oldKey, conversion]),
  );
  const conversionsByNewKey = new Map(
    conversions.map((conversion) => [conversion.newKey, conversion]),
  );

  const updatedManifest = {
    ...manifest,
    objects: manifest.objects.map((object) => {
      const conversion = conversionsByOldKey.get(String(object.key));
      if (!conversion) {
        return object;
      }

      return {
        ...object,
        key: conversion.newKey,
        file: conversion.newFile,
        contentType: conversion.mimeType,
        size: conversion.size,
        sha256: conversion.sha256,
      };
    }),
  };

  let updatedDbSql = dbSqlOriginal;
  for (const conversion of conversions) {
    updatedDbSql = updatedDbSql.replaceAll(
      escapeSqlString(conversion.oldKey),
      escapeSqlString(conversion.newKey),
    );
  }

  const lines = updatedDbSql.split("\n");
  const rewrittenLines = lines.map((line) => {
    if (!line.startsWith('INSERT INTO "media" ')) {
      return line;
    }

    const statement = parseInsertLine(line);
    if (!statement || statement.table !== "media") {
      return line;
    }

    const storageKeyIndex = findColumnIndex(statement.columns, "storage_key");
    if (storageKeyIndex === -1) {
      return line;
    }

    const storageKey = statement.values[storageKeyIndex];
    if (typeof storageKey !== "string") {
      return line;
    }

    const conversion = conversionsByNewKey.get(storageKey);
    if (!conversion) {
      return line;
    }

    const filenameIndex = findColumnIndex(statement.columns, "filename");
    if (filenameIndex !== -1 && typeof statement.values[filenameIndex] === "string") {
      statement.values[filenameIndex] = replaceExtension(
        statement.values[filenameIndex],
        ".webp",
      );
    }

    const originalNameIndex = findColumnIndex(statement.columns, "original_name");
    if (
      originalNameIndex !== -1 &&
      typeof statement.values[originalNameIndex] === "string" &&
      /\.svg$/iu.test(statement.values[originalNameIndex])
    ) {
      statement.values[originalNameIndex] = replaceExtension(
        statement.values[originalNameIndex],
        ".webp",
      );
    }

    const mimeTypeIndex = findColumnIndex(statement.columns, "mime_type");
    if (mimeTypeIndex !== -1) {
      statement.values[mimeTypeIndex] = conversion.mimeType;
    }

    const sizeIndex = findColumnIndex(statement.columns, "size");
    if (sizeIndex !== -1) {
      statement.values[sizeIndex] = conversion.size;
    }

    const widthIndex = findColumnIndex(statement.columns, "width");
    if (widthIndex !== -1 && conversion.width !== null) {
      statement.values[widthIndex] = conversion.width;
    }

    const heightIndex = findColumnIndex(statement.columns, "height");
    if (heightIndex !== -1 && conversion.height !== null) {
      statement.values[heightIndex] = conversion.height;
    }

    return serializeInsertLine(statement);
  });

  updatedDbSql = rewrittenLines.join("\n");

  if (!dryRun) {
    await writeFile(
      manifestPath,
      `${JSON.stringify(updatedManifest, null, 2)}\n`,
      "utf8",
    );
    await writeFile(dbSqlPath, updatedDbSql, "utf8");
  }

  console.log(
    `${dryRun ? "Would rewrite" : "Rewrote"} ${conversions.length} SVG object${conversions.length === 1 ? "" : "s"} in ${snapshotDir}.`,
  );

  for (const conversion of conversions) {
    console.log(`- ${conversion.oldKey} -> ${conversion.newKey}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
