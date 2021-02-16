$(document).ready(function () {
	if (urlHasYear(window.location.href)) {
		//create a button
		$button = $('<input id="download_csv" type="button" style="font-size: 10pt; font-weight: bold; height: 30px;" value="Download CSV" >');
		// this is a terrible selector, but most of the elements on this page are without class or id
		$button.appendTo('td > center');

		//attach event handlers
		$('#download_csv').click(function(){
		//alert(window.location);
		prepareLeaderboard(window.location.href);
		//parse_leaderboard($('table.table.table-striped.table-condensed'), []);
		});
	}
});