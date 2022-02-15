// stat IDs for the "primary" and "secondary" sort columns for each table

let defRunPlaysId = 23;
let defPassPlaysId = 24;
let fieldGoalAttemptsId = 112;
let extraPointAttempsId = 132;
let kickReturnsId = 151;
let puntReturnsId = 161;


// array of the "required" columns for each table, indexed by the table ID. 
// these are the table-level indexes for columns which loaded tables should be sorted by, and which 
// players must have a nonzero value in at least one to be included in the CSV.
const tableColumns = [
	[], // filler
	[6, 15], // passing
	[6, -1], // rushing
	[7, -1], // recieving
	[7, 6], // defense
	[9, 6], // kicking
	[5, -1], // punting
	[6, 10], // returns
	[7, 6] // blocking
];

// same as above, but for the all time leaders table. Double check these values, only 
const careerTableColumns = [
	[], // filler
	[5, 14], // passing
	[5, -1], // rushing
	[6, -1], // recieving
	[6, 5], // defense
	[8, 5], // kicking
	[4, -1], // punting
	[5, 9], // returns
	[6, 5] // blocking
];

// array of the GET request stat IDs the table should be sorted on, used in loading a sorted table
const statColumns = [
	[], // filler
	[51, 57], // passing
	[10, -1], // rushing
	[40, -1], // recieving
	[24, 23], // defense
	[112, 132], // kicking
	[91, -1], // punting
	[151, 161], // returns
	[22, 21] // blocking
];

const statNames = [
	[], // filler
	["ATT", "SCK"], // passing
	["ATT", -1], // rushing
	["TGT", -1], // recieving
	["DPP", "DRP"], // defense
	["FGA", "XPA"], // kicking
	["ATT", -1], // punting
	["KRET", "PREC"], // returns
	["OPP", "ORP"] // blocking
];

const leaderboardNames = [
	"", // filler
	"passing",
	"rushing",
	"recieving",
	"defense",
	"kicking",
	"punting",
	"returns",
	"blocking"
];

// This is really hacky. We actually want to pass in the URL, check for existing sort parameters, and then add/modify as appropriate.
function addSortParams(tableId, sortId) {
	var sortParams;
	if (tableId <= 3 || tableId == 6) {
		sortParams = "&stat2=" + statColumns[tableId][0];
	} else {
		sortParams = "&stat2=" + sortId;
	}
	console.log("sort params: '" + sortParams + "'");
	return sortParams;
}

// helper function to check if a given table row, from a table of the given type, contains a player with relevant playing time. 
function hasNonZeroSortValue(tableId, tableRow, isAllTimeLeaders) {
	// check for a nonzero value for "games", the only valid default sort param
	return tableRow[3] !== "0";
}

// filter out leaderboard rows with zero values in all required stats
function leaderboardFilter(e, tableId, isAllTimeLeaders) {
	if (isAllTimeLeaders) {
		if (e[careerTableColumns[tableId][0]] !== "0") {
			return true;
		} else {
			return careerTableColumns[tableId][1] !== -1 && e[careerTableColumns[tableId][1]] !== "0";
		}
	} else {
		if (e[tableColumns[tableId][0]] !== "0") {
			return true;
		} else {
			return tableColumns[tableId][1] !== -1 && e[tableColumns[tableId][1]] !== "0";
		}
	}
}

// hacky substitute for above to download All Time Leaders table
function hasNonZeroSortValueCareer(tableId, tableRow) {
	if (careerTableColumns[tableId][1] !== -1) {
		return tableRow[careerTableColumns[tableId][0]] !== "0" || tableRow[careerTableColumns[tableId][1]] !== "0"
	}
	else {
		return tableRow[careerTableColumns[tableId][0]] !== "0"
	}
}

// check if the given URL has a valid year parameter
function urlHasYear(url) {
	var year;
	try {
		year = parseInt(getUrlParameter(url, "year"));
	} catch (e) {
		console.log("Cannot download leaderboard because " + e);
		return false;
	}
	//console.log("Found year = '" + year + "'");
	return true;
}

// helper function to pull parameter values from a URL
function getUrlParameter(sPageURL, sParam) {
	var sURLVariables = sPageURL.split('&');
	var sParameterName;
	var i;

	for (i = 0; i < sURLVariables.length; i++) {
		sParameterName = sURLVariables[i].split('=');

		if (sParameterName[0] === sParam) {
			if (sParameterName[1] !== undefined) {
				//console.log("Parameter '"  + sParam + "' = '" + decodeURIComponent(sParameterName[1]) + "'");
				return decodeURIComponent(sParameterName[1]);
			} else {
				throw "Parameter '" + sParam + "' is undefined in URL '" + sPageURL + "'";
			}
		}
	}
	throw "Parameter '" + sParam + "' not present in URL '" + sPageURL + "'";
}

function addRadioButtons(leaderboardId, $radio_span) {
	$radio_span.attr("data-sortid", statColumns[leaderboardId][0]);
	$radio_span.append('Sorted by ' + statNames[leaderboardId][0]);
	if (statNames[leaderboardId][1] != -1) {
		$radio_span.append(', ' + statNames[leaderboardId][1]);
	}

	// if (leaderboardId <= 3 | leaderboardId == 6) {
	// 	$radio_span.attr("data-sortid", statColumns[leaderboardId][0]);
	// 	$radio_span.append('Sorted by ' + statNames[leaderboardId][0]);
	// } else {
	// 	$radio_span.append('Sorted by:');
	// 	$radio_span.append("<br/>");
	// 	$radio_span.append('<input type="radio" name="leaderboard_sort" value="' + statColumns[leaderboardId][0] + '" checked>');
	// 	$radio_span.append('<label for="leaderboard_sort"> ' + statNames[leaderboardId][0] + '</label>');
	// 	$radio_span.append("<br/>");
	// 	$radio_span.append('<input type="radio" name="leaderboard_sort" value="' + statColumns[leaderboardId][1] + '">');
	// 	$radio_span.append('<label for="leaderboard_sort"> ' + statNames[leaderboardId][1] + '</label>');
	// }
} 

// main function to parse out league and table info and kick off page loads
function prepareLeaderboard(url, sortId) {
	//console.log(url);
	var playerLog = new Array();
	var league, year, tableId, lifetime;
	var isAllTimeLeaders = false;

	try {
		// http://deeproute.com/?sel=lgleader&lifetime=&myleagueno=21&year=2115&typer=R&stat=4
		league = parseInt(getUrlParameter(url, "myleagueno"));
		year = parseInt(getUrlParameter(url, "year"));
		tableId = parseInt(getUrlParameter(url, "stat"));
		lifetime = getUrlParameter(url, "lifetime");
		//console.log("lifetime = '" + lifetime + "'");
		if (lifetime == "Y") {
			isAllTimeLeaders = true;
			console.log("All time leaders!");
		}

		if (tableId <= 0 || tableId > 8) {
			throw "Invalid stat page ID: '" + tableId + "'";
		}
	} catch (e) {
		console.error(e);
	}
	console.log("league = '" + league + "'");

	var loadCount = 0;
	var loadNext = true;
	while (loadNext) {
		var tempTable = loadLeaderboard(url, tableId, sortId, loadCount, isAllTimeLeaders);
		console.log("loaded page " + loadCount);
		//console.log(tempTable);

		// if there are exactly 500 valid rows (plus one row of filler), there may be more valid players on the next page. 
		if (tempTable.length !== 501) {
			loadNext = false;
			console.log("length = '" + tempTable.length + "', last load");
		} else {
			//console.log("Not done, should load next page");
		}

		// start at index 1 to skip empty first row
		for (var i=1; i<tempTable.length; i++) {
			if (leaderboardFilter(tempTable[i], tableId, isAllTimeLeaders)) {
				var rowArray = new Array();
				// "<a target="onepl" style="font-size:11px;" href="?js=oneplayer&amp;myleagueno=21&amp;lookatplayer=41306">Michael Mallak</a>"
				var $linkCell = $(tempTable[i][1]);
				var name = $linkCell.text();
				var playerId = getUrlParameter($linkCell.attr("href"), "lookatplayer");
				rowArray.push(name);
				rowArray.push(playerId);
				rowArray.push(league);
				rowArray.push(year);
				if (!isAllTimeLeaders) {
					rowArray.push($(tempTable[i][2]).text()); // team abbr

					// start at index 3 to skip columns processed above 
					for (var j=3; j<tempTable[i].length; j++) {
						rowArray.push(tempTable[i][j]);
					}
				} else {
					// no team abbr in the All Time Leaders table so we start at index 2
					for (var j=2; j<tempTable[i].length; j++) {
						rowArray.push(tempTable[i][j]);
					}
				}

				playerLog.push(rowArray);
			}
		}
		loadCount++;
	}

	// sort the array of players by the correct values
	playerLog = playerLog.sort((a, b) => {
		if (isAllTimeLeaders) {
			if (a[careerTableColumns[tableId][0]+2] === b[careerTableColumns[tableId][0]+2]) {
				if (careerTableColumns[tableId][1] !== -1 && a[careerTableColumns[tableId][1]+2] !== b[careerTableColumns[tableId][1]]+2) {
					return parseInt(a[careerTableColumns[tableId][1]+2]) < parseInt(b[careerTableColumns[tableId][1]+2]) ? 1 : -1;
				} else {
					return 0;
				}
			} else {
				return parseInt(a[careerTableColumns[tableId][0]+2]) < parseInt(b[careerTableColumns[tableId][0]+2]) ? 1 : -1;
			}
		} else {
			if (a[tableColumns[tableId][0]+2] === b[tableColumns[tableId][0]+2]) {
				if (tableColumns[tableId][1] !== -1 && a[tableColumns[tableId][1]+2] !== b[tableColumns[tableId][1]+2]) {
					return parseInt(a[tableColumns[tableId][1]+2]) < parseInt(b[tableColumns[tableId][1]+2]) ? 1 : -1;
				} else {
					return 0;
				}
			} else {
				return parseInt(a[tableColumns[tableId][0]+2]) < parseInt(b[tableColumns[tableId][0]+2]) ? 1 : -1;
			}
		}
	});

	// get the table column headers for the CSV 
	var inputHeaders = $("table.table-striped th").get().map(function(cell) {
		return $(cell).text();
	})
	playerLog.unshift(getOutputHeaders(inputHeaders));

	//console.log(playerLog);
	//console.log(nestedArrayToCsv(playerLog));
	var filename = "lg" + league + "_" + year + "_" + leaderboardNames[tableId] + (isAllTimeLeaders ? "_career" : "_") + "leaders.csv";
	download(nestedArrayToCsv(playerLog), filename, "text.csv");
}

// synchronously load the leaderboard page and call the parsing function
function loadLeaderboard(url, tableId, sortId, iteration, isAllTimeLeaders) {
	// hacktacular URL modifications that break on nonstandard input. Yaaaaaay...
	url += addSortParams(tableId, sortId);
	url += "&onpage=" + iteration;
	var tempTable;

	console.log("Loading next page...");
	//console.log(url);
	$.ajax({
		url: url,
		type: "GET",
		async: false,
		success: function(result) {
			tempTable = parseLeaderboard(result, tableId, isAllTimeLeaders)
		},
		error: function(error) {
			console.log("Error: " + error)
		}
	})

	return tempTable;
}

// helper function to parse leaderboard
function parseLeaderboard(page, tableId, isAllTimeLeaders) {
	var $page = $(page);
	var $table = $page.find("table.table-striped tr");

	var tbl = $table.get().map(function(row) {
		return $(row).find('td').get().map(function(cell) {
			return $(cell).html();
		});
	});
	//console.log(tbl);
	var tempTable = new Array();
	var i = 0;
	var foundEmpty = false;
	while (i<tbl.length && !foundEmpty) {
		if (hasNonZeroSortValue(tableId, tbl[i], isAllTimeLeaders)) {
			tempTable.push(tbl[i]);
		} else {
			foundEmpty = true;
		}
		i++;
	}
	return tempTable;
}

// helper function to create an array of appropriate table headers for the CSV 
function getOutputHeaders(inputHeaders) {
	var outputHeaders = new Array();
	outputHeaders.push("Name");
	outputHeaders.push("ID");
	outputHeaders.push("League");
	outputHeaders.push("Year");

	// start at index 2 to skip over Rank (not wanted) and Name (already handled)
	for (var i=1; i<inputHeaders.length; i++) {
		outputHeaders.push(inputHeaders[i]);
	}

	return outputHeaders;
}

function nestedArrayToCsv(content) {
	var csv = content.map(function(row) {
		return row.valueOf();
	}).join("\n");

	return csv;
}

// helper function to download files
function download(content, fileName, contentType) {
	var a = document.createElement("a");
	var file = new Blob([content], {
		type: contentType
	});
	a.href = URL.createObjectURL(file);
	a.download = fileName;
	a.click();
}
