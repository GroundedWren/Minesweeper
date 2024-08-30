/**
 * @file Minesweeper scripts
 * @author Vera Konigin vera@groundedwren.com
 */
 
window.GW = window.GW || {};
(function Minesweeper(ns) {
	
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
});
window.addEventListener("beforeunload", (event) => {});