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
import "./lib/nav-reorder.js";
import "./lib/collections-reorder.js";

// Lit Web Components
import "./ui/components/jant-compose-dialog.js";
import "./ui/components/jant-compose-editor.js";
import "./lib/compose-bridge.js";
import "./ui/components/jant-settings-general.js";
import "./ui/components/jant-settings-avatar.js";
import "./lib/settings-bridge.js";
