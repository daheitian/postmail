/**
 * Storage Driver Abstraction
 *
 * Provides a common interface for file storage with R2 and S3-compatible backends.
 */

import type { Bindings } from "../types.js";

/**
 * Common interface for storage operations.
 *
 * Both R2 and S3-compatible drivers implement this interface,
 * allowing the rest of the application to be storage-agnostic.
 */
export interface StorageDriver {
  /** Upload a file to storage */
  put(
    key: string,
    body: ReadableStream | Uint8Array,
    opts?: { contentType?: string },
  ): Promise<void>;

  /** Retrieve a file from storage. Returns null if not found. */
  get(
    key: string,
  ): Promise<{ body: ReadableStream; contentType?: string } | null>;

  /** Delete a file from storage */
  delete(key: string): Promise<void>;
}

/**
 * Creates an R2 storage driver that delegates to a Cloudflare R2 bucket binding.
 *
 * @param r2 - The R2 bucket binding from the Cloudflare Workers environment
 * @returns A StorageDriver backed by R2
 */
export function createR2Driver(r2: R2Bucket): StorageDriver {
  return {
    async put(key, body, opts) {
      await r2.put(key, body, {
        httpMetadata: opts?.contentType
          ? { contentType: opts.contentType }
          : undefined,
      });
    },

    async get(key) {
      const object = await r2.get(key);
      if (!object) return null;
      return {
        body: object.body,
        contentType: object.httpMetadata?.contentType ?? undefined,
      };
    },

    async delete(key) {
      await r2.delete(key);
    },
  };
}

/**
 * Configuration for the S3-compatible storage driver.
 */
export interface S3DriverConfig {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

/** Constructor for an S3 command object */
interface S3CommandCtor<TInput> {
  new (input: TInput): unknown;
}

/** Input for PutObject */
interface PutObjectInput {
  Bucket: string;
  Key: string;
  Body: Uint8Array;
  ContentType?: string;
}

/** Input for GetObject / DeleteObject */
interface ObjectKeyInput {
  Bucket: string;
  Key: string;
}

/** Subset of GetObjectOutput used by the S3 driver */
interface S3GetObjectOutput {
  Body?: { transformToWebStream(): ReadableStream };
  ContentType?: string;
}

/** Lazy-loaded S3 client bundle */
interface S3ClientBundle {
  send: (command: unknown) => Promise<unknown>;
  PutObjectCommand: S3CommandCtor<PutObjectInput>;
  GetObjectCommand: S3CommandCtor<ObjectKeyInput>;
  DeleteObjectCommand: S3CommandCtor<ObjectKeyInput>;
  bucket: string;
}

/**
 * Creates an S3-compatible storage driver using the AWS SDK.
 *
 * Supports any S3-compatible service: AWS S3, Backblaze B2, MinIO, etc.
 * Uses path-style addressing for non-AWS endpoints.
 *
 * @param config - S3 connection configuration
 * @returns A StorageDriver backed by S3
 */
export function createS3Driver(config: S3DriverConfig): StorageDriver {
  // Lazy-load the AWS SDK to avoid bundling it when using R2
  let clientPromise: Promise<S3ClientBundle> | null = null;

  function getClient() {
    if (!clientPromise) {
      clientPromise = import("@aws-sdk/client-s3").then((sdk) => {
        const forcePathStyle = !config.endpoint.includes("amazonaws.com");
        const client = new sdk.S3Client({
          endpoint: config.endpoint,
          region: config.region,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
          forcePathStyle,
        });
        return {
          send: (cmd: unknown) => client.send(cmd as never),
          PutObjectCommand: sdk.PutObjectCommand,
          GetObjectCommand: sdk.GetObjectCommand,
          DeleteObjectCommand: sdk.DeleteObjectCommand,
          bucket: config.bucket,
        };
      });
    }
    return clientPromise;
  }

  return {
    async put(key, body, opts) {
      const s3 = await getClient();

      // Buffer the stream to Uint8Array for the S3 SDK
      let bodyBytes: Uint8Array;
      if (body instanceof Uint8Array) {
        bodyBytes = body;
      } else {
        const reader = body.getReader();
        const chunks: Uint8Array[] = [];
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        let totalLength = 0;
        for (const chunk of chunks) totalLength += chunk.length;
        bodyBytes = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          bodyBytes.set(chunk, offset);
          offset += chunk.length;
        }
      }

      const command = new s3.PutObjectCommand({
        Bucket: s3.bucket,
        Key: key,
        Body: bodyBytes,
        ContentType: opts?.contentType,
      });
      await s3.send(command);
    },

    async get(key) {
      const s3 = await getClient();
      try {
        const command = new s3.GetObjectCommand({
          Bucket: s3.bucket,
          Key: key,
        });
        const response = (await s3.send(command)) as S3GetObjectOutput;
        if (!response.Body) return null;
        return {
          body: response.Body.transformToWebStream(),
          contentType: response.ContentType ?? undefined,
        };
      } catch (err: unknown) {
        // NoSuchKey → return null instead of throwing
        if (
          err instanceof Error &&
          (err.name === "NoSuchKey" || err.name === "NotFound")
        ) {
          return null;
        }
        throw err;
      }
    },

    async delete(key) {
      const s3 = await getClient();
      const command = new s3.DeleteObjectCommand({
        Bucket: s3.bucket,
        Key: key,
      });
      await s3.send(command);
    },
  };
}

/**
 * Creates the appropriate storage driver based on environment configuration.
 *
 * Returns `null` if no storage is configured (no R2 binding and no S3 config).
 *
 * @param env - The Cloudflare Workers environment bindings
 * @returns A StorageDriver instance or null
 *
 * @example
 * ```ts
 * const storage = createStorageDriver(c.env);
 * if (storage) {
 *   await storage.put("media/file.jpg", stream, { contentType: "image/jpeg" });
 * }
 * ```
 */
export function createStorageDriver(env: Bindings): StorageDriver | null {
  const driver = env.STORAGE_DRIVER || "r2";

  if (driver === "s3") {
    if (
      !env.S3_ENDPOINT ||
      !env.S3_BUCKET ||
      !env.S3_ACCESS_KEY_ID ||
      !env.S3_SECRET_ACCESS_KEY
    ) {
      return null;
    }
    return createS3Driver({
      endpoint: env.S3_ENDPOINT,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      region: env.S3_REGION || "auto",
    });
  }

  // Default: R2
  if (!env.R2) return null;
  return createR2Driver(env.R2);
}
