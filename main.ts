import { Plugin } from 'obsidian';
import { createInlineMaskViewPlugin } from "./inline-flash-card-plugin";

const inlineHoverPopover = "inline-flash-card:card-preview";

export default class InlineFlashCardPlugin extends Plugin {

	async onload() {
		this.registerEditorExtension([createInlineMaskViewPlugin(this)]);
		// @ts-ignore
		this.app.workspace.registerHoverLinkSource(inlineHoverPopover, {display: 'Inline Mask', defaultMod: true});
	}

	onunload() {

	}

}
