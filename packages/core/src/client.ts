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
import "./lib/image-processor.js";
import "./lib/media-upload.js";
import "./lib/avatar-upload.js";

// Lit Web Components (and their bridge modules)
import "./ui/components/jant-compose-dialog.js";
import "./ui/components/jant-compose-editor.js";
import "./lib/compose-bridge.js";
import "./ui/components/jant-settings-general.js";
import "./ui/components/jant-settings-avatar.js";
import "./lib/settings-bridge.js";
import "./ui/components/jant-collection-form.js";
import "./ui/components/jant-collection-sidebar.js";
import "./lib/collection-form-bridge.js";
import "./ui/components/jant-post-form.js";
import "./lib/post-form-bridge.js";
import "./ui/components/jant-nav-manager.js";
import "./lib/nav-manager-bridge.js";
import "./ui/components/jant-media-lightbox.js";
