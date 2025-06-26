/**
 * @file A control for a single MineSquare
 * @author Vera Konigin vera@groundedwren.com
 */
 
window.GW = window.GW || {};
(function Minesweeper(ns) {
	ns.MineSquareEl = class MineSquareEl extends HTMLElement {
		static InstanceCount = 0; // Global count of instances created
		static InstanceMap = {}; // Dynamic map of IDs to instances of the element currently attached
		static ActionBatcher = new GW.Gizmos.ActionBatcher("MineSquareEl");

		//Element name (see MDN)
		static Name = "gw-mine-square";

		/**
		* Fetches what the markup for a square should be
		* @param {Object} squareData Data about the square
		* @returns An HTML string
		*/
		static getCellContent(squareData) {
		   const btnOpenTag = `<button
			   data-sts="${squareData.Sts}"
			   tabindex="-1"
			   onclick="GW.Minesweeper.onSquareActivate(event)"
		   >`;
		   switch(squareData.Sts) {
			   case null: {
				   return `${btnOpenTag}
				   </button>`
			   }
			   case "flag": {
				   return `${btnOpenTag}
					   <gw-icon iconKey="flag" name="Flagged" id="status-${squareData.Id}"></gw-icon>
				   </button>`
			   }
			   case "unknown": {
				   return `${btnOpenTag}
					   <gw-icon iconKey="circle-question" name="Marked unknown" id="status-${squareData.Id}"></gw-icon>
				   </button>`
			   }
			   case "dig": {
				   return squareData.Cnt < 0 
					   ? `<gw-icon
						   iconKey="bomb"
						   name="mine"
						   class="dug-square"
						   tabindex="-1"
						   role="figure"
						   aria-describedby="spnMineLabel"
					   ></gw-icon>` 
					   : `<div
						   data-Cnt="${squareData.Cnt}"
						   class="dug-square"
						   tabindex="-1"
						   role="figure"
						   aria-labelledby="spnFindings${squareData.Id} spnMinesNearbyLabel"
						   ondblclick="GW.Minesweeper.batchReveal(event)"
					   ><span id="spnFindings${squareData.Id}">${squareData.Cnt}</span></div>`;
			   }
		   }
		}

		/**
		 * Fetches what the square's aria-labelledby should be
		 * @param {Object} squareData Data about the square
		 * @returns An HTML string
		 */
		static getCellLabelledBy(squareData) {
			return squareData.Sts === "dig" ? "spnDugSquareLabel" : "spnSquareLabel";
		}

		InstanceId; // Identifier for this instance of the element
		IsInitialized; // Whether the element has rendered its content

		/** Creates an instance */
		constructor() {
			super();
			if(!this.getData) {
				// We're not initialized correctly. Attempting to fix:
				Object.setPrototypeOf(this, customElements.get(MineSquareEl.Name).prototype);
			}
			this.InstanceId = MineSquareEl.InstanceCount++;
		}

		/**
		 * Fetches this square's data
		 */
		getData() {
			const idAry = this.getAttribute("id").split("-");
			return ns.Data[idAry[1]][idAry[2]];
		}

		/**
		 * Sets up a listener for our data
		 */
		setUpDataProxy() {
			const idAry = this.getAttribute("id").split("-");
			ns.Data[idAry[1]][idAry[2]] = new Proxy(ns.Data[idAry[1]][idAry[2]], {
				set(_target, _property, _value, _receiver) {
					const returnVal = Reflect.set(...arguments);
					this.MineSquare.renderContent();
					return returnVal;
				},
				MineSquare: this,
			});
		}

		/** Handler invoked when the element is attached to the page */
		connectedCallback() {
			this.onAttached();
		}
		/** Handler invoked when the element is moved to a new document via adoptNode() */
		adoptedCallback() {
			this.onAttached();
		}
		/** Handler invoked when the element is disconnected from the document */
		disconnectedCallback() {
			delete MineSquareEl.InstanceMap[this.InstanceId];
		}

		/** Performs setup when the element has been sited */
		onAttached() {
			MineSquareEl.InstanceMap[this.InstanceId] = this;
			if(!this.IsInitialized) {
				this.setUpDataProxy();
				this.#setupInOutListeners();
				this.IsInitialized = true;
			}
		}

		/** Invoked when the element is ready to render */
		renderContent() {
			MineSquareEl.ActionBatcher.run(this.getAttribute("id"), this.#doRender)
		}

		#doRender = () => {
			const data = this.getData();

			const hadFocus = this.matches(`:focus-within`);

			this.setAttribute("aria-labelledby", MineSquareEl.getCellLabelledBy(data));
			this.innerHTML = MineSquareEl.getCellContent(data);
			this.#setupInOutListeners();

			if(hadFocus) {
				ns.focusFieldSquare(this.parentElement);
			}
		}

		#setupInOutListeners() {
			const myBtn = this.querySelector(`button`);

			this.removeEventListener("mouseover", this.#onInOut);
			this.removeEventListener("mouseout", this.#onInOut);
			myBtn?.removeEventListener("focus", this.#onInOut);
			myBtn?.removeEventListener("blur", this.#onInOut);

			this.addEventListener("mouseover", this.#onInOut);
			this.addEventListener("mouseout", this.#onInOut);
			myBtn?.addEventListener("focus", this.#onInOut);
			myBtn?.addEventListener("blur", this.#onInOut);
		}

		#onInOut = () => {
			const status = this.getData().Sts;
			const indicatorList = Array.from(this.querySelectorAll(`.indicator`));

			if(status === null && this.matches(`:hover, :focus-within`)) {
				if(indicatorList.length) {
					return;
				}
				this.querySelector(`button`).insertAdjacentHTML("afterbegin", `
					<svg viewbox="0 -0.5 17 17" class="gw-icon indicator dig-indicator" role="none">
						<!-- Vectors and icons by Frexy [https://github.com/frexy/glyph-iconset?ref=svgrepo.com] in CC Attribution License via SVG Repo [https://www.svgrepo.com/] -->
						<path
							d="M15.732,2.509 L13.495,0.274 C13.064,-0.159 12.346,-0.141 11.892,0.312 C11.848,0.356 11.817,0.411 11.8,0.471 C11.241,2.706 11.253,3.487 11.346,3.794 L5.081,10.059 L3.162,8.142 L0.872,10.432 C0.123,11.18 -0.503,13.91 0.795,15.207 C2.092,16.504 4.819,15.875 5.566,15.128 L7.86,12.836 L5.981,10.958 L12.265,4.675 C12.607,4.752 13.423,4.732 15.535,4.205 C15.595,4.188 15.65,4.158 15.694,4.114 C16.147,3.661 16.163,2.941 15.732,2.509 L15.732,2.509 Z M15.15,3.459 C14.047,3.77 12.765,4.046 12.481,3.992 L12.046,3.557 C11.984,3.291 12.262,1.996 12.576,0.886 C12.757,0.752 12.989,0.748 13.129,0.888 L15.147,2.906 C15.285,3.045 15.281,3.277 15.15,3.459 L15.15,3.459 Z"
						></path>
					</svg>
					<svg viewbox="0 0 155.139 155.139" class="gw-icon indicator flag-indicator" role="none">
						<!-- https://www.svgrepo.com/svg/109029/flag-waving-left -->
						<path
							d="M117.604,0v7.136h-9.314c-11.397,0-26.714,5.251-34.059,11.677 c-7.333,6.42-22.656,11.677-34.053,11.677H10.009c0,0,22.209,25.938,22.513,36.702c0.352,11.904-22.513,42.001-22.513,42.001 h30.168c11.397,0,26.726-5.251,34.053-11.677c7.351-6.426,22.662-11.683,34.059-11.683h9.314v69.305h27.525V0H117.604z"
						></path>
					</svg>
					<span class="indicator q-indicator" aria-hidden="true">?</span>
				`);
			}
			else if(indicatorList.length) {
				indicatorList.forEach(indicator => indicator.remove());
			}
		};
	}
	if(!customElements.get(ns.MineSquareEl.Name)) {
		customElements.define(ns.MineSquareEl.Name, ns.MineSquareEl);
	}
}) (window.GW.Minesweeper = window.GW.Minesweeper || {});