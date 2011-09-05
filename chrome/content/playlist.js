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

const groovesharkPlaylistLibGuid = "extensions.grooveshark-addon.playlistlib.guid";

var GroovesharkPlaylist = {
	playlist : null,
	init : function() {
		// Setup our references to the SHOUTcast libraries
		this.getLibraries();

		// Bind the playlist widget to our library
		this.playlist = document.getElementById("playlist");
		var libraryManager = Cc['@songbirdnest.com/Songbird/library/Manager;1'].getService(Ci.sbILibraryManager);

		this.playlist.bind(this.library.createView());
	},
	getLibraries : function() {
		var libraryManager = Cc["@songbirdnest.com/Songbird/library/Manager;1"]
		.getService(Ci.sbILibraryManager);

		var libGuid = Application.prefs.getValue(groovesharkPlaylistLibGuid, "");
		if(libGuid != "") {
			try {
				this.library = libraryManager.getLibrary(libGuid);
			} catch(e) {
				// If we have an invalid GUID, we act like we have no GUID
				libGuid = "";
			}
		}
		if(libGuid == "") {
			this.library = createLibrary(groovesharkPlaylistLibGuid, null, false);
			// doesn't manifest itself in any user visible way, so i think
			// it's safe to not localise
			this.library.name = "Grooveshark Playlist";
			this.library.setProperty(SBProperties.hidden, "1");
			dump("*** Created Grooveshark library, GUID: " + this.library.guid);
			libraryManager.registerLibrary(this.library, true);
			Application.prefs.setValue(groovesharkPlaylistLibGuid, this.library.guid);
		}
	},
	unload : function() {

	},
	queueItems : function(mediaItems) {

	},
	queueAndPlayItems : function(mediaItems) {

	},
	clear : function() {

	},
	drop : function(aEvent, aSession) {
		alert("on drop");
		return this.playlist.  
        _dropOnTree(this.playlist.mediaListView.length,  
                Ci.sbIMediaListViewTreeViewObserver.DROP_AFTER);  
	},
	canDrop : function(aEvent, aSession) {
		alert("can drop");
		return this.playlist.canDrop(aEvent, aSession);
	}
}