/**
 * @file Minesweeper scripts
 * @author Vera Konigin vera@groundedwren.com
 */
 
window.GW = window.GW || {};
(function Minesweeper(ns) {
	ns.onNewGame = (event) => {
		event.preventDefault();
		const elements = event.target.elements;

		ns.generateGameData(elements["numRows"].value, elements["numCols"].value, elements["numMineRate"].value / 100.0);
		ns.renderGame();
	}

	ns.generateGameData = function generateGameData(numRows, numCols, mineRate) {
		ns.Data = [];

		for(let i = 0; i < numRows; i++) {
			ns.Data[i] = [];
			for(let j = 0; j < numCols; j++) {
				ns.Data[i][j] = {Cnt: 0, Sts: null, Id: `${i}-${j}`};
			}
		}

		const surroundingDeltas = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
		for(let i = 0; i < numRows; i++) {
			for(let j = 0; j < numCols; j++) {
				if(Math.random() <= mineRate) {
					ns.Data[i][j].Cnt = -1;
					surroundingDeltas.forEach(deltas => {
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

	ns.renderGame = function renderGame() {
		const tbodyField = document.getElementById("tbodyField");
		const hadFocus = tbodyField.matches(":focus-within");
		tbodyField.innerHTML = ns.Data.map(dataRow => `
			<tr>${dataRow.map(squareData => `
				<td id="cell-${squareData.Id}">
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
		}

		checkWinstate();
	}

	function checkWinstate() {
		for(let i = 0; i < ns.Data.length; i++) {
			for(let j = 0; j < ns.Data[i].length; j++) {
				const square = ns.Data[i][j]
				if((square.Cnt === -1 && square.Sts !== "flag")
					|| (square.Cnt !== -1 && square.Sts === "flag")
				) {
					document.getElementById("divSunglasses").setAttribute("hidden", "true");
					return;
				}
			}
		}
		setTimeout(() => GW.Controls.Toaster.showToast("You won! 😎"), 0);
		document.getElementById("divSunglasses").removeAttribute("hidden");
	}

	function focusFieldSquare(tdFocus) {
		const tblField = document.getElementById("tblField");
		tblField.querySelectorAll("button, .dug-square").forEach(
			elem => elem.setAttribute("tabindex", elem.parentElement === tdFocus ? "0" : "-1")
		);
		const [_, row, col] = tdFocus.id.split("-");
		tblField.setAttribute("data-row", row);
		tblField.setAttribute("data-col", col);

		tdFocus.querySelector("button, .dug-square").focus();
	}

	function getCellContent(squareData) {
		const btnOpenTag = `<button data-sts="${squareData.Sts}" tabindex="-1" onclick="GW.Minesweeper.onSquareActivate(event)">`;
		switch(squareData.Sts) {
			case null: {
				return `${btnOpenTag}
				</button>`
			}
			case "flag": {
				return `${btnOpenTag}
					<gw-icon iconKey="flag" title="Flagged"></gw-icon>
				</button>`
			}
			case "unknown": {
				return `${btnOpenTag}
					<gw-icon iconKey="circle-question" title="Unknown"></gw-icon>
				</button>`
			}
			case "dig": {
				return squareData.Cnt < 0 
					? `<gw-icon
						iconKey="bomb"
						title="mine"
						class="dug-square"
						tabindex="-1"
						role="figure"
						aria-describedby="spnDugSquareLabel spnMineLabel"
					></gw-icon>` 
					: `<div
						data-Cnt="${squareData.Cnt}"
						class="dug-square"
						tabindex="-1"
						role="figure"
						aria-labelledby="spnDugSquareLabel spnFindings${squareData.Id} spnMinesNearbyLabel"
					><span id="spnFindings${squareData.Id}">${squareData.Cnt}<span></div>`;
			}
		}
	}

	ns.onSquareActivate = (event) => {
		const [_, row, col] = event.target.parentElement.id.split("-");
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

	function digAround(row, col) {
		const cellArr = [{row: row, col: col }];
		while(cellArr.length) {
			const coords = cellArr.pop();
			if(ns.Data[coords.row]
				&& ns.Data[coords.row][coords.col]
				&& ns.Data[coords.row][coords.col].Cnt === 0
				&& ns.Data[coords.row][coords.col].Sts !== "dig"
			) {
				ns.Data[coords.row][coords.col].Sts = "dig";
				for(let i = -1; i <= 1; i++) {
					for(let j = -1; j <=1; j++) {
						if((i || j) && (i !== j)) {
							cellArr.push({row: coords.row + i, col: coords.col + j});
						}
					}
				}
			}
		}
	}

	ns.onModeChange = (_event) => {
		updateButtons();
	};

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

	function getCurAction() {
		return document.querySelector("[name='clickMode']:checked").value;
	}

	ns.selectMode = (mode) => {
		document.querySelector(`[name="clickMode"][value="${mode}"]`).click();
		if(!document.getElementById("tblField").querySelector("button:focus-within")) {
			GW.Controls.Toaster.showToast(mode, {invisible: true});
		}
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
	GW.Minesweeper.Data = localStorage.getItem("data");
	if(!GW.Minesweeper.Data) {
		GW.Minesweeper.generateGameData(10, 10, 0.12);
	}
	GW.Minesweeper.renderGame();
});
window.addEventListener("beforeunload", (event) => {});