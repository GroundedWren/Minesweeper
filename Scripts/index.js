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

	ns.tblFieldOnKbdNav = (event) => {
		//TODO
	};

	ns.tblFieldOnFocusIn = (event) => {
		let focusTarget = event.target;
		const tblField = document.getElementById("tblField");
		if(focusTarget === tblField) {
			const button = tblField.querySelector(
				`#cell-${tblField.getAttribute("data-row")}${tblField.getAttribute("data-column")} button`
			);
		}
		else if(event.target.tagName === "BUTTON") {
			focusFieldButton(event.target);
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
			const focusBtn = tblField.querySelector(
				`#cell-${tblField.getAttribute("data-row")}${tblField.getAttribute("data-column")} button`
			);
			focusFieldButton(focusBtn);
		}
	}

	function focusFieldButton(focusButton) { //KJA TODO this needs to be more than buttons
		const tblField = document.getElementById("tblField");
		tblField.querySelectorAll("button").forEach(
			button => button.setAttribute("tabindex", button === focusButton ? "0" : "-1")
		);
		const [_, row, col] = focusButton.parentElement.id.split("-");
		tblField.setAttribute("data-row", row);
		tblField.setAttribute("data-col", col);
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
					<gw-icon iconKey="flag" title="Unknown"></gw-icon>
				</button>`
			}
			case "dig": {
				return squareData.Cnt < 0 
					? `<gw-icon iconKey="bomb" title="mine"></gw-icon>` 
					: `<span data-Cnt="${squareData.Cnt}">${squareData.Cnt}</span>`;
			}
		}
	}

	ns.onSquareActivate = (event) => {
		const [_, row, col] = event.target.parentElement.id.split("-");
		ns.Data[row][col].Sts = getCurAction();
		setTimeout(() => ns.renderGame(), 0);
	};

	ns.onModeChange = (_event) => {
		updateButtons();
	};

	function updateButtons() {
		const curBtnLblEl = getCurBtnLblEl();
		document.querySelectorAll("#tblField button").forEach(btn => {
			btn.setAttribute("aria-labelledby", curBtnLblEl);
			switch(curBtnLblEl) {
				case "flag":
					btn.setAttribute("aria-pressed", btn.getAttribute("data-sts") === "flag");
					break;
				case "unknown":
					btn.setAttribute("aria-pressed", btn.getAttribute("data-sts") === "unknown");
					break;
				default:
					btn.setAttribute("aria-pressed", "false");
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
		GW.Minesweeper.generateGameData(20, 20, 0.15);
	}
	GW.Minesweeper.renderGame();
});
window.addEventListener("beforeunload", (event) => {});