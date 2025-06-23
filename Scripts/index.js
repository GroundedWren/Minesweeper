/**
 * @file Minesweeper scripts
 * @author Vera Konigin vera@groundedwren.com
 */
 
window.GW = window.GW || {};
(function Minesweeper(ns) {
	const SURROUNDING_DELTAS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
	ns.Data = [];
	ns.HasArmor = true;

	/**
	 * Creates and renders a new game
	 * @param {SubmitEvent} event 
	 */
	ns.onNewGame = (event) => {
		event.preventDefault();
		const elements = event.target.elements;
		const ngSize = {
			Rows: elements["numRows"].value,
			Columns: elements["numCols"].value,
			MineRate: elements["numMineRate"].value,
		};
		localStorage.setItem("new-game-size", JSON.stringify(ngSize));

		ns.generateGameData(ngSize.Rows, ngSize.Columns, ngSize.MineRate / 100.0);
		ns.HasArmor = true;

		ns.renderGame();
		ns.selectMode("dig");
	}

	/**
	 * Sets up the game state
	 * @param {Number} numRows The number of field rows
	 * @param {Number} numCols The number of field columns
	 * @param {Number} mineRate Percentage of squares to have mines
	 */
	ns.generateGameData = function generateGameData(numRows, numCols, mineRate) {
		ns.Data = [];

		for(let i = 0; i < numRows; i++) {
			ns.Data[i] = [];
			for(let j = 0; j < numCols; j++) {
				ns.Data[i][j] = {Cnt: 0, Sts: null, Id: `${i}-${j}`};
			}
		}

		for(let i = 0; i < numRows; i++) {
			for(let j = 0; j < numCols; j++) {
				if(Math.random() <= mineRate) {
					ns.Data[i][j].Cnt = -1;
					SURROUNDING_DELTAS.forEach(deltas => {
						const deltaRow = ns.Data[i + deltas[0]];
						if(!deltaRow) {return;}

						const deltaSquare = deltaRow[j + deltas[1]];
						if(!deltaSquare || deltaSquare.Cnt < 0) { return; }

						ns.Data[i + deltas[0]][j + deltas[1]].Cnt++;
					});
				}
			}
		}
	}

	/**
	 * Performs keyboard navigation in the field
	 * @param {KeyboardEvent} event Navigation event
	 */
	ns.tblFieldOnKbdNav = (event) => {
		const maxRowPos = ns.Data.length - 1;
		const maxColPos = ns.Data[0].length - 1;

		const tblField = document.getElementById("tblField");
		let targetRow = parseInt(tblField.getAttribute("data-row"));
		let targetCol = parseInt(tblField.getAttribute("data-col"));
		switch(event.key) {
			case "ArrowRight":
				targetCol += 1;
				break;
			case "ArrowLeft":
				targetCol -= 1;
				break;
			case "ArrowUp":
				targetRow -= 1;
				break;
			case "ArrowDown":
				targetRow += 1;
				break;
			case "PageUp":
				targetRow = 0;
				break;
			case "PageDown":
				targetRow = maxRowPos;
				break;
			case "Home":
				targetCol = 0;
				if(event.ctrlKey) {
					targetRow = 0;
				}
				break;
			case "End":
				targetCol = maxColPos;
				if(event.ctrlKey) {
					targetRow = maxRowPos;
				}
				break;
		}
		targetRow = Math.max(Math.min(targetRow, maxRowPos), 0);
		targetCol = Math.max(Math.min(targetCol, maxColPos), 0);
		ns.focusFieldSquare(document.getElementById(`cell-${targetRow}-${targetCol}`));
	}

	function getActiveSquare() {
		return document.getElementById(getActiveSquareId());
	}

	function getActiveSquareId() {
		const tblField = document.getElementById("tblField");
		return `cell-${tblField.getAttribute("data-row")}-${tblField.getAttribute("data-col")}`
	}

	/**
	 * Handles siting focus in the minefield
	 * @param {KeyboardEvent} event 
	 */
	ns.tblFieldOnFocusIn = (event) => {
		let focusTarget = event.target;
		const tblField = document.getElementById("tblField");
		if(focusTarget === tblField) {
			ns.focusFieldSquare(getActiveSquare());
			tblField.setAttribute("tabindex", "-1");
		}
		else {
			ns.focusFieldSquare(getTdParent(event.target));
		}

		document.getElementById("asiTblField").style["visibility"] = "visible";
	};

	ns.tblFieldOnFocusOut = (_event) => {
		document.getElementById("asiTblField").style["visibility"] = "hidden";
	};

	/**
	 * Renders the minefield
	 */
	ns.renderGame = function renderGame() {
		Last.Data = [];
		localStorage.removeItem("data");

		const tbodyField = document.getElementById("tbodyField");
		
		let prevCellId = null;
		if(tbodyField.matches(`:focus-within`)) {
			prevCellId = getActiveSquareId();
		}

		tbodyField.innerHTML = ns.Data.map(dataRow => `
			<tr>${dataRow.map(squareData => `
				<td id="cell-${squareData.Id}"
					aria-labelledby="spnCellLabel"
				>
					<gw-mine-square
						id="square-${squareData.Id}"
						role="group"
						aria-labelledby="${ns.MineSquareEl.getCellLabelledBy(squareData)}"
						aria-describedby="status-${squareData.Id}"
					>
						${ns.MineSquareEl.getCellContent(squareData)}
					</gw-mine-square>
				</td>
			`).join("")}</tr>
		`).join("");

		document.getElementById("tblField").setAttribute("tabindex", "0");
		updateButtons();
		updateFace();

		if(prevCellId) {
			ns.focusFieldSquare(document.getElementById(prevCellId));
		}

		setTimeout(() => document.getElementById("shortsField").currentLevel = null, 0);

		ns.MineSquareEl.ActionBatcher.addListener("onRender", onRender);
		ns.MineSquareEl.ActionBatcher.run();
	}

	/**
	 * Puts focus on the specified square
	 * @param {HTMLElement} tdFocus table cell getting focus
	 */
	ns.focusFieldSquare = function focusFieldSquare(tdFocus) {
		const tblField = document.getElementById("tblField");
		tblField.querySelectorAll("button, .dug-square").forEach(
			elem => elem.setAttribute("tabindex", getTdParent(elem) === tdFocus ? "0" : "-1")
		);
		const [_, row, col] = tdFocus.id.split("-");
		tblField.setAttribute("data-row", row);
		tblField.setAttribute("data-col", col);

		const focusEl = tdFocus.querySelector("button, .dug-square");
		if(!focusEl.matches(`:focus`)) {
			focusEl.focus();
		}
		
		setTimeout(() => updateFace(), 0);
	}
	
	/**
	 * Updates the game's avatar face
	 */
	function updateFace() {
		let win = true;
		let death = false;
		for(let i = 0; i < ns.Data.length; i++) {
			for(let j = 0; j < ns.Data[i].length; j++) {
				const square = ns.Data[i][j]
				if((square.Cnt === -1 && square.Sts !== "flag")
					|| (square.Cnt !== -1 && square.Sts === "flag")
				) {
					win = false
				}
				if(square.Cnt === -1 && square.Sts === "dig") {
					win = false;
					death = true;
				}
			}
		}

		const spnSunglasses = document.getElementById("spnSunglasses");
		const spnDead = document.getElementById("spnDead");
		const spnThink = document.getElementById("spnThink");
		const spnSmile = document.getElementById("spnSmile");
		const showedSunglasses = !spnSunglasses.hasAttribute("hidden");

		[spnSunglasses, spnDead, spnThink, spnSmile].forEach(spn => spn.setAttribute("hidden" ,"true"));
		if(win) {
			spnSunglasses.removeAttribute("hidden");
			if(!showedSunglasses) {
				setTimeout(() => GW.Controls.Toaster.showToast("You won! 😎"), 0);
			}
		}
		else if(death) {
			spnDead.removeAttribute("hidden");
		}
		else {
			const focusedTableElem = document.getElementById("tbodyField").querySelector(":focus");
			if(!focusedTableElem) {
				spnSmile.removeAttribute("hidden");
			}
			else {
				const tdEl = getTdParent(focusedTableElem);
				const [_, row, col] = tdEl.id.split("-");
				const status = ns.Data[row][col].Sts;
				if(status === "dig" || status === "flag") {
					spnSmile.removeAttribute("hidden");
				}
				else {
					spnThink.removeAttribute("hidden");
				}
			}

		}
	}

	/**
	 * Handles the user activating a square
	 * @param {Event} event 
	 */
	ns.onSquareActivate = (event) => {
		let tdEl = getTdParent(event.target);
		const [_, row, col] = tdEl.id.split("-");
		const action = getCurAction();

		if(action === "dig") {
			digAround(parseInt(row), parseInt(col));
		}
		else if(ns.Data[row][col].Sts === action){
			ns.Data[row][col].Sts = null;
			updateButtons();
		}
		else {
			ns.Data[row][col].Sts = action;
			updateButtons();
		}
	};

	/**
	 * "Digs around" all adjacent unmarked squares
	 * @param {Event} event context menu event
	 */
	ns.batchReveal = (event) => {
		let tdEl = getTdParent(event.target);
		const [_, row, col] = tdEl.id.split("-").map(item => parseInt(item));
		SURROUNDING_DELTAS.forEach(deltas => {
			const coords = {Row: row + deltas[0], Col: col + deltas[1] };
			if(ns.Data[coords.Row]
				&& ns.Data[coords.Row][coords.Col]
				&& ns.Data[coords.Row][coords.Col].Sts === null
			) {
				digAround(coords.Row, coords.Col);
			}
		});

		event.preventDefault();
	};

	/**
	 * @param {HTMLElement} elem child element
	 * @returns Nearest <td> ancestor
	 */
	function getTdParent(elem) {
		let tdEl = elem;
		while(tdEl.tagName !== "TD") {
			tdEl = tdEl.parentElement;
		}
		return tdEl;
	}

	/**
	 * Auto-reveals surrounding squares as appropriate
	 * @param {Number} row Starting square's row
	 * @param {Number} col Starting square's col
	 */
	function digAround(row, col) {
		if(ns.HasArmor === true) {
			SURROUNDING_DELTAS.concat([[0, 0]]).forEach(
				deltas => diffuseSquare(row + deltas[0], col + deltas[1])
			);
			ns.HasArmor = false;
		}

		const cellArr = [{Row: row, Col: col }];
		while(cellArr.length) {
			const coords = cellArr.pop();
			if(ns.Data[coords.Row]
				&& ns.Data[coords.Row][coords.Col]
				&& ns.Data[coords.Row][coords.Col].Sts !== "dig"
			) {
				ns.Data[coords.Row][coords.Col].Sts = "dig";
				if(ns.Data[coords.Row][coords.Col].Cnt === 0) {
					SURROUNDING_DELTAS.forEach(
						deltas => cellArr.push({Row: coords.Row + deltas[0], Col: coords.Col + deltas[1]})
					);
				}
			}
		}
	}

	/**
	 * Removes a mine from a square if one exists
	 * @param {Number} row Square to diffuse's row
	 * @param {Number} col Square to diffuse's column
	 */
	function diffuseSquare(row, col) {
		if(!ns.Data[row] || !ns.Data[row][col] || ns.Data[row][col].Cnt !== -1) {
			return;
		}
		
		ns.Data[row][col].Cnt = SURROUNDING_DELTAS.filter(deltas => {
			const newRow = row + deltas[0];
			const newCol = col + deltas[1];
			return ns.Data[newRow] && ns.Data[newRow][newCol] && ns.Data[newRow][newCol].Cnt === -1;
		}).length;

		SURROUNDING_DELTAS.forEach(deltas => {
			const newRow = row + deltas[0];
			const newCol = col + deltas[1];
			if(ns.Data[newRow] && ns.Data[newRow][newCol] && ns.Data[newRow][newCol].Cnt > 0) {
				ns.Data[newRow][newCol].Cnt -= 1;
			}
		});
	}

	/**
	 * Updates the game based on the currently selected action mode
	 * @param {Event} _event 
	 */
	ns.onModeChange = (_event) => {
		updateButtons();
	};

	/**
	 * Updates the minefield buttons for the current action mode
	 */
	async function updateButtons() {
		await ns.MineSquareEl.ActionBatcher.BatchPromise;
		
		const curBtnLblEl = getCurBtnLblEl();
		document.querySelectorAll("#tblField button").forEach(btn => {
			btn.setAttribute("aria-labelledby", curBtnLblEl);
			switch(curBtnLblEl) {
				case "spnSquareFlagLabel":
					btn.setAttribute("aria-pressed", btn.getAttribute("data-sts") === "flag");
					break;
				case "spnSquareUnknownLabel":
					btn.setAttribute("aria-pressed", btn.getAttribute("data-sts") === "unknown");
					break;
				default:
					btn.removeAttribute("aria-pressed");
			}
		});
	}

	/**
	 * Finds what element should label minefield butttons based on the current action mode
	 * @returns An element id
	 */
	function getCurBtnLblEl() {
		switch(getCurAction()) {
			case "dig":
				return "spnSquareDigLabel";
			case "flag":
				return "spnSquareFlagLabel";
			case "unknown":
				return "spnSquareUnknownLabel";
		}
		debugger;
		return ""
	}

	/**
	 * The current action mode
	 * @returns string
	 */
	function getCurAction() {
		return document.querySelector("[name='clickMode']:checked").value;
	}

	ns.cycleMode = (event) => {
		event.preventDefault();

		const modeEls = [...document.querySelectorAll(`[name="clickMode"]`)];
		const newModeIdx = (modeEls.findIndex(element => element.matches(`:checked`)) + 1)  % modeEls.length;
		ns.selectMode(modeEls[newModeIdx].value);
	}

	/**
	 * Updates the current action mode
	 * @param {Event} mode 
	 */
	ns.selectMode = (mode) => {
		document.querySelector(`[name="clickMode"][value="${mode}"]`).click();

		ns.MineSquareEl.ActionBatcher.BatchPromise.then(() => {
			if(!document.getElementById("tblField").querySelector("button:focus-within")) {
				GW.Controls.Toaster.showToast(mode, {invisible: true});
			}
		});
	};

	const Last = new Proxy({Data: [], HasArmor: false}, {
		set(_target, property, value, _receiver) {
			switch(property) {
				case "Data":
					const btnUndo = document.getElementById("btnUndo");
					if(value && value.length) {
						btnUndo.removeAttribute("disabled");
					}
					else {
						if(btnUndo.matches(":focus-within")) {
							ns.focusFieldSquare(getActiveSquare());
						}
						btnUndo.setAttribute("disabled", "true");
					}
					break;
			}
			return Reflect.set(...arguments);
		}
	});

	/**
	 * Undoes the last action
	 */
	ns.undo = () => {
		if(!Last.Data || !Last.Data.length) {
			return;
		}

		ns.Data = Last.Data;
		ns.HasArmor = Last.HasArmor;
		ns.renderGame();
	};

	/**
	 * Digs all squares
	 */
	ns.revealBoard = () => {
		for(let i = 0; i < ns.Data.length; i++) {
			for(let j = 0; j < ns.Data[i].length; j++) {
				ns.Data[i][j].Sts = "dig";
			}
		}

		setTimeout(() => GW.Controls.Toaster.showToast("Board revealed!", {invisible: true}), 0);
	};

	/**
	 * Scrolls the minefield
	 * @param {String} direction "left" or "right"
	 */
	ns.horizScroll = (direction) => {
		document.getElementById("scrollMinefield").scrollLeft += ((direction === "left" ? -1 : 1) * (document.getElementById("cbxBigSquares").checked ? 50 : 30));
	};

	const onRender = () => {
		Last.Data = JSON.parse(localStorage.getItem("data"));
		Last.HasArmor = localStorage.getItem("has-armor") === "true";

		localStorage.setItem("data", JSON.stringify(ns.Data));
		localStorage.setItem("has-armor", ns.HasArmor ? "true" : "false");
	};

	ns.updatePrefs = () => {
		const cbxDarkMode = document.getElementById("cbxDarkMode");
		const theme = localStorage.getItem("theme");
		switch(theme) {
			case "light":
				cbxDarkMode.checked = false;
				break;
			case "dark":
				cbxDarkMode.checked = true;
				break;
			default:
				cbxDarkMode.checked = window.matchMedia("(prefers-color-scheme: dark)").matches;
				break;
		}
		document.documentElement.classList.toggle("theme-dark", cbxDarkMode.checked);

		const cbxBigSquares = document.getElementById("cbxBigSquares");
		cbxBigSquares.checked = localStorage.getItem("use-big-squares") === "true";
		document.documentElement.classList.toggle("big-squares", cbxBigSquares.checked);

		const cbxShowGridlines = document.getElementById("cbxShowGridlines");
		cbxShowGridlines.checked = localStorage.getItem("show-gridlines") === "true";
		document.documentElement.classList.toggle("show-gridlines", cbxShowGridlines.checked);
	};
}) (window.GW.Minesweeper = window.GW.Minesweeper || {});

window.addEventListener("load", () => {
	GW.Minesweeper.updatePrefs();

	const ngSize = JSON.parse(localStorage.getItem("new-game-size")) || {
		Rows: 10,
		Columns: 10,
		MineRate: 12,
	};
	document.getElementById("numRows").value = ngSize.Rows;
	document.getElementById("numCols").value = ngSize.Columns;
	document.getElementById("numMineRate").value = ngSize.MineRate;

	GW.Minesweeper.Data = JSON.parse(localStorage.getItem("data"));
	if(!GW.Minesweeper.Data) {
		GW.Minesweeper.generateGameData(10, 10, 0.12);
	}
	GW.Minesweeper.HasArmor = localStorage.getItem("has-armor") === "true";
	GW.Minesweeper.renderGame();
});
window.addEventListener("beforeunload", (event) => {});