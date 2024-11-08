/**
 * @file Minesweeper scripts
 * @author Vera Konigin vera@groundedwren.com
 */
 
window.GW = window.GW || {};
(function Minesweeper(ns) {
	const SURROUNDING_DELTAS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

	/**
	 * Creates and renders a new game
	 * @param {SubmitEvent} event 
	 */
	ns.onNewGame = (event) => {
		event.preventDefault();
		const elements = event.target.elements;

		ns.generateGameData(elements["numRows"].value, elements["numCols"].value, elements["numMineRate"].value / 100.0);
		localStorage.setItem("hasArmor", "true");
		ns.renderGame();
		ns.selectMode("dig");
	}

	/**
	 * Sets up the game state
	 * @param {number} numRows The number of field rows
	 * @param {number} numCols The number of field columns
	 * @param {number} mineRate Percentage of squares to have mines
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
		focusFieldSquare(document.getElementById(`cell-${targetRow}-${targetCol}`));
	}

	/**
	 * Handles siting focus in the minefield
	 * @param {KeyboardEvent} event 
	 */
	ns.tblFieldOnFocusIn = (event) => {
		let focusTarget = event.target;
		const tblField = document.getElementById("tblField");
		if(focusTarget === tblField) {
			focusFieldSquare(tblField.querySelector(
				`#cell-${tblField.getAttribute("data-row")}-${tblField.getAttribute("data-col")}`
			));
			tblField.setAttribute("tabindex", "-1");
		}
		else {
			focusFieldSquare(event.target.parentElement);
		}
	};

	/**
	 * Renders the minefield
	 */
	ns.renderGame = function renderGame() {
		const tbodyField = document.getElementById("tbodyField");
		const hadFocus = tbodyField.matches(":focus-within");
		tbodyField.innerHTML = ns.Data.map(dataRow => `
			<tr>${dataRow.map(squareData => `
				<td id="cell-${squareData.Id}"
					aria-labelledby="${squareData.Sts === "dig" ? "spnDugSquareLabel" : "spnSquareLabel"}"
					aria-describedby="status-${squareData.Id}"
				>
					${getCellContent(squareData)}
				</td>
			`).join("")}</tr>
		`).join("");

		updateButtons();
		if(hadFocus) {
			const tblField = document.getElementById("tblField");
			const tdFocus = tblField.querySelector(
				`#cell-${tblField.getAttribute("data-row")}-${tblField.getAttribute("data-col")}`
			);
			focusFieldSquare(tdFocus);
		}
		else {
			document.getElementById("tblField").setAttribute("tabindex", "0");
			updateFace();
		}

		localStorage.setItem("data", JSON.stringify(GW.Minesweeper.Data));
	}

	/**
	 * Fetches what the markup for a square should be
	 * @param {Object} squareData Data about the square
	 * @returns An HTML string
	 */
	function getCellContent(squareData) {
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
					><span id="spnFindings${squareData.Id}">${squareData.Cnt}</span></div>`;
			}
		}
	}

	/**
	 * Puts focus on the specified square
	 * @param {HTMLElement} tdFocus table cell getting focus
	 */
	function focusFieldSquare(tdFocus) {
		const tblField = document.getElementById("tblField");
		tblField.querySelectorAll("button, .dug-square").forEach(
			elem => elem.setAttribute("tabindex", elem.parentElement === tdFocus ? "0" : "-1")
		);
		const [_, row, col] = tdFocus.id.split("-");
		tblField.setAttribute("data-row", row);
		tblField.setAttribute("data-col", col);

		tdFocus.querySelector("button, .dug-square").focus();
		
		setTimeout( () => updateFace(), 0);
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
				let tdEl = focusedTableElem;
				while(tdEl.tagName !== "TD") {
					tdEl = tdEl.parentElement;
				}
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
		let tdEl = event.target;
		while(tdEl.tagName !== "TD") {
			tdEl = tdEl.parentElement;
		}
		const [_, row, col] = tdEl.id.split("-");
		const action = getCurAction();

		if(action === "dig") {
			digAround(parseInt(row), parseInt(col));
			ns.Data[row][col].Sts = action;
		}
		else if(ns.Data[row][col].Sts === action){
			ns.Data[row][col].Sts = null;
		}
		else {
			ns.Data[row][col].Sts = action;
		}

		setTimeout(() => ns.renderGame(), 0);
	};

	/**
	 * Auto-reveals surrounding squares as appropriate
	 * @param {number} row Starting square's row
	 * @param {number} col Starting square's col
	 */
	function digAround(row, col) {
		if(localStorage.getItem("hasArmor") === "true") {
			SURROUNDING_DELTAS.concat([[0, 0]]).forEach(
				deltas => diffuseSquare(row + deltas[0], col + deltas[1])
			);
			localStorage.setItem("hasArmor", "false");
		}

		const cellArr = [{row: row, col: col }];
		while(cellArr.length) {
			const coords = cellArr.pop();
			if(ns.Data[coords.row]
				&& ns.Data[coords.row][coords.col]
				&& ns.Data[coords.row][coords.col].Sts !== "dig"
			) {
				ns.Data[coords.row][coords.col].Sts = "dig";
				if(ns.Data[coords.row][coords.col].Cnt === 0) {
					SURROUNDING_DELTAS.forEach(
						deltas => cellArr.push({row: coords.row + deltas[0], col: coords.col + deltas[1]})
					);
				}
			}
		}
	}

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
	function updateButtons() {
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

	/**
	 * Updates the current action mode
	 * @param {Event} mode 
	 */
	ns.selectMode = (mode) => {
		document.querySelector(`[name="clickMode"][value="${mode}"]`).click();
		if(!document.getElementById("tblField").querySelector("button:focus-within")) {
			GW.Controls.Toaster.showToast(mode, {invisible: true});
		}
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
		ns.renderGame();
		setTimeout(() => GW.Controls.Toaster.showToast("Board revealed!", {invisible: true}), 0);
	};
}) (window.GW.Minesweeper = window.GW.Minesweeper || {});

window.addEventListener("load", () => {
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
	
	document.getElementById("cbxBigSquares").checked = localStorage.getItem("use-big-squares") === "true";

	GW.Minesweeper.Data = JSON.parse(localStorage.getItem("data"));
	if(!GW.Minesweeper.Data) {
		GW.Minesweeper.generateGameData(10, 10, 0.12);
		localStorage.setItem("hasArmor", "true");
	}
	GW.Minesweeper.renderGame();
});
window.addEventListener("beforeunload", (event) => {});