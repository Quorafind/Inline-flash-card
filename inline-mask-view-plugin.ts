import {
	Decoration,
	DecorationSet,
	EditorView,
	MatchDecorator,
	PluginSpec,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
	WidgetType
} from "@codemirror/view";
import { editorInfoField, editorLivePreviewField, HoverPopover, MarkdownRenderer, setIcon, setTooltip } from "obsidian";
import MyPlugin from "./main";

interface DecoSpec {
	widget?: InlineMaskWidget;
}

function createSpan() {
	return createEl("span");
}

function updateHoverSpan(span: HTMLElement, text: string) {
	span.toggleClass('inline-card', true);
	const iconEl = span.createEl("span", {cls: "inline-card-icon"});
	span.createEl("span", {cls: "inline-card-mask", text: 'Card'});

	setIcon(iconEl, "venetian-mask");
}

function updateInputSpan(span: HTMLElement, text: string) {
	span.toggleClass('inline-card', true);
	const iconEl = span.createEl("span", {cls: "inline-input-icon"});
	setIcon(iconEl, "pencil");

	const inputEl = span.createEl("input", {cls: "inline-input-mask", placeholder: 'input answer'});
	inputEl.onclick = (ev) => {
		ev.preventDefault();
		ev.stopPropagation();
		inputEl.focus();
	};

	const correctIconEl = span.createEl("span", {cls: "inline-input-correct-icon"});

	inputEl.oninput = (ev) => {
		const value = (<HTMLInputElement>ev.target).value;
		console.log(value);
		if (value === '') {
			inputEl.placeholder = 'input answer';
			correctIconEl.empty();
		} else if (value === text.replace('>>', '').replace('<<', '')) {
			inputEl.placeholder = 'correct!';
			correctIconEl.empty();
			setIcon(correctIconEl, 'check');
		} else {
			inputEl.placeholder = 'wrong!';
			correctIconEl.empty();
			setIcon(correctIconEl, 'cross');
		}
	};
}

class InlineMaskWidget extends WidgetType {
	public error = false;
	private container: HTMLElement = createSpan();

	constructor(
		public readonly view: EditorView,
		public readonly plugin: MyPlugin,
		public readonly href: string,
		public readonly to: number,
	) {
		super();

		if (href.startsWith(':')) {
			updateHoverSpan(this.container, href);

			this.container.onclick = (ev) => {
				ev.preventDefault();
				this.view.dispatch({
					selection: {
						anchor: this.to - 2,
						head: this.to - 2,
					}
				});
			};

			this.container.onmouseover = (ev) => {
				if (!ev.ctrlKey && !ev.metaKey) return;
				const hoverPopover = new HoverPopover(
					<any>this.view,
					<HTMLElement>ev.target,
					100,
				);

				const field = this.view.state.field(editorInfoField);

				hoverPopover.hoverEl.toggleClass("inline-mask-card-popover", true);
				MarkdownRenderer.render(
					this.plugin.app,
					href.replace(/::/g, ""),
					hoverPopover.hoverEl,
					<string>field?.file?.path,
					hoverPopover,
				);

				const embeds =
					hoverPopover.hoverEl?.querySelectorAll(".internal-link");
				embeds?.forEach((embed) => {
					const el = embed as HTMLAnchorElement;
					const href = el.getAttribute("data-href");
					if (!href) return;

					const destination = field.app.metadataCache.getFirstLinkpathDest(
						href,
						<string>field?.file?.path,
					);
					if (!destination) embed.classList.add("is-unresolved");

					this.plugin.registerDomEvent(el, "mouseover", (e) => {
						e.stopPropagation();
						field.app.workspace.trigger("hover-link", {
							event: e,
							source: "markdown",
							hoverParent: hoverPopover.hoverEl,
							targetEl: el,
							linktext: href,
							sourcePath: el.href,
						});
					});
				});
			};
		} else {
			updateInputSpan(this.container, href);

			this.container.ondblclick = (ev) => {
				ev.preventDefault();
				this.view.dispatch({
					selection: {
						anchor: this.to - 2,
						head: this.to - 2,
					}
				});
			};
		}
	}

	eq(widget: WidgetType): boolean {
		return (widget as InlineMaskWidget).href === this.href;
	}

	toDOM(): HTMLElement {
		return this.container;
	}
}

export function createInlineMaskViewPlugin(_plugin: MyPlugin) {
	class InlineViewPluginValue implements PluginValue {
		public readonly view: EditorView;
		private readonly match = new MatchDecorator({
			regexp: /(:{2}(.*?):{2}|>{2}(.*?)<{2})/g,
			decorate: (add, from: number, to: number, match: RegExpExecArray, view: EditorView) => {
				const shouldRender = this.shouldRender(view, from, to);
				if (shouldRender) {
					add(
						from,
						to,
						Decoration.replace({
							widget: new InlineMaskWidget(view, _plugin, match[0], to),
						}),
					);
				}
			},
		});
		decorations: DecorationSet = Decoration.none;

		constructor(view: EditorView) {
			this.view = view;
			this.updateDecorations(view);
		}

		update(update: ViewUpdate): void {
			this.updateDecorations(update.view, update);
		}

		destroy(): void {
			this.decorations = Decoration.none;
		}

		updateDecorations(view: EditorView, update?: ViewUpdate) {
			if (!update || this.decorations.size === 0) {
				this.decorations = this.match.createDeco(view);
			} else {
				this.decorations = this.match.updateDeco(update, this.decorations);
			}
		}

		isLivePreview(state: EditorView["state"]): boolean {
			return state.field(editorLivePreviewField);
		}

		shouldRender(view: EditorView, decorationFrom: number, decorationTo: number) {
			const overlap = view.state.selection.ranges.some((r) => {
				if (r.from <= decorationFrom) {
					return r.to >= decorationFrom;
				} else {
					return r.from <= decorationTo;
				}
			});
			return !overlap && this.isLivePreview(view.state);
		}
	}

	const InlineViewPluginSpec: PluginSpec<InlineViewPluginValue> = {
		decorations: (plugin) => {
			// Update and return decorations for the CodeMirror view

			return plugin.decorations.update({
				filter: (rangeFrom: number, rangeTo: number, deco: Decoration) => {
					const widget = (deco.spec as DecoSpec).widget;
					if (widget && widget.error) {
						console.log("GOT WIDGET ERROR");
						return false;
					}
					// Check if the range is collapsed (cursor position)
					return (
						rangeFrom === rangeTo ||
						// Check if there are no overlapping selection ranges
						!plugin.view.state.selection.ranges.filter((selectionRange: { from: number; to: number; }) => {
							// Determine the start and end positions of the selection range
							const selectionStart = selectionRange.from;
							const selectionEnd = selectionRange.to;

							// Check if the selection range overlaps with the specified range
							if (selectionStart <= rangeFrom) {
								return selectionEnd >= rangeFrom; // Overlapping condition
							} else {
								return selectionStart <= rangeTo; // Overlapping condition
							}
						}).length
					);
				},
			});
		},
	};

	return ViewPlugin.fromClass(InlineViewPluginValue, InlineViewPluginSpec);
}
