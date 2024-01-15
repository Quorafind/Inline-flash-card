import {
	App,
	debounce,
	editorInfoField,
	HoverPopover,
	MarkdownPostProcessorContext,
	MarkdownRenderer,
	setIcon
} from "obsidian";
import { createPopover, updateHoverSpan, updateInputSpan } from "./inline-flash-card-plugin";
import InlineFlashCardPlugin from "./main";
import { EditorView } from "@codemirror/view";

interface HighlightRule {
	regexMode: string;
	regexPattern: string;
	creator: ReplacementElementCreator;
}

type ReplacementElementCreator = ({matchedText, ctx, plugin}: {
	matchedText: string, plugin: InlineFlashCardPlugin, ctx: MarkdownPostProcessorContext
}) => HTMLElement;


// export const debounceHover = debounce((plugin: InlineFlashCardPlugin, path: string, ev: MouseEvent, content: string) => {
// 	createReadModePopover(plugin, path, ev, content);
// }, 200, true);

export function createReadModePopover(plugin: InlineFlashCardPlugin, path: string, ev: MouseEvent, content: string) {

	const hoverPopover = new HoverPopover(
		<any>plugin.app,
		<HTMLElement>ev.target,
		100,
	);

	hoverPopover.hoverEl.toggleClass("inline-mask-card-popover", true);
	MarkdownRenderer.render(
		plugin.app,
		content.replace(/::/g, ""),
		hoverPopover.hoverEl,
		<string>path,
		hoverPopover,
	);

	const embeds =
		hoverPopover.hoverEl?.querySelectorAll(".internal-link");
	embeds?.forEach((embed) => {
		const el = embed as HTMLAnchorElement;
		const href = el.getAttribute("data-href");
		if (!href) return;

		const destination = plugin.app.metadataCache.getFirstLinkpathDest(
			href,
			<string>path,
		);
		if (!destination) embed.classList.add("is-unresolved");

		plugin.registerDomEvent(el, "mouseover", (e) => {
			e.stopPropagation();
			plugin.app.workspace.trigger("hover-link", {
				event: e,
				source: "markdown",
				hoverParent: hoverPopover.hoverEl,
				targetEl: el,
				linktext: href,
				sourcePath: el.href,
			});
		});
	});
}

function createHoverSpan(
	word: string,
	plugin: InlineFlashCardPlugin,
	ctx: MarkdownPostProcessorContext
) {

	const parentEl = createEl('span');
	parentEl.toggleClass('read-mode', true);
	parentEl.setAttribute('data-href', word);
	parentEl.setAttribute('data-path', ctx.sourcePath);

	updateHoverSpan(parentEl, word);

	return parentEl;
}

function createInputSpan(
	word: string
) {
	const parentEl = createEl('span');
	parentEl.toggleClass('input-mode', true);
	parentEl.setAttribute('data-href', word);


	updateInputSpan(parentEl, word);

	return parentEl;
}


export function highlightTextInElement({plugin, element, rules, ctx}: {
	plugin: InlineFlashCardPlugin, element: HTMLElement, rules: HighlightRule[], ctx: MarkdownPostProcessorContext
}) {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	let node;

	const nodesToProcess: Node[] = [];
	while ((node = walker.nextNode())) {
		nodesToProcess.push(node);
	}

	nodesToProcess.forEach((node) => {
		replaceTextWithElements(plugin, ctx, node, rules);
	});
}

function isInsidePre(node: Node) {
	let current = node;
	while (current && current.parentNode) {
		if (current.parentNode.nodeName === 'PRE') {
			return true;
		}
		current = current.parentNode;
	}
	return false;
}

export const rules: HighlightRule[] = [
	{
		regexMode: 'gu',
		regexPattern: ':{2}([^:\\[\\]]*?):{2}',
		creator: ({matchedText, ctx, plugin}) => {
			const targetString = matchedText.replace(/::/g, '');


			return createHoverSpan(targetString, plugin, ctx);
		}
	},
	{
		regexMode: 'gu',
		regexPattern: '>{2}(.*?)<{2}',
		creator: ({matchedText, ctx, plugin}) => {
			const targetString = matchedText.replace(/>>/g, '').replace(/<</g, '');

			return createInputSpan(targetString);
		}
	},
];


function replaceTextWithElements(plugin: InlineFlashCardPlugin, ctx: MarkdownPostProcessorContext, node: Node, rules: HighlightRule[]) {
	if (node.nodeType === Node.TEXT_NODE && !isInsidePre(node)) {
		let textContent = node.textContent || "";

		rules.forEach((rule) => {
			let newTextContent = "";
			let match;
			const regex = new RegExp(rule.regexPattern, rule.regexMode);
			let lastIndex = 0;


			while ((match = regex.exec(textContent)) !== null) {
				const part = match[0];

				const precedingText = textContent.substring(lastIndex, match.index);
				newTextContent += precedingText;

				const replacementElement = rule.creator({
					matchedText: part, plugin, ctx
				});
				newTextContent += `<span data-replace>${replacementElement.outerHTML}</span>`;
				lastIndex = regex.lastIndex;
			}

			newTextContent += textContent.substring(lastIndex);
			textContent = newTextContent;
		});

		const parser = new DOMParser();
		const doc = parser.parseFromString(textContent, "text/html");

		Array.from(doc.body.childNodes).forEach((newNode) => {
			if (newNode.nodeName === "#text") {
				node.parentNode?.insertBefore(newNode.cloneNode(true), node);
				return;
			}

			if (newNode.nodeName === "SPAN" && (newNode as Element).getAttribute("data-replace") === "") {
				Array.from(newNode.childNodes).forEach((child) => {
					const childNode = child.cloneNode(true);
					node.parentNode?.insertBefore(childNode, node);
					console.log(childNode);
					if (child && (childNode as HTMLElement).className && (childNode as HTMLElement).className.contains('input-mode')) {
						(childNode as HTMLElement).find('input').oninput = (ev) => {
							const value = (<HTMLInputElement>ev.target).value;
							const content = (childNode as HTMLElement).getAttribute('data-href');
							if (value === '') {
								(childNode as HTMLElement).find('.inline-input-correct-icon').empty();
							} else if (value === (content || '').replace('>>', '').replace('<<', '')) {
								(childNode as HTMLElement).find('.inline-input-correct-icon').empty();
								setIcon((childNode as HTMLElement).find('.inline-input-correct-icon'), 'check');
							} else {
								(childNode as HTMLElement).find('.inline-input-correct-icon').empty();
								setIcon((childNode as HTMLElement).find('.inline-input-correct-icon'), 'cross');
							}
						};
					}
				});

			} else {
				console.log(newNode);
				node.parentNode?.insertBefore(newNode.cloneNode(true), node);
			}
		});

		node.parentNode?.removeChild(node);
	}
}
