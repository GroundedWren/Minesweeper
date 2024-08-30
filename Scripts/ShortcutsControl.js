/**
 * @file A component to register and manage shortcuts
 * @author Vera Konigin vera@groundedwren.com
 * https://groundedwren.neocities.org
 */

window.GW = window.GW || {};
window.GW.Controls = window.GW.Controls || {};
(function Shortcuts(ns) {

	/** This creates the popover region for reporting shortcuts */
	window.addEventListener("load", function shortcutsControlOnLoad() {
		document.body.insertAdjacentHTML(
			"beforeend",
			`<aside id="asiGWShortcutsLive" aria-live="polite" style="display: contents;"></aside>`
		);
		ns.AsiShortcutsLive = document.getElementById("asiGWShortcutsLive");
	});

	/** Called as an event handler, this reports the shortcuts available to the current target element */
	ns.reportShortcuts = (event) => {
		if(event.target) {
			ns.reportShortcutsForEl(event.target);
		}
	};
	/** Reports the shortcuts available to the passed element */
	ns.reportShortcutsForEl = function reportShortcutsForEl(element) {
		let curEl = element;
		let shortsIndex = {};
		while(curEl) {
			if(curEl.tagName === "GW-SHORTCUTS") {
				for(attrObj of Object.values(curEl.attrMap)) {
					if(!shortsIndex[attrObj.CODE]) {
						shortsIndex[attrObj.CODE] = attrObj.INFO;
					}
				}
			}
			curEl = curEl.parentElement;
		}
		const popover = document.createElement("popover");
		popover.setAttribute("popover", "auto");
		if(!Object.keys(shortsIndex).length) {
			popover.innerHTML = "No shortcuts";
		}
		else {
			popover.innerHTML = `<table><caption>Shortcuts</caption><tbody>${Object.keys(shortsIndex).sort().map(
				CODE => `<tr><th scope="row">${CODE}</th><td>${shortsIndex[CODE]}</td></tr>`
			).join("")}</tbody></table>`;
		}

		ns.AsiShortcutsLive.innerHTML = "";
		ns.AsiShortcutsLive.appendChild(popover);
		popover.showPopover();
	}

	/**
	 * A custom element which enables shortcuts on all of its children
	 * There are three types of attributes which can be defined:
	 *   code - These are key sequences to activate a shortcut. E.g. "Alt+A"
	 *   handler - This is code to invoke for a shortcut.
	 *   info - This is a description of the shortcut to display to users.
	 * Each should be suffixed by an underscore and a number which associates the attributes together.
	 * E.g. <gw-shortcutscode_1="Alt+A" handler_1="alert('hi')" info_1="Says hello"></gw-shortcuts>
	 */
	ns.ShortcutsEl = class ShortcutsEl extends HTMLElement {
		//#region staticProperties
		static instanceCount = 0;
		static instanceMap = {};
		//#endregion

		//#region instance properties
		instanceId;
		initialized = false;
		shortcutMap = {};
		currentLevel = null;
		//#endregion

		constructor() {
			super();
			this.instanceId = ShortcutsEl.instanceCount++;
			ShortcutsEl.instanceMap[this.instanceId] = this;

			if(this.instanceId === 0) {
				document.head.insertAdjacentHTML("beforeend",`
					<style>
						gw-shortcuts {
							display: contents;
						}
					</style>
				`);
			}
		}
		
		get idKey() {
			return `gw-shortcuts-${this.instanceId}`;
		}

		connectedCallback() {
			if(!this.initialized) {
				this.registerShorts();

				const observer = new MutationObserver(() => this.registerShorts());
				observer.observe(this, {attributes: true, childList: false, subtree: false});

				this.addEventListener("keydown", this.onKeyDown);
				this.addEventListener("keyup", this.onKeyUp);

				this.initialized = true;
			}
		}

		registerShorts() {
			this.attrMap = {};
			this.getAttributeNames().reduce((map, attr) => {
				const attrPieces = attr.split("_");
				if(attrPieces.length === 2
					&& (
						attrPieces[0].toUpperCase() === "CODE"
						|| attrPieces[0].toUpperCase() === "HANDLER"
						|| attrPieces[0].toUpperCase() === "INFO"
					)
				) {
					map[attrPieces[1]] = map[attrPieces[1]] || {};
					map[attrPieces[1]][attrPieces[0].toUpperCase()] = this.getAttribute(attr);
				}
				return map;
			}, this.attrMap);

			this.shortcutMap = {};
			for (let shortObj of Object.values(this.attrMap)) {
				if(!shortObj.CODE || !shortObj.HANDLER) {
					continue;
				}

				let shortcutLevel = this.shortcutMap;
				for(let key of shortObj.CODE.toUpperCase().split("+")) {
					shortcutLevel = shortcutLevel[key] = shortcutLevel[key] || {};
				}

				if(shortcutLevel.ACTION) {
					console.log(`${this.idKey}: Double registered shortcut: ${shortObj.CODE}`);
				}
				else {
					shortcutLevel.ACTION = shortObj.HANDLER;
				}
			}
		}

		onKeyDown = (event) => {
			this.currentLevel = this.currentLevel || this.shortcutMap;
			let prevLevel = this.currentLevel;

			this.currentLevel = this.currentLevel[event.key.toUpperCase()];
			if(this.currentLevel?.ACTION) {
				const action = new Function(this.currentLevel.ACTION);
				action(event);
				this.currentLevel = prevLevel;
				event.stopPropagation();
				event.preventDefault();
			}
			else if(this.currentLevel && event.key !== "Alt" && event.key !== "Shift" && event.key !== "Control") {
				event.stopPropagation();
				event.preventDefault();
			}
		};

		onKeyUp = (event) => {
			if(!event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
				this.currentLevel = null;
			}
		};
	};
	customElements.define("gw-shortcuts", ns.ShortcutsEl);
}) (window.GW.Controls.Shortcuts = window.GW.Controls.Shortcuts || {});