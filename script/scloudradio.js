var appName = 'sCloudRadio';
var playChar = '►';
var pauseChar = '❚❚';

$.scPlayer.defaults.apiKey = "7505ba89836a0d78acff0395c85030b7";
$.scPlayer.defaults.onDomReady = null;
$.scPlayer.defaults.autoPlay = true;
var soundcloudAPIUrl = "http://api.soundcloud.com/tracks.json?duration[from]=60000&duration[to]=1560000";

var playedTracks, similarArtists, artist, bannedArtists;
var playedTracksMemoryLimit = 500;

var similarArtistsLimit = 20;
var lastFMSimilarArtistsLimit = 5;
var lastFMSimilarArtistsMatch = 0.5;
var lastFMAPIKey = "de7b54a87e02aa8334e32ebadc0dfa3e";
var lastFMAPIUrl = "http://ws.audioscrobbler.com/2.0/?callback=?";

var soundCloudItemObject;
var broadcastBars = 0;
var broadcastBarsMax = 3;
var inputText = 'type an artist name, press enter and voilà !!!';

$(document).ready(function() {
	$("#artist-input").attr("value", inputText);
	$("#artist-input").focus(function() {
		if($(this).attr("value") == inputText) $(this).attr("value", "");
	});
	$("#artist-input").blur(function() {
		if($(this).attr("value") == "") $(this).attr("value", inputText);
	});
	setInterval(animateBroadcasting, 2500);
});

$('#skip').bind("click", function(event) {
	event.preventDefault();
	$('.sc-player').trigger('scPlayer:onMediaEnd');
});

$('#stop').bind("click", function(event) {
	event.preventDefault();
	stop(artist + " radio stopped!");
});

$('#about').bind("click", function(event) {
	event.preventDefault();
});

function stop(msg){
	$.scPlayer.stopAll();
	$("#artist-input").attr("value", inputText);
	$(document).attr("title", appName);
	$("#radio-header").hide("slide", { direction: "left" }, "fast");
	$("#current-track").hide("slide", { direction: "right" }, "fast");
	$("#radio-panel").hide("slide", { direction: "left" }, "normal");
	$("#welcome-panel").show("slide", { direction: "right" }, "slow");
	$("#radio-header").empty();
	$("#current-track").empty();
	$("#radio-error").append(msg);
	$("#radio-error").show("pulsate", { direction: "top" }, "slow", function() {$("#radio-error").hide("puff",{},"fast");});
}

$(document).bind('scPlayer:onMediaEnd', function() {
	$("#current-track").hide("slide", { direction: "right" }, "fast");
	$(document).attr("title", appName); 
	nextArtistPlease();
	$("#loading").show("scale", {}, "slow");
});

$(document).bind('scPlayer:onAudioReady', function() {
	$("#loading").hide("scale", {}, "slow");
	$("#current-track").show("slide", { direction: "right" }, "slow");
	updateDocumentTitle(playChar, soundCloudItemObject);
});

$(document).bind('scPlayer:onMediaPause', function() {
	updateDocumentTitle(pauseChar, soundCloudItemObject);
	updateCurrentTrackInfo(pauseChar, soundCloudItemObject);
});

$(document).bind('scPlayer:onMediaPlay', function() {
	updateDocumentTitle(playChar, soundCloudItemObject);
	updateCurrentTrackInfo(playChar, soundCloudItemObject);
});

function updateDocumentTitle(playStatus, soundCloudItemObject) {
	$(document).attr("title", playStatus+ "  " + soundCloudItemObject.title + " (by " 
					+ soundCloudItemObject.user.username + ")" + " :: " + appName); 
}

$('#artist-form').submit(function(event) {
	event.preventDefault();
	initialiseVars();
	if (artist == "") {
		return false;
	}
	animateBroadcasting();
	$('#welcome-panel').hide("slide", { direction: "right" }, "slow");
	$('#radio-panel').show("slide", { direction: "left" }, "slow");
	$("#radio-header").show("slide", { direction: "left" }, "slow");
	$("#loading").show("scale", {}, "slow");
	findAndPlayTrack(artist);
});

function initialiseVars(){
	playedTracks = new Hashtable();
	similarArtists = new Hashtable();
	bannedArtists = new Hashtable();
	artist = $("input#artist-input").val();
	$("#radio-error").empty();
}

function animateBroadcasting() {
	var rightBroadcastBarString = '';
	if (broadcastBars > broadcastBarsMax)
		broadcastBars = 0;
	
	for (var i=0; i<broadcastBars; i++) {
		rightBroadcastBarString += '<b>)</b>';
	}
	
	animationString = ' tuned into <a href="http://www.last.fm/search?q='+artist+'&type=artist" title="search on last.fm" target="_blank"><i><b>' + artist + '</b></i></a> radio station ' + rightBroadcastBarString;
	$('#radio-header').empty();
	$('#radio-header').append(animationString);
	broadcastBars++;
}

function findAndPlayTrack(artist) {
	if (playedTracks.size() > playedTracksMemoryLimit) {
		playedTracks = new Hashtable();
		console.debug('played tracks reset');
	}
	
	populateSimilarArtistsFromLastFM(artist);
	
	try {
		var artistInUsernamePattern = new RegExp('^(' +artist+ ')\\s*$','i');
		var artistInTitlePattern = new RegExp('^(' +artist+ ')\\s*-','i');
	}
	catch (exception) {
		console.error(exception.message);
		nextArtistPlease();
	}
	
	$.ajax({
		url: soundcloudAPIUrl,
  		data: {
    		client_id: $.scPlayer.defaults.apiKey,
    		q: artist,
    		filter: "public,streamable",
			//order: "hotness"
			//duration[from]: "60000",
			//duration[to]: "1560000"
  		},
		dataType: 'json',
		
		success: function(data) {
			//$.each(data, function(i, soundCloudItem) {
			console.log("result length : " + data.length)
			while (data.length > 0) {
				randomIndex = Math.floor(Math.random() * data.length);
				var soundCloudItem = data[randomIndex];
				data.splice(randomIndex, 1);
				//console.log(soundCloudItem)
				
				if(soundCloudItem.user.username.match(artistInUsernamePattern)) {
					console.debug(soundCloudItem.user.username + ": artist in username matched");
					if (!playedTracks.containsKey(soundCloudItem.permalink_url)) {
						playTrack(artist, soundCloudItem);
						//return false; //escape 'each' loop
						break; //escape while loop
					}
					else
						console.log(soundCloudItem.title + ": track already played, skipping ...");
				}	
			
				if(soundCloudItem.title.match(artistInTitlePattern)) {
					console.debug(soundCloudItem.title + ": artist in title matched");
					if (!playedTracks.containsKey(soundCloudItem.permalink_url)) {
						playTrack(artist, soundCloudItem);
						//return false; //escape 'each' loop
						break; //escape while loop
					}
					else
						console.log(soundCloudItem.title + ": track already played, skipping ...");
				}
		
				//console.debug(soundCloudItem.user.username+ " or " +soundCloudItem.title+": no match - loop failed");
				//console.debug(soundCloudItem.title+": no match - loop failed");
			
				//if (i == (data.length - 1)) {
				//	 noSoundcloudResults(artist);
				//}
  			}
			
			if (data.length == 0) {
				noSoundcloudResults(artist);
			}

		},
		error:function (xhr, ajaxOptions, thrownError){
			console.error("Soundcloud ajax error : " + thrownError);
			nextArtistPlease();
		}
	});
}

function noSoundcloudResults(artist) {
	if (!bannedArtists.containsKey(artist.toLowerCase()))
		bannedArtists.put(artist.toLowerCase(), ""); // never search for that artist again (saves a lot of time)
	console.debug(artist+ ": nothing found on soundcloud, added to ban list!");
	console.debug("banned artists: "+ bannedArtists.keys());
	
	nextArtistPlease();
}

function nextArtistPlease() {
	console.debug("similarArtists.size() :" +similarArtists.size());
	if (similarArtists.size() > 0) {
		var nextArtist = similarArtists.keys()[Math.floor(Math.random() * similarArtists.size())];
		console.log("next artist: "+ nextArtist);
		similarArtists.remove(nextArtist);
		findAndPlayTrack(nextArtist);
	}
	else {
		var msg;
		if (playedTracks.size()==0)
			msg = "can't start radio for "+ artist +"!<br/> how about trying a different artist?";
		else
			msg = artist + " radio has finished!<br/> how about trying for a different artist?";
		stop(msg);
	}
}

function playTrack(artist, soundCloudItem) {
	$("#radio-container").empty();
	var $playerLink = 
		$("<a href=\"" +soundCloudItem.permalink_url+ "\">" +soundCloudItem.title+ 	"</a>").appendTo("#radio-container");
	try {
		$playerLink.scPlayer();
	}
	catch (exception) {
		console.error(exception.message);
		nextArtistPlease();
	}
	
	updateCurrentTrackInfo(playChar, soundCloudItem);
	
	soundCloudItemObject = soundCloudItem;
	
	playedTracks.put(soundCloudItem.permalink_url, "");
	console.debug('played tracks no : ' + playedTracks.size());
}

function updateCurrentTrackInfo(playStatus, soundCloudItemObject) {
	$("#current-track").empty();
	$("#current-track").append(playStatus + ' <a href="' +soundCloudItemObject.permalink_url+ '" target="_blank" title="'+soundCloudItemObject.permalink_url+'"> '+soundCloudItemObject.title+' </a>');
	$("#current-track").append('<br/>(by <a href="' +soundCloudItemObject.user.permalink_url+ '" target="_blank" title="'+soundCloudItemObject.user.permalink_url+'">' +soundCloudItemObject.user.username+ '</a>)');
}

function populateSimilarArtistsFromLastFM(artist) {
	if (similarArtists.size() > similarArtistsLimit)
		return false;
	
	$.ajax({
		url: lastFMAPIUrl,
		data: {
			method: "artist.getsimilar",
    		api_key: lastFMAPIKey,
    		artist: artist,
			limit: lastFMSimilarArtistsLimit,
			autocorrect: "1",
			format: "json",
  		},
		dataType: 'json',
		async: true,
		success: function(data) {
			if (data.similarartists) {
				$.each(data.similarartists.artist, function(i,lastfmItem) {
					if (lastfmItem.match >= lastFMSimilarArtistsMatch)
						if (!similarArtists.containsKey(lastfmItem.name) && !bannedArtists.containsKey(lastfmItem.name.toLowerCase()))
							similarArtists.put(lastfmItem.name, "");
  						});
				console.debug("similar artists: "+ similarArtists.keys());
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.error("last.fm error : " + errorThrown);
		}
	});
}
