/**
 * Client-side JavaScript entry point
 *
 * Bundles all interactive components:
 * - Datastar (reactivity)
 * - BaseCoat (dialogs, dropdowns)
 * - ImageProcessor (media uploads)
 */

import "./vendor/datastar.js";
import "./client/image-processor.js";
import "./client/avatar-upload.js";

// Lit Web Components (and their bridge modules)
import "./client/components/jant-compose-dialog.js";
import "./client/components/jant-compose-editor.js";
import "./client/components/jant-compose-fullscreen.js";

// Mount fullscreen overlay at body level to escape the dialog's containing block
// (dialog animation creates a containing block that traps position:fixed descendants)
document.body.appendChild(document.createElement("jant-compose-fullscreen"));
import "./client/compose-bridge.js";
import "./client/components/jant-settings-general.js";
import "./client/components/jant-settings-avatar.js";
import "./client/settings-bridge.js";
import "./client/components/jant-collection-form.js";
import "./client/components/jant-collection-sidebar.js";
import "./client/collection-form-bridge.js";
import "./client/components/jant-post-form.js";
import "./client/post-form-bridge.js";
import "./client/components/jant-nav-manager.js";
import "./client/nav-manager-bridge.js";
import "./client/audio-player.js";
import "./client/components/jant-media-lightbox.js";
import "./client/components/jant-text-preview.js";
import "./client/components/jant-post-menu.js";
import "./client/thread-context.js";
import "./client/archive-nav.js";
import "./client/site-header-nav.js";
