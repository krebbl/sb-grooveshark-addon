if( typeof (Cc) == "undefined")
	var Cc = Components.classes;
if( typeof (Ci) == "undefined")
	var Ci = Components.interfaces;
if( typeof (Cu) == "undefined")
	var Cu = Components.utils;

if( typeof (songbirdMainWindow) == "undefined")
	var songbirdMainWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
	.getService(Ci.nsIWindowMediator)
	.getMostRecentWindow("Songbird:Main").window;

if( typeof (gBrowser) == "undefined")
	var gBrowser = Cc["@mozilla.org/appshell/window-mediator;1"]
	.getService(Ci.nsIWindowMediator)
	.getMostRecentWindow("Songbird:Main").window.gBrowser;

if( typeof (ioService) == "undefined")
	var ioService = Cc["@mozilla.org/network/io-service;1"]
	.getService(Ci.nsIIOService);

if( typeof (gMetrics) == "undefined")
	var gMetrics = Cc["@songbirdnest.com/Songbird/Metrics;1"]
	.createInstance(Ci.sbIMetrics);

const groovesharkTempLibGuid = "extensions.grooveshark-addon.templib.guid";
const groovesharkLibraryGuid = "extensions.grooveshark-addon.library.guid";
const groovesharkPlaylistInit = "extensions.grooveshark-addon.plsinit";
const groovesharkDirectoryInit = "extensions.grooveshark-addon.directoryinit";
const groovesharkPlaylistLibGuid = "extensions.grooveshark-addon.playlistlib.guid";

var GroovesharkDirectory = {
	directoryList : null,
	playlist: null,
	library : null,
	playlistLibrary: null,
	tempLib : null,
	tempView : null,
	searchBox : null,
	downloader : null,
	downloadQueue : [],
	isDownloading : false,
	isInitialized : false,
	commands : null,
	init : function() {
		GroovesharkAPI.startSession();

		this.searchBox = document.getElementById('grooveshark-search-box');
		this.searchBox.onchange = function(event) {
			GroovesharkDirectory.search(this.value);
		};
		// Setup our references to the SHOUTcast libraries
		this.getLibraries();

		// create playlist commands
		this.commands = Cc["@songbirdnest.com/Songbird/PlaylistCommandsBuilder;1"].createInstance(Ci.sbIPlaylistCommandsBuilder);

		// var commands = new PlaylistCommandsBuilder();
		// commands.removeAllCommands();
		this.commands.appendAction(null, "download", "Download", "Do something cool", function(aContext) {
			var enumerator = aContext.playlist.mediaListView.selection.selectedMediaItems;
			var gs = GroovesharkDirectory;
			while(enumerator.hasMoreElements()) {
				// alert(enumerator.getNext())
				var item = enumerator.getNext();
				gs.addToDownloadList(item);
			}

		});
		this.commands.appendAction(null, "enqueueToPlaylist", "Enqueue", "Do somthing very cool", function(aContext){
			var enumerator = aContext.playlist.mediaListView.selection.selectedMediaItems;
			var gs = GroovesharkDirectory;
			while(enumerator.hasMoreElements()) {
				// alert(enumerator.getNext())
				var item = enumerator.getNext();
				gs.playlist.mediaList.add(item);
			}
		});
		
		var commandsManager = Cc["@songbirdnest.com/Songbird/PlaylistCommandsManager;1"].getService(Ci.sbIPlaylistCommandsManager);
		
		commandsManager.registerPlaylistCommandsMediaItem(this.library.guid, "", this.commands);
		
		// Bind the playlist widget to our library
		this.directoryList = document.getElementById("grooveshark-directory");
		var libraryManager = Cc['@songbirdnest.com/Songbird/library/Manager;1'].getService(Ci.sbILibraryManager);

		this.directoryList.bind(this.library.createView());
		this.tempView = this.library.createView();
		
		this.playlist = this.playlistLibrary.createView();
		
		// Enumerate all columns in the playlist
		var playlistcolumns = this.directoryList.tree.columns;
		var columnbinds = [];
		for(var i = 0; i < playlistcolumns.length; i++) {
			// Get the bind url for each column
			columnbinds.push(playlistcolumns.getColumnAt(i).element.getAttribute("bind"));
		}
		// If this is the first time we've loaded the playlist or we have
		// no Name column, clear the normal columns and use the stream ones
		// alert(Application.prefs.getValue(groovesharkPlaylistInit,false))

		// this.directoryList.addEventListener("Play", onPlay, false);

		var gMM = Cc["@songbirdnest.com/Songbird/Mediacore/Manager;1"].getService(Ci.sbIMediacoreManager);
		// alert(Cc["@songbirdnest.com/Songbird/FileDownloader;1"]);

		// var mcListener = Cc["@songbirdnest.com/Songbird/PlaylistReaderListener;1"].getService(Ci.nsIIOService);
		var mediaCoreListener = {
			onMediacoreEvent : function(event) {
				switch (event.type) {
					case Ci.sbIMediacoreEvent.BEFORE_TRACK_CHANGE:
						var item = event.data;
						var loaded = item.getProperty("uriLoaded");

						if(!loaded || loaded == "0") {
							item.setProperty('uriLoaded', "1");
							item.setProperty('firstTimePlayed', "0");
							beforePlay(item);
							// alert("loaded = 0");
						}
						break;
					case Ci.sbIMediacoreEvent.TRACK_CHANGE:
						var item = event.data;
						var played = item.getProperty('firstTimePlayed');
						if(!played || played == "0") {
							gMM.sequencer.abort();

							item.setProperty('firstTimePlayed', "1");

							var view = gMM.sequencer.view;
							var pos = gMM.sequencer.viewPosition;

							// gMM.sequencer.playURL(item.contentSrc);

							gMM.sequencer.playView(view, pos);

						} else {

							item.setProperty('firstTimePlayed', "0");
							item.setProperty('uriLoaded', "0");
						}
						break;
				}
			}
		}
		gMM.addListener(mediaCoreListener);
	},
	unload : function() {
		var commandsManager = Cc["@songbirdnest.com/Songbird/PlaylistCommandsManager;1"].getService(Ci.sbIPlaylistCommandsManager);
		commandsManager.unregisterPlaylistCommandsMediaItem(this.library.guid, "", this.commands);
		
	},
	getLibraries : function() {
		var libraryManager = Cc["@songbirdnest.com/Songbird/library/Manager;1"]
		.getService(Ci.sbILibraryManager);
		
		// search library
		var libGuid = Application.prefs.getValue(groovesharkLibraryGuid, "");
		if(libGuid != "") {
			try {
				this.library = libraryManager.getLibrary(libGuid);
			} catch(e) {
				// If we have an invalid GUID, we act like we have no GUID
				libGuid = "";
			}
		}
		if(libGuid == "") {
			this.library = createLibrary("grooveshark_library", null, false);
			// doesn't manifest itself in any user visible way, so i think
			// it's safe to not localise
			this.library.name = "Grooveshark";
			this.library.setProperty(SBProperties.hidden, "1");
			dump("*** Created Grooveshark library, GUID: " + this.library.guid);
			libraryManager.registerLibrary(this.library, true);
			Application.prefs.setValue(groovesharkLibraryGuid, this.library.guid);
		}
		
		// playlist library
		var libGuid = Application.prefs.getValue(groovesharkPlaylistLibGuid, "");
		if(libGuid != "") {
			try {
				this.playlistLibrary = libraryManager.getLibrary(libGuid);
			} catch(e) {
				// If we have an invalid GUID, we act like we have no GUID
				libGuid = "";
			}
		}
		if(libGuid == "") {
			this.playlistLibrary = createLibrary(groovesharkPlaylistLibGuid, null, false);
			// doesn't manifest itself in any user visible way, so i think
			// it's safe to not localise
			this.playlistLibrary.name = "Grooveshark Playlist";
			this.playlistLibrary.setProperty(SBProperties.hidden, "1");
			dump("*** Created Grooveshark library, GUID: " + this.playlistLibrary.guid);
			libraryManager.registerLibrary(this.playlistLibrary, true);
			Application.prefs.setValue(groovesharkPlaylistLibGuid, this.playlistLibrary.guid);
		}
	},
	search : function(query) {
		// alert("search :" + query)
		var songs = [];
		songs = songs.concat(GroovesharkAPI.getSearchResults(query));
		// songs.concat(GroovesharkAPI.getSearchResults(query,'Artists'));
		// songs.concat(GroovesharkAPI.getSearchResults(query,'Albums'));
		this.loadTable(songs);
	},
	loadTable : function(songs) {
		this.library.clear();

		var trackArray = Cc["@songbirdnest.com/moz/xpcom/threadsafe-array;1"].createInstance(Ci.nsIMutableArray);
		var propertiesArray = Cc["@songbirdnest.com/moz/xpcom/threadsafe-array;1"].createInstance(Ci.nsIMutableArray);

		for(var i = 0; i < songs.length; i++) {

			var song = songs[i];
			var id = song.SongID;

			var props = Cc[
			"@songbirdnest.com/Songbird/Properties/MutablePropertyArray;1"]
			.createInstance(Ci.sbIMutablePropertyArray);

			props.appendProperty(SBProperties.trackName, song.SongName);
			props.appendProperty(SBProperties.artistName, song.ArtistName);
			props.appendProperty(SBProperties.albumName, song.AlbumName);
			props.appendProperty(GS_id, parseInt(id));
			props.appendProperty(GS_url_loaded, "NO");

			propertiesArray.appendElement(props, false);
			var url = "http://grooveshark.com?id=" + id;

			var uri = ioService.newURI(url, null, null);
			trackArray.appendElement(uri, false);
		}
		GroovesharkDirectory.library.batchCreateMediaItemsAsync(libListener, trackArray, propertiesArray, false);
	},
	downloadItems : function() {
		if(!this.downloader) {
			this.downloader = Cc["@songbirdnest.com/Songbird/FileDownloader;1"].createInstance(Ci.sbIFileDownloader);
			var downloadListener = {
				onProgress : function() {

				},
				onComplete : function() {
					var gs = GroovesharkDirectory;
					gs.onDowloadComplete();
				}
			}
			this.downloader.listener = downloadListener;
		}

		if(!this.isDownloading && this.downloadQueue.length > 0) {
			var dItem = this.downloadQueue[0];
			beforePlay(dItem);
			var artist = dItem.getProperty(SBProperties.artistName);
			var track = dItem.getProperty(SBProperties.trackName);

			var obj_TargetFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
			obj_TargetFile.initWithPath("/Users/krebbl/Downloads/GrooveDown/" + artist + " - " + track + ".mp3");
			if(!obj_TargetFile.exists()) {
				obj_TargetFile.create(0x00, 0644);
			}

			this.isDownloading = true;

			this.downloader.destinationFile = obj_TargetFile;
			this.downloader.sourceURI = dItem.contentSrc;
			this.downloader.start();
		}

	},
	addToDownloadList : function(item) {
		this.downloadQueue.push(item);
		this.downloadItems();
	},
	onDowloadComplete : function() {
		var item = this.downloadQueue.shift();

		var artist = item.getProperty(SBProperties.artistName);
		var track = item.getProperty(SBProperties.trackName);

		// alert("Download Complete: " + artist + " - " + track);
		if(this.downloadQueue.length == 0){
			alert("All Downloads completed");
		}
		
		this.isDownloading = false;
		this.downloadItems();
	}
}

function onPlay(event) {
	var item = GroovesharkDirectory.playlist.mediaListView.selection.currentMediaItem;

	event.stopPropagation();
	// event.preventDefault();
}

function beforePlay(item) {
	var id = item.getProperty(GS_id);
	var name = item.getProperty(SBProperties.trackName);

	// var plsURL = GroovesharkAPI.getStreamURL(id);
	// var plsMgr = Cc["@songbirdnest.com/Songbird/PlaylistReaderManager;1"].getService(Ci.sbIPlaylistReaderManager);
	var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
	var url = GroovesharkAPI.getStreamURL(id);
	// alert(url);
	var uri = ioService.newURI(url, null, null);
	item.contentSrc = uri;
	item.setProperty(GS_url_loaded, "YES");
}

function onNext(event) {
	alert("Next");
}

function createLibrary(databaseGuid, databaseLocation, init) {
	if( typeof (init) == "undefined")
		init = true;

	var directory;
	if(databaseLocation) {
		directory = databaseLocation.QueryInterface(Ci.nsIFileURL).file;
	} else {
		directory = Cc["@mozilla.org/file/directory_service;1"].
		getService(Ci.nsIProperties).
		get("ProfD", Ci.nsIFile);
		directory.append("db");
	}

	var file = directory.clone();
	file.append(databaseGuid + ".db");
	var libraryFactory = Cc["@songbirdnest.com/Songbird/Library/LocalDatabase/LibraryFactory;1"]
	.getService(Ci.sbILibraryFactory);
	var hashBag = Cc["@mozilla.org/hash-property-bag;1"].
	createInstance(Ci.nsIWritablePropertyBag2);
	hashBag.setPropertyAsInterface("databaseFile", file);
	var library = libraryFactory.createLibrary(hashBag);
	try {
		if(init) {
			library.clear();
		}
	} catch(e) {
	}

	if(init) {
		loadData(databaseGuid, databaseLocation);
	}
	return library;
}

var libListener = {
	onProgress : function(i) {
	},
	onComplete : function(array, result) {
		// Reset the progress meter
		var el = songbirdMainWindow.document
		.getElementById("sb-status-bar-status-progressmeter");
		el.mode = "";
		SBDataSetStringValue("faceplate.status.text", array.length + " Items");
	}
}