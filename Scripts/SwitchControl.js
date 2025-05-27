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
		ParentLabelObserver = null;
		ForLabelObserver = null;

		constructor() {
			super();
			this.InstanceId = SwitchEl.InstanceCount++;

			if(this.InstanceId === 0) {
				document.head.insertAdjacentHTML("afterbegin", `
				<style>
					gw-switch {
						display: inline-flex;
						min-width: 1em;

						> * {
							flex-grow: 1;
						}

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
			return this.querySelector(`#${CSS.escape(this.getId(key))}`);
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
					document.addEventListener("DOMContentLoaded", () => {
						if(!this.IsInitialized) {
							this.renderContent();
						}
					});
				}
				else {
					this.renderContent();
				}
			}
			else {
				this.renderA11yProps();
			}
		}

		renderContent() {		
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

			this.#overrideInputProps();

			this.renderA11yProps();

			this.IsInitialized = true;
		}

		renderA11yProps() {
			this.copyInputA11y();

			this.setupParentLabelObserver();
			this.copyParentLabelA11y();
		}

		#overrideInputProps() {
			const checkedDescriptor = Object.getOwnPropertyDescriptor(
				Object.getPrototypeOf(this.InputEl),
				"checked"
			);
			const originalSet = checkedDescriptor.set;
			checkedDescriptor.set = this.#createDelegate(
				this.InputEl,
				function(checkedDescriptor, originalSet, customHandler, value) {
					const newSet = checkedDescriptor.set;
					checkedDescriptor.set = originalSet;
					Object.defineProperty(this, "checked", checkedDescriptor);

					this.checked = value;

					checkedDescriptor.set = newSet;
					Object.defineProperty(this, "checked", checkedDescriptor);

					customHandler();
				},
				[checkedDescriptor, originalSet, this.copyInputA11y]
			);
			Object.defineProperty(this.InputEl, "checked", checkedDescriptor);
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
				this.copyInputA11y();
				return; // Click in progress
			}
			event.preventDefault();

			this.InputEl.removeAttribute("inert");
			this.InputEl.click();
			this.InputEl.setAttribute("inert", "true");
		};

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
				const labelIds = []; //There should really only be one
				document.querySelectorAll(`[for="${this.InputEl.id}"]`).forEach(labelEl => {
					this.ForLabelObserver?.disconnect();

					labelEl.id = labelEl.id || this.getId(`label-${++this.LabelIdx}`);
					labelIds.push(labelEl.id);

					this.ForLabelObserver = new MutationObserver((mutationList) => {
						setTimeout(this.copyInputA11y, 0);
					});
				this.ForLabelObserver.observe(
					labelEl,
					{attributes: true, childList: false, subtree: false}
				)
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
				this.ParentLabelObserver = new MutationObserver(this.copyParentLabelA11y);
				this.ParentLabelObserver.observe(
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