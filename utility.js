// array of the "required" columns for each table, indexed by the table ID. 
// these are the table-lever indexes for columns which loaded tables should be sorted by, and which 
// players must have a nonzero value in at least one to be included in the CSV.
const tableColumns = [
	[], // filler
	[6, -1], // passing
	[6, -1], // rushing
	[7, -1], // recieving
	[6, 7], // defense
	[6, 9], // kicking
	[5, -1], // punting
	[6, 10], // returns
	[6, 7], // blocking
];

// array of the GET request stat IDs the table should be sorted on, used in loading a sorted table
const statColumns = [
	[], // filler
	[51, -1], // passing
	[10, -1], // rushing
	[40, -1], // recieving
	[23, 24], // defense
	[132, 112], // kicking
	[91, -1], // punting
	[151, 161], // returns
	[21, 22], // blocking
];

// This is really hacky. We actually want to pass in the URL, check for existing sort parameters, and then add/modify as appropriate.
function addSortParams(tableId) {
	var sortParams = "&stat2=" + statColumns[tableId][0];
	if (statColumns[tableId][1] != -1) {
		sortParams += "&stat3=" + statColumns[tableId][1];
	}
	console.log("sort params: '" + sortParams + "'");
	return sortParams;
}

// helper function to check if a given table row, from a table of the given type, contains a player with relevant playing time. 
function hasNonZeroSortValue(tableId, tableRow) {
	if (tableColumns[tableId][1] !== -1) {
		return tableRow[tableColumns[tableId][0]] !== "0" || tableRow[tableColumns[tableId][1]] !== "0"
	}
	else {
		return tableRow[tableColumns[tableId][0]] !== "0"
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

// main function to parse out league and table info and kick off page loads
function prepareLeaderboard(url) {
	//console.log(url);
	var playerLog = new Array();
	var league, year, tableId;

	try {
		// http://deeproute.com/?sel=lgleader&lifetime=&myleagueno=21&year=2115&typer=R&stat=4
		league = parseInt(getUrlParameter(url, "myleagueno"));
		year = parseInt(getUrlParameter(url, "year"));
		tableId = parseInt(getUrlParameter(url, "stat"));
		if (tableId <= 0 || tableId > 8) {
			throw "Invalid stat page ID: '" + tableId + "'";
		}
	} catch (e) {
		console.error(e);
	}
	console.log("league = '" + league + "'");

	// get the table column headers for the CSV 
	var inputHeaders = $("table.table-striped th").get().map(function(cell) {
		return $(cell).text();
	})
	playerLog.push(getOutputHeaders(inputHeaders));

	var loadCount = 0;
	var loadNext = true;
	while (loadNext) {
		var tempTable = loadLeaderboard(url, tableId, loadCount);
		//console.log(tempTable);

		// if there are exactly 250 valid rows (plus one row of filler), there may be more valid players on the next page. 
		if (tempTable.length !== 251) {
			loadNext = false;
			console.log("length = '" + tempTable.length + "', last load");
		} else {
			console.log("Not done, should load next page");
		}

		// start at index 1 to skip empty first row
		for (var i=1; i<tempTable.length; i++) {
			var rowArray = new Array();
			// "<a target="onepl" style="font-size:11px;" href="?js=oneplayer&amp;myleagueno=21&amp;lookatplayer=41306">Michael Mallak</a>"
			var $linkCell = $(tempTable[i][1]);
			var name = $linkCell.text();
			var playerId = getUrlParameter($linkCell.attr("href"), "lookatplayer");
			rowArray.push(name);
			rowArray.push(playerId);
			rowArray.push(league);
			rowArray.push(year);
			rowArray.push($(tempTable[i][2]).text()); // team abbr

			// start at index 3 to skip columns processed above 
			for (var j=3; j<tempTable[i].length; j++) {
				rowArray.push(tempTable[i][j]);
			}

			playerLog.push(rowArray);
		}
		loadCount++;
	}

	console.log(playerLog);
}

// synchronously load the leaderboard page and call the parsing function
function loadLeaderboard(url, tableId, iteration) {
	// hacktacular URL modifications that break on nonstandard input. Yaaaaaay...
	url += addSortParams(tableId);
	url += "&onpage=" + iteration;
	var tempTable;

	console.log("Loading next page...");
	$.ajax({
		url: url,
		type: "GET",
		async: false,
		success: function(result) {
			tempTable = parseLeaderboard(result, tableId)
		},
		error: function(error) {
			console.log("Error: " + error)
		}
	})

	return tempTable;
}

// helper function to parse leaderboard
function parseLeaderboard(page, tableId) {
	var $page = $(page);
	var $table = $page.find("table.table-striped tr");

	var tbl = $table.get().map(function(row) {
		return $(row).find('td').get().map(function(cell) {
			return $(cell).html();
		});
	});
	// console.log(tbl);
	var tempTable = new Array();
	var i = 0;
	var foundEmpty = false;
	while (i<tbl.length && !foundEmpty) {
		if (hasNonZeroSortValue(tableId, tbl[i])) {
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
	for (var i=2; i<inputHeaders.length; i++) {
		outputHeaders.push(inputHeaders[i]);
	}

	return outputHeaders;
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
