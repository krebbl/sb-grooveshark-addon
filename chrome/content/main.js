
// Make a namespace.
if (typeof GroovesharkAddon == 'undefined') {
  var GroovesharkAddon = {};
}


if (typeof Cc == 'undefined')
  var Cc = Components.classes;
if (typeof Ci == 'undefined')
  var Ci = Components.interfaces;
if (typeof Cu == 'undefined')
  var Cu = Components.utils;

if (typeof(FAVICON_PATH) == "undefined")
  const FAVICON_PATH = "chrome://grooveshark-addon/skin/grooveshark_favicon.png";

function printTree(node) {
    if (node.displayName)
        if(node.displayName == "Mediathek")
           alert(node.id);
	
    for (var child = node.firstChild; child; child = child.nextSibling) {
        printTree(child);
    }
}

/**
 * UI controller that is loaded into the main player window
 */
GroovesharkAddon.Controller = {

  /**
   * Called when the window finishes loading
   */
  onLoad: function() {

    // initialization code
    this._initialized = true;
    this._strings = document.getElementById("grooveshark-addon-strings");
    
    // Perform extra actions the first time the extension is run
    if (Application.prefs.get("extensions.grooveshark-addon.firstrun").value) {
      Application.prefs.setValue("extensions.grooveshark-addon.firstrun", false);
      this._firstRunSetup();
    }

    // Create a service pane node for our chrome
    var SPS = Cc['@songbirdnest.com/servicepane/service;1'].
        getService(Ci.sbIServicePaneService);
    // printTree(SPS.root);
    
    // Check whether the node already exists
    if (SPS.getNode("SB:Grooveshark"))
      return;
    
    
    
    // Walk nodes to see if a "Radio" folder already exists
    var groovesharkFolder = SPS.getNode("SB:Grooveshark:Folder");
    if (!groovesharkFolder) {
      groovesharkFolder = SPS.createNode();
      groovesharkFolder.id = "SB:Grooveshark:Folder";
      groovesharkFolder.className = "folder grooveshark";
      groovesharkFolder.name = "Grooveshark";
	 groovesharkFolder.image = FAVICON_PATH;
      groovesharkFolder.setAttributeNS(this.SB_NS, "groovesharkFolder", 1); // for backward-compat
      groovesharkFolder.setAttributeNS(this.SP_NS, "Weight", 2);
      SPS.root.appendChild(groovesharkFolder);
    }
    //radioFolder.editable = false;
    //radioFolder.hidden = false;
  
   // Add Grooveshark chrome to service pane
    var node = SPS.createNode();
    node.url = "chrome://grooveshark-addon/content/directory.xul";
    node.id = "SB:Grooveshark";
    node.name = "Popular";
    node.image = FAVICON_PATH;
    groovesharkFolder.appendChild(node);
    node.editable = false;
    node.hidden = false;

	node = SPS.createNode();
	node.url = "chrome://grooveshark-addon/content/playlist.xul";
    node.id = "SB:Grooveshark:Playlist";
    node.name = "Current Playlist";
    // node.image = FAVICON_PATH;
    groovesharkFolder.appendChild(node);
    node.editable = false;
    node.hidden = false;
 
    // Add the toolbar button to the default item set of the browser toolbar.
    // TODO: Should only do this on first run, but Bug 6778 requires doing it
    // every load.
    this._insertToolbarItem("nav-bar", "grooveshark-addon-toolbarbutton", "subscription-button");

    

    // Make a local variable for this controller so that
    // it is easy to access from closures.
    var controller = this;
    
    // Attach doHelloWorld to our helloworld command
    /*
    this._helloWorldCmd = document.getElementById("grooveshark-addon-helloworld-cmd");
    this._helloWorldCmd.addEventListener("command", 
         function() { controller.doHelloWorld(); }, false);
	*/
  },
  

  /**
   * Called when the window is about to close
   */
  onUnLoad: function() {
    this._initialized = false;
  },
  

  /**
   * Sample command action
   */
  doHelloWorld : function() {
    var message = "GroovesharkAddon: " + this._strings.getString("helloMessage");
    alert(message);
  },

  
  /**
   * Perform extra setup the first time the extension is run
   */
  _firstRunSetup : function() {
  
    // Call this.doHelloWorld() after a 3 second timeout
    setTimeout(function(controller) { controller.doHelloWorld(); }, 3000, this); 
  
  },
  
  

  /**
   * Helper to add a toolbaritem within a given toolbar
   * 
   *   toolbar - the ID of a toolbar element
   *   newItem - the ID of a toolbaritem element within the 
   *            associated toolbarpalette
   *   insertAfter - ID of an toolbaritem after which newItem should appear
   */
  _insertToolbarItem: function(toolbar, newItem, insertAfter) {
    var toolbar = document.getElementById(toolbar);
    var list = toolbar.currentSet || "";
    list = list.split(",");
    
    // If this item is not already in the current set, add it
    if (list.indexOf(newItem) == -1)
    {
      // Add to the array, then recombine
      insertAfter = list.indexOf(insertAfter);
      if (insertAfter == -1) {
        list.push(newItem);
      } else {
        list.splice(insertAfter + 1, 0, newItem);
      }
      list = list.join(",");
      
      toolbar.setAttribute("currentset", list);
      toolbar.currentSet = list;
      document.persist(toolbar.id, "currentset");
    }
  }

  
};

window.addEventListener("load", function(e) { GroovesharkAddon.Controller.onLoad(e); }, false);
window.addEventListener("unload", function(e) { GroovesharkAddon.Controller.onUnLoad(e); }, false);
