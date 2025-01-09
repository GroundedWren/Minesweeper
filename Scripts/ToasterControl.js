/**
 * @file A control to show toast messages
 * @author Vera Konigin vera@groundedwren.com
 * https://groundedwren.neocities.org
 */

window.GW = window.GW || {};
window.GW.Controls = window.GW.Controls || {};
(function Toaster(ns) {
	ns.TOASTER_ASIDE_ID = "asiGWToaster";
	ns.TOAST_TIMEOUT_MS = 4000;
	ns.ToastCount = 0;

	/** This creates the toast container */
	window.addEventListener("load", function toasterControlOnLoad() {
		const toasterLabelId = ns.TOASTER_ASIDE_ID + "-Label";

		document.head.insertAdjacentHTML("beforeend",`
			<style>
				#${toasterLabelId} {
					position: absolute;
					left: -99999999px;
					top: 0px;
				}

				#${ns.TOASTER_ASIDE_ID} {
					position: fixed;
					bottom: 0;
					right: 0;
					padding: 5px;

					&:empty {
						padding: 0px;
					}
					
					display: flex;
					flex-direction: column-reverse;
					gap: 5px;

					> em {
						background-color: var(--background-color, white);

						color: var(--text-color, black);

						padding: 5px;
					}

					> article {
						&.invisible {
							position: absolute;
							left: -99999999px;
							top: 0px;
						}

						border: 4px solid var(--border-color, black);
						background-color: var(--accent-color, white);
						color: var(--text-color, black);

						padding: 5px;
						width: 300px;
						max-width: 300px;
						text-align: center;

						> .gw-toast-dismiss {
							float: right;
						}

						> .gw-toast-content {
							clear: right;
						}

						.preamble {
							position: absolute;
							left: -99999999px;
							top: 0px;
						}
					}
				}
			</style>
		`);
		
		document.body.insertAdjacentHTML(
			"beforeend",
			`
			<span id="${toasterLabelId}">Message toaster</span>
			<aside aria-labelledby="${toasterLabelId}" id="${ns.TOASTER_ASIDE_ID}" aria-live="polite"></aside>
			`
		);
	});

	/**
	 * Shows a toast message.
	 * @param {string} content Content to display in the message. Can be HTML
	 * @param {object} opts Display options. Optional.
	 * @param {boolean} opts.omitPreamble Whether to exclude the screenreader-only preamble explaining this is a toast
	 * @param {boolean} opts.persist Whether this message should persist until dismissed
	 * @param {boolean} opts.invisible Whether the message should be invisible
	 * @param {int} opts.timeout Milliseconds until the toast vanishes (no effect with opts.persist set)
	 * @param {int} opts.delay Milliseconds until the toast shows
	 */
	ns.showToast = async (content, opts) =>  {
		opts = opts || {};
		ns.ToastCount++;
		const toastId = `gwToast-${ns.ToastCount}`;

		const toaster = document.getElementById(ns.TOASTER_ASIDE_ID);

		if(opts.delay !== null && opts.delay !== undefined) {
			await new Promise(resolve => setTimeout(resolve, opts.delay));
		}

		toaster.insertAdjacentHTML("afterbegin", `<article id="${toastId}" class="${opts.invisible ? "invisible" : ""}">
			${opts.omitPreamble
				? "" 
				: `<span id="${toastId}-preamble" class="preamble">${opts.persist ? "Popup" : "Toast"} message: </span>`
			}
			${opts.persist
				? `<button id="${toastId}-dismiss"
						aria-labelledby="${toastId}-dismiss ${toastId}-preamble"
						class="gw-toast-dismiss"
						aria-live="off"
						onclick="GW.Controls.Toaster.onDismiss('${toastId}')"
					>Dismiss</button>`
				: ""
			}
			<div class="gw-toast-content">${content}</div>
		</article>`);

		if(!opts.persist) {
			setTimeout(ns.hideToast, opts.timeout || ns.TOAST_TIMEOUT_MS, toastId);
		}
	};

	/**
	 * Removes a toast via button click
	 * @param {string} toastId Element id to hide
	 */
	ns.onDismiss = (toastId) => {
		let toastEl = document.getElementById(toastId);
		toastEl.outerHTML = `<em id="${toastId}" tabIndex="-1" aria-live="off">Dismissed</em>`;
		toastEl = document.getElementById(toastId);
		toastEl.focus();
		
		const toaster = document.getElementById(ns.TOASTER_ASIDE_ID);
		toaster.addEventListener("focusout", () => {
			setTimeout(() => {
				if(!toaster.matches(":focus-within")) {
					ns.hideToast(toastId);
				}
			}, 0);
		});
	};

	/**
	 * Removes a toast message
	 * @param {string} toastId Element id to hide
	 */
	ns.hideToast = (toastId) => {
		document.getElementById(toastId)?.remove();
	};
}) (window.GW.Controls.Toaster = window.GW.Controls.Toaster || {}); 
GW?.Controls?.Veil?.clearDefer("GW.Controls.Toaster");