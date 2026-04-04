import type { AppConfig } from "../types/config.js";
import type { Media } from "../types.js";
import { toApiAttachment } from "./api-posts.js";

export type ApiMediaResponse =
  | (Omit<Media, "storageKey" | "posterKey"> & {
      type: "media";
      url: string;
      previewUrl: string;
      posterUrl: string | null;
    })
  | (Omit<Media, "storageKey" | "posterKey"> & {
      type: "text";
      contentFormat: "markdown";
      contentUrl: string;
    });

export function toApiMedia(
  media: Media,
  appConfig: Pick<
    AppConfig,
    | "imageTransformUrl"
    | "localPublicUrl"
    | "r2PublicUrl"
    | "s3PublicUrl"
    | "sitePathPrefix"
  >,
): ApiMediaResponse {
  const { posterKey: _posterKey, storageKey: _storageKey, ...rest } = media;
  const attachment = toApiAttachment(
    media,
    appConfig.r2PublicUrl,
    appConfig.imageTransformUrl,
    appConfig.s3PublicUrl,
    appConfig.localPublicUrl,
    appConfig.sitePathPrefix,
  );

  if (attachment.type === "text") {
    return {
      ...rest,
      type: "text",
      contentFormat: attachment.contentFormat,
      contentUrl: attachment.contentUrl,
    };
  }

  return {
    ...rest,
    type: "media",
    url: attachment.url,
    previewUrl: attachment.previewUrl,
    posterUrl: attachment.posterUrl,
  };
}
