/**
 * Wrapping Input Rules (no auto-join)
 *
 * TipTap's built-in input rules for blockquote, bulletList, and orderedList
 * use `wrappingInputRule`, which auto-joins the newly wrapped node with a
 * same-type sibling immediately before it. That behavior matches CommonMark
 * semantics but conflicts with the WYSIWYG mental model in Jant's compose
 * editor, where TipTap JSON (not Markdown) is the canonical storage and
 * pressing Enter is a hard block break.
 *
 * This extension registers alternate input rules with the same regex as the
 * StarterKit defaults but without the join step, and runs at a higher priority
 * so its handler fires first. Since ProseMirror stops after the first rule
 * that returns a transaction, the StarterKit versions never see the input.
 *
 * Result: typing `> `, `- `/`* `, or `1. ` at the start of a paragraph wraps
 * only that paragraph, matching the behavior of the slash command and the
 * bubble menu's toggleBlockquote / toggleBulletList / toggleOrderedList.
 */

import { Extension, InputRule, callOrReturn } from "@tiptap/core";
import type { ExtendedRegExpMatchArray } from "@tiptap/core";
import type { NodeType } from "@tiptap/pm/model";
import { findWrapping } from "@tiptap/pm/transform";

interface WrappingRuleConfig {
  find: RegExp;
  type: NodeType;
  getAttributes?: (match: ExtendedRegExpMatchArray) => Record<string, unknown>;
}

/**
 * Variant of TipTap's `wrappingInputRule` that never joins with the preceding
 * sibling of the same type. The wrapping transaction is otherwise identical.
 */
function wrappingInputRuleNoJoin(config: WrappingRuleConfig): InputRule {
  return new InputRule({
    find: config.find,
    handler: ({ state, range, match }) => {
      const attributes =
        callOrReturn(config.getAttributes, undefined, match) || {};
      const tr = state.tr.delete(range.from, range.to);
      const $start = tr.doc.resolve(range.from);
      const blockRange = $start.blockRange();
      const wrapping =
        blockRange && findWrapping(blockRange, config.type, attributes);

      if (!wrapping) return null;

      tr.wrap(blockRange, wrapping);
      // Intentionally no join-with-previous step: each wrapped block stays
      // independent so the editor reflects the user's block-level intent.
    },
  });
}

export const WrappingInputRules = Extension.create({
  name: "wrappingInputRules",

  // Must run before StarterKit's Blockquote/BulletList/OrderedList (priority 100)
  // so this extension's rules handle the input first and the built-ins never
  // see it. See ExtensionManager.plugins — higher priority = earlier plugin.
  priority: 1000,

  addInputRules() {
    const { schema } = this.editor;
    const rules: InputRule[] = [];

    const blockquote = schema.nodes.blockquote;
    if (blockquote) {
      rules.push(
        wrappingInputRuleNoJoin({
          find: /^\s*>\s$/,
          type: blockquote,
        }),
      );
    }

    const bulletList = schema.nodes.bulletList;
    if (bulletList) {
      rules.push(
        wrappingInputRuleNoJoin({
          find: /^\s*([-+*])\s$/,
          type: bulletList,
        }),
      );
    }

    const orderedList = schema.nodes.orderedList;
    if (orderedList) {
      rules.push(
        wrappingInputRuleNoJoin({
          find: /^(\d+)\.\s$/,
          type: orderedList,
          getAttributes: (match) => ({ start: Number(match[1]) }),
        }),
      );
    }

    return rules;
  },
});
