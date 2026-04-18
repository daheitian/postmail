/**
 * Static site client entry point (Hugo theme).
 *
 * Loaded on exported Hugo sites to enable reading-surface interactions —
 * media lightbox, feed video autoplay, audio waveform, and gallery scroll
 * hints. Does NOT include Datastar, auth, toast, or form plumbing; those
 * are runtime-only concerns for the authenticated app.
 */

import "./client/audio-player.js";
import "./client/feed-video-player.js";
import "./client/media-scroll-hint.js";
import "./client/site-header-nav.js";
import "./client/components/jant-media-lightbox.js";
import "./styles/site-media.css";
