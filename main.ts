import { Plugin } from 'obsidian';
import { createInlineMaskViewPlugin } from "./inline-flash-card-plugin";
import { createReadModePopover, highlightTextInElement, rules } from "./inline-flash-card-marker";

const inlineHoverPopover = "inline-flash-card:card-preview";

export default class InlineFlashCardPlugin extends Plugin {

	async onload() {
		this.registerEditorExtension([createInlineMaskViewPlugin(this)]);
		this.registerMarkdownPostProcessor((el, ctx) => {
			highlightTextInElement({
				plugin: this, element: el, rules, ctx: ctx
			});
		});
		this.registerCommands();
		// @ts-ignore
		this.app.workspace.registerHoverLinkSource(inlineHoverPopover, {display: 'Inline Mask', defaultMod: true});
		this.registerHoverEvents();
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

	registerHoverEvents() {
		this.registerDomEvent(document, 'mouseover', (e) => {
			if (!e.target) return;
			if (!(e.target as HTMLElement).closest('.read-mode.inline-card')) return;
			const parent = (e.target as HTMLElement).closest('.read-mode.inline-card');
			const content = parent?.getAttribute('data-href');
			const path = parent?.getAttribute('data-path');
			if (!content || !path) return;
			createReadModePopover(this, path, e, content);
		});
	}

	onunload() {

	}

}
