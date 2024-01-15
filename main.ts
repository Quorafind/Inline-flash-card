import { Plugin } from 'obsidian';
import { createInlineMaskViewPlugin } from "./inline-flash-card-plugin";

const inlineHoverPopover = "inline-flash-card:card-preview";

export default class InlineFlashCardPlugin extends Plugin {

	async onload() {
		this.registerEditorExtension([createInlineMaskViewPlugin(this)]);
		this.registerCommands();
		// @ts-ignore
		this.app.workspace.registerHoverLinkSource(inlineHoverPopover, {display: 'Inline Mask', defaultMod: true});
	}

	registerCommands() {
		this.addCommand({
			id: 'create-inline-flash-card',
			name: 'Create inline flash card',
			editorCallback: (editor) => {
				if (editor.getSelection() === '') return;
				const hasBlankBefore = editor.getCursor().ch === 0 || editor.getRange({
					line: editor.getCursor().line,
					ch: editor.getCursor().ch - 1
				}, editor.getCursor()) === ' ';
				const hasBlankAfter = editor.getCursor().ch === editor.getLine(editor.getCursor().line).length || editor.getRange(editor.getCursor(), {
					line: editor.getCursor().line,
					ch: editor.getCursor().ch + 1
				}) === ' ';

				editor.replaceSelection(`${hasBlankBefore ? '' : ' '}::${editor.getSelection()}::${hasBlankAfter ? '' : ' '}`);
			}
		});

		this.addCommand({
			id: 'create-inline-input-flash-card',
			name: 'Create inline input flash card',
			editorCallback: (editor) => {
				if (editor.getSelection() === '') return;
				const hasBlankBefore = editor.getCursor().ch === 0 || editor.getRange({
					line: editor.getCursor().line,
					ch: editor.getCursor().ch - 1
				}, editor.getCursor()) === ' ';
				const hasBlankAfter = editor.getCursor().ch === editor.getLine(editor.getCursor().line).length || editor.getRange(editor.getCursor(), {
					line: editor.getCursor().line,
					ch: editor.getCursor().ch + 1
				}) === ' ';

				editor.replaceSelection(`${hasBlankBefore ? '' : ' '}>>${editor.getSelection()}<<${hasBlankAfter ? '' : ' '}`);
			}
		});
	}

	onunload() {

	}

}
