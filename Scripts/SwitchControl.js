/**
 * @file Switch control
 * @author Vera Konigin vera@groundedwren.com
 */
 
window.GW = window.GW || {};
window.GW.Controls = window.GW.Controls || {};
(function SwitchEl(ns) {
	ns.SwitchEl = class SwitchEl extends HTMLElement {
		static InstanceCount = 0;

		InstanceId;
		IsInitialized;
		LabelIdx = 0;
		InputObserver = null;
		ParentLabelObserver = null;

		constructor() {
			super();
			this.InstanceId = SwitchEl.InstanceCount++;

			if(this.InstanceId === 0) {
				document.head.insertAdjacentHTML("afterbegin", `
				<style>
					gw-switch {
						display: inline-flex;
						min-width: 1em;

						input {
							display: none;
						}
						
						path {
							fill: var(--icon-color, #000000);
						}
						
						&:has(:checked) {
							svg.off {
								display: none;
							}
						}
						&:not(:has(:checked)) {
							svg.on {
								display: none;
							}
						}
					}	
				</style>`);
			}
		}

		getId(key) {
			return `gw-switch-${this.InstanceId}-${key}`;
		}
		getRef(key) {
			return this.querySelector(`#${this.getId(key)}`);
		}

		get InputEl() {
			return this.querySelector("input");
		}
		get ParentLabelEl() {
			return document.querySelector(`label:has(#${this.id})`);
		}

		connectedCallback() {
			if(!this.IsInitialized) {
				if(document.readyState === "loading") {
					document.addEventListener("DOMContentLoaded", this.renderContent);
				}
				else {
					this.renderContent();
				}
			}
			else {
				this.setupParentLabelObserver();
			}
		}

		renderContent = () => {		
			this.id = this.getId("switch");

			Object.entries({
				"role": "switch",
				"tabindex": "0",
				"aria-checked": this.InputEl.checked
			}).forEach(
				([attribute, value]) => this.setAttribute(attribute, value)
			);

			this.InputEl.setAttribute("inert", "true");
			this.insertAdjacentHTML("beforeend", `
				<svg class="off" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
					<!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. -->
					<path d="M384 128c70.7 0 128 57.3 128 128s-57.3 128-128 128H192c-70.7 0-128-57.3-128-128s57.3-128 128-128H384zM576 256c0-106-86-192-192-192H192C86 64 0 150 0 256S86 448 192 448H384c106 0 192-86 192-192zM192 352a96 96 0 1 0 0-192 96 96 0 1 0 0 192z"/>
				</svg>
				<svg class="on" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
					<!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. -->
					<path d="M192 64C86 64 0 150 0 256S86 448 192 448H384c106 0 192-86 192-192s-86-192-192-192H192zm192 96a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"/>
				</svg>
			`);

			this.addEventListener("keydown", this.onKeydown);
			this.addEventListener("keyup", this.onKeyup);
			this.addEventListener("click", this.onClick);

			this.setupInputObserver();
			this.copyInputA11y();

			this.#overrideInputProps();
			
			this.setupParentLabelObserver();
			this.copyParentLabelA11y();

			this.IsInitialized = true;
		};

		//Don't try this at home
		#overrideInputProps() {
			const inputProto = Object.getPrototypeOf(this.InputEl);
			const inputCheckedDesc = Object.getOwnPropertyDescriptor(inputProto, "checked");
			const originalSet = inputCheckedDesc.set;
			inputCheckedDesc.set = this.#createDelegate(
				inputCheckedDesc,
				function(inputEl, originalSet, value) {
					inputEl.setAttribute("checked", value ? "true" : "false");

					const newSet = this.set;
					this.set = originalSet;
					Object.defineProperty(inputEl, "checked", this);

					inputEl.checked = value;

					this.set = newSet;
					Object.defineProperty(inputEl, "checked", this);
				},
				[this.InputEl, originalSet]
			);
			Object.defineProperty(this.InputEl, "checked", inputCheckedDesc);
		}
		#createDelegate = function(context, method, args) {
			return function generatedFunction() {
				return method.apply(context, (args || []).concat(...arguments));
			}
		}

		onKeydown = (event) => {
			switch(event.key) {
				case "Enter":
					this.onClick(event);
					break;
				case " ":
					event.preventDefault();
					break;
			}
		}

		onKeyup = (event) => {
			switch(event.key) {
				case " ":
					this.onClick(event);
					return;
			}
		}

		onClick = (event) => {
			if(event.target === this.InputEl) {
				return; // Click in progress
			}
			event.preventDefault();

			this.InputEl.removeAttribute("inert");
			this.InputEl.click();
			this.InputEl.setAttribute("checked", this.InputEl.checked);
			this.InputEl.setAttribute("inert", "true");
		};

		setupInputObserver() {
			this.InputObserver?.disconnect();
			this.InputObserver = new MutationObserver(this.copyInputA11y).observe(
				this.InputEl,
				{attributes: true, childList: false, subtree: false}
			);
		}
		copyInputA11y = () => {
			["aria-labelledby", "aria-describedby", "aria-details"].forEach(attrName => {
				const inputAttr = this.InputEl.getAttribute(attrName);
				if(inputAttr) {
					this.setAttribute(attrName, inputAttr);
				}
				else {
					this.removeAttribute(attrName);
				}
			});
			
			if(this.InputEl.id) {
				const labelIds = [];
				document.querySelectorAll(`[for="${this.InputEl.id}"]`).forEach(labelEl => {
					labelEl.id = labelEl.id || this.getId(`label-${++this.LabelIdx}`);
					labelIds.push(labelEl.id);
				});
				this.setAttribute(
					"aria-labelledby",
					[this.getAttribute("aria-labelldby") || "", ...labelIds].join(" ").trim()
				);
			}

			this.setAttribute("aria-checked", this.InputEl.checked);
		};

		setupParentLabelObserver() {
			this.ParentLabelObserver?.disconnect();
			if(this.ParentLabelEl) {
				this.ParentLabelObserver = new MutationObserver(this.copyParentLabelA11y).observe(
					this.ParentLabelEl,
					{characterData: true, childList: true, subtree: true}
				);
			}
		}
		copyParentLabelA11y = () => {
			if(this.ParentLabelEl) {
				this.setAttribute("aria-label", this.ParentLabelEl.textContent.trim());
			}
		};
	}
	customElements.define("gw-switch", ns.SwitchEl);
}) (window.GW.Controls.TEMPLATE = window.GW.Controls.TEMPLATE || {});
GW?.Controls?.Veil?.clearDefer("GW.Controls.SwitchEl");