/**
 * In-place patching of MP4 track header (`tkhd`) flags.
 *
 * Mediabunny's MP4 muxer writes a non-zero `alternate_group` into every
 * `tkhd` box (video → 1, audio → 2). Per ISO-BMFF, a non-zero
 * `alternate_group` marks a track as one of several mutually exclusive
 * alternates. Safari's native `<video>` player reacts to this by never
 * auto-hiding the control bar during playback — the controls stay pinned.
 * ffmpeg writes 0 here; matching that restores normal control-bar behavior.
 */

/** ISO-BMFF container boxes that hold a `tkhd` somewhere below them. */
const CONTAINER_TYPES = new Set(["moov", "trak"]);

/**
 * Byte offset of the `alternate_group` field within a `tkhd` box, measured
 * from the start of the box. The field sits after the box header, the
 * version/flags word, the (version-sized) time/duration fields, the two
 * reserved words, and the 2-byte `layer` field.
 */
function alternateGroupOffset(version: number): number {
  // header(8) + version/flags(4) + variable middle + reserved(8) + layer(2):
  //   v0: creation(4) modification(4) trackID(4) reserved(4) duration(4) = 20
  //   v1: creation(8) modification(8) trackID(4) reserved(4) duration(8) = 32
  return 8 + 4 + (version === 1 ? 32 : 20) + 8 + 2;
}

/**
 * Zero the `alternate_group` field of every `tkhd` box in an MP4 buffer,
 * operating in place. Safe to call on any ISO-BMFF file; boxes without a
 * `tkhd` are left untouched.
 *
 * @param buffer - The MP4 file bytes. Mutated in place.
 * @example
 * zeroTrackAlternateGroups(mediabunnyOutput);
 */
export function zeroTrackAlternateGroups(buffer: ArrayBuffer): void {
  const view = new DataView(buffer);

  const walk = (start: number, end: number): void => {
    let pos = start;
    while (pos + 8 <= end) {
      let size = view.getUint32(pos);
      const type = String.fromCharCode(
        view.getUint8(pos + 4),
        view.getUint8(pos + 5),
        view.getUint8(pos + 6),
        view.getUint8(pos + 7),
      );
      if (size === 0) size = end - pos;
      if (size < 8 || pos + size > end) break;

      if (type === "tkhd") {
        const version = view.getUint8(pos + 8);
        const fieldOffset = pos + alternateGroupOffset(version);
        if (
          fieldOffset + 2 <= pos + size &&
          view.getUint16(fieldOffset) !== 0
        ) {
          view.setUint16(fieldOffset, 0);
        }
      } else if (CONTAINER_TYPES.has(type)) {
        walk(pos + 8, pos + size);
      }

      pos += size;
    }
  };

  walk(0, buffer.byteLength);
}
