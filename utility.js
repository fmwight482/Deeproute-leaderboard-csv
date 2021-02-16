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

function addSortParams(tableId) {
	var sortParams = "&stat2=" + statColumns[tableId][0];
	if (statColumns[tableId][1] != -1) {
		sortParams += "&stat3=" + statColumns[tableId][1];
	}
	console.log("sort params: '" + sortParams + "'");
	return sortParams;
}

function hasNonZeroSortValue(tableId, tableRow) {
	if (tableColumns[tableId][1] !== -1) {
		return tableRow[tableColumns[tableId][0]] !== "0" && tableRow[tableColumns[tableId][1]] !== "0"
	}
	else {
		return tableRow[tableColumns[tableId][0]] !== "0"
	}
}

// function to parse out league and table info and kick off page loads
function prepareLeaderboard(url) {
	//console.log(url);
	var player_log = [];
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

	url += addSortParams(tableId);

	console.log("Loading next page...");
	$.ajax({
		url: url,
		type: "GET",
		success: function(result) {
			parseLeaderboard(result, player_log, tableId)
		},
		error: function(error) {
			console.log("Error: " + error)
		}
	})
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

function getUrlParameter(sPageURL, sParam) {
	var sURLVariables = sPageURL.split('&');
	var sParameterName;
	var i;

	for (i = 0; i < sURLVariables.length; i++) {
		sParameterName = sURLVariables[i].split('=');

		if (sParameterName[0] === sParam) {
			if (sParameterName[1] !== undefined) {
				console.log("Parameter '"  + sParam + "' = '" + decodeURIComponent(sParameterName[1]) + "'");
				return decodeURIComponent(sParameterName[1]);
			} else {
				throw "Parameter '" + sParam + "' is undefined in URL '" + sPageURL + "'";
			}
		}
	}
	throw "Parameter '" + sParam + "' not present in URL '" + sPageURL + "'";
}

// helper function to parse leaderboard
function parseLeaderboard(page, player_log, tableId) {
	var $page = $(page);
	var $table = $page.find("table.table-striped tr");

	var tbl = $table.get().map(function(row) {
		return $(row).find('td').get().map(function(cell) {
			return $(cell).html();
		});
	});
	// console.log(tbl);
	var finalTable = new Array();
	var i = 0;
	var foundEmpty = false;
	while (i<tbl.length && !foundEmpty) {
		if (hasNonZeroSortValue(tableId, tbl[i])) {
			finalTable.push(tbl[i]);
		} else {
			foundEmpty = true;
		}
		i++;
	}
	console.log(finalTable);
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
