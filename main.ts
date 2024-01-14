import { Plugin } from 'obsidian';
import { createInlineMaskViewPlugin } from "./inline-mask-view-plugin";

const inlineHoverPopover = "inline-mask:card-preview";

export default class MyPlugin extends Plugin {

	async onload() {
		this.registerEditorExtension([createInlineMaskViewPlugin(this)]);
		this.app.workspace.registerHoverLinkSource(inlineHoverPopover, {display: 'Inline Mask', defaultMod: true});
	}

	onunload() {

	}

}
