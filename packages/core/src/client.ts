/**
 * Client-side JavaScript entry point
 *
 * Bundles all interactive components:
 * - Datastar (reactivity)
 * - BaseCoat (dialogs, dropdowns)
 * - ImageProcessor (media uploads)
 */

import "./vendor/datastar.js";
import "basecoat-css/all";
import "./client/image-processor.js";
import "./client/media-upload.js";
import "./client/avatar-upload.js";

// Lit Web Components (and their bridge modules)
import "./client/components/jant-compose-dialog.js";
import "./client/components/jant-compose-editor.js";
import "./client/compose-bridge.js";
import "./client/components/jant-settings-general.js";
import "./client/components/jant-settings-avatar.js";
import "./client/settings-bridge.js";
import "./client/components/jant-collection-form.js";
import "./client/components/jant-collection-sidebar.js";
import "./client/collection-form-bridge.js";
import "./client/components/jant-post-form.js";
import "./client/post-form-bridge.js";
import "./client/page-slug-bridge.js";
import "./client/components/jant-nav-manager.js";
import "./client/nav-manager-bridge.js";
import "./client/components/jant-media-lightbox.js";
