/**
 * Created by IntelliJ IDEA.
 * User: Vitaliy (GLuKKi) Meshchaninov glukki.spb.ru@gmail.com
 * Date: 27/08/11
 * Time: 13:32
 * To change this template use File | Settings | File Templates.
 */
/*jslint browser: true, devel: true*/
/*global chrome, Store*/

var PARSE_DECIMAL = 10;
var tabs = {}; // list of tabIDs with inactivity time
var ticker = null;
var settings = {};
var inject_js = location.href.replace("background.html","") + "inject.js";
var urlBlank = 'data:text/html,<html><head><title></title><script src="' + inject_js + '"></script>'+ 
               '</head><body><a href="javascript:history.back();">Go back</a></body></html><!--';

// repeatedly used functions
function parkTab(tab) {
    "use strict";
    //check if parked
    if (tab.url.substring(0, tab.url.indexOf('#')) !== urlBlank) {
        // forward tab to blank.html
        var url = urlBlank;
		var msg = { "title": tab.title };
        if (tab.favIconUrl) {
            msg.icon = tab.favIconUrl;
        }
        chrome.tabs.update(
            tab.id,
            {'url': url + "#" + encodeURIComponent(JSON.stringify(msg)), 'selected': false}
        );
    }
}

// simple timer - update inactivity time, unload timeouted tabs
function tick() {
    "use strict";
    //sync
    chrome.windows.getAll({'populate': true}, function (windows) {
        var i, j;
        // increment every tab time
        for (i in tabs) {
            if (tabs.hasOwnProperty(i)) {
                tabs[i].time += settings.get('tick');
            }
        }

        // reset active tabs time
        for (i in windows) {
            if (windows.hasOwnProperty(i)) {
                for (j in windows[i].tabs) {
                    if (windows[i].tabs.hasOwnProperty(j)) {
                        if (windows[i].tabs[j].active) {
                            tabs[windows[i].tabs[j].id].time = 0;
                        }
                        if (settings.get('pinned') && windows[i].tabs[j].pinned) {
                            tabs[windows[i].tabs[j].id].time = 0;
                        }
                    }
                }
            }
        }

        // find expired
        for (i in tabs) {
            if (tabs.hasOwnProperty(i) && tabs[i].time >= settings.get('timeout')) {
                // get tab
                chrome.tabs.get(parseInt(i, PARSE_DECIMAL), parkTab);
            }

        }
    });
}

// init function
function init() {
    "use strict";
    // load exclusion list
    // get all windows with tabs
    chrome.windows.getAll({"populate": true}, function (wins) {
        var i, j, id;
        // get all tabs, init array with 0 inactive time
        for (i in wins) {
            if (wins.hasOwnProperty(i)) {
                for (j in wins[i].tabs) {
                    if (wins[i].tabs.hasOwnProperty(j)) {
                        id = wins[i].tabs[j].id;
                        tabs[id] = {'id': id, 'time': 0};
                    }
                }
            }
        }

        // bind events
        ticker = setInterval(tick, settings.get('tick') * 1000);
        //change icon
        chrome.browserAction.setIcon({'path': 'img/icon19.png'});
    });
}

// Events
// tabs.onCreated - add to list
chrome.tabs.onCreated.addListener(function (tab) {
    "use strict";
    tabs[tab.id] = {'id': tab.id, 'time': 0};
});

// tabs.onRemoved - load if unloaded, remove from list
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    "use strict";
    var i;
    for (i in tabs) {
        if (tabs.hasOwnProperty(i) && i === tabId) {
            delete tabs[i];
            break;
        }
    }
});

// tabs.onSelectionChanged - load if unloaded, reset inactivity
chrome.tabs.onSelectionChanged.addListener(function (tabId, selectInfo) {
    "use strict";
    var i;
    for (i in tabs) {
        if (tabs.hasOwnProperty(i) && i === tabId) {
            tabs[i].time = 0;
            break;
        }
    }
});

// UI
chrome.browserAction.onClicked.addListener(function (tab) {
    "use strict";
    if (ticker) {
        //clear
        clearInterval(ticker);
        tabs = [];
        ticker = null;
        chrome.browserAction.setIcon({'path': 'img/icon19_off.png'});
        settings.set('active', false);
    } else {
        settings.set('active', true);
        init();
    }
    return false;
});



// starter
function start() {
    "use strict";
    settings = new Store('settings', {
        'active': true,
		'timeout': 15 * 60, // seconds
		'tick': 60, // seconds
/* for debug
        'timeout': 20,
        'tick': 10,
*/
        'pinned': true
    });

    if (settings.get('active')) {
        init();
    } else {
        chrome.browserAction.setIcon({'path': 'img/icon19_off.png'});
    }
}

window.start = start;
