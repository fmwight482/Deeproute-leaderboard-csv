$(document).ready(function () {
	if (urlHasYear(window.location.href)) {
		let leaderboardId = getUrlParameter(window.location.href, "stat");

		//create a button
		$button = $('<input id="download_csv" type="button"class="btn"  style="font-size: 10pt; font-weight: bold; height: 30px;" value="Download CSV" >');

		$download_panel = $('<div id="csv_download_panel">');
		$radio_span = $('<span id="csv_sort_selector">');
		$download_panel.append($button);
		$download_panel.append("<br/>");
		$download_panel.append($radio_span);
		addRadioButtons(leaderboardId, $radio_span);

		// this is a terrible selector, but most of the elements on this page are without class or id
		$download_panel.appendTo($('td > center').first());

		//attach event handlers
		$('#download_csv').click(function(){
			let sortId = $('input[name="leaderboard_sort"]:checked').val();
			console.log("sortId = " + sortId);
			prepareLeaderboard(window.location.href, sortId);
		});
	}
});