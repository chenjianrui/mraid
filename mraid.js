/**
 * mraid.js
 * 
 * (c) Pokkt
 * 
 * Supports MRAID 3
 **/


 /**
  * mraid functionalities
  **/
(function() {
    if (console.oldLog === undefined) {
        console.oldLog = console.log;

        console.log = function(log) {
            if (console.oldLog !== undefined) {
                console.oldLog(log);
            }

            // native console logger for ios
            var isIOS = (/iphone|ipad|ipod/i).test(window.navigator.userAgent.toLowerCase());
            if (isIOS) {
                var iframe = document.createElement("IFRAME");
                iframe.setAttribute("src", "console-log://" + log);
                document.documentElement.appendChild(iframe);
                iframe.parentNode.removeChild(iframe);
                iframe = null;
            }
        };
    }

    var LOG_LEVEL = {
        "DEBUG"   : 0,
        "INFO"    : 1,
        "WARNING" : 2,
        "ERROR"   : 3
    };

    var logLevel = LOG_LEVEL.DEBUG;

    var log = window.log = {};
    
    log.d = function(msg) {
        if (logLevel <= LOG_LEVEL.DEBUG) {
            console.log("[DEBUG] " + msg);
        }
    };
    
    log.i = function(msg) {
        if (logLevel <= LOG_LEVEL.INFO) {
            console.log("[INFO] " + msg);
        }
    };
    
    log.w = function(msg) {
        if (logLevel <= LOG_LEVEL.WARN) {
            console.log("[WARN] " + msg);
        }
    };
    
    log.e = function(msg) {
        console.log("[ERROR] " + msg);
    };
} ());


 /**
  * console logger
  **/
(function() {
    log.i("init mraid...");

    /**
     * globals
     **/
    var mraid = window.mraid = {};

    var bridge = window.mraidBridge = {};
    
    var mraidUtils = window.mraidUtils = {};
    

    /**
     * constants
     **/
    var VERSION = "3.0";

    var SUPPORTED_FEATURES = mraid.SUPPORTED_FEATURES = {
        "SMS" : "sms",
        "TEL" : "tel",
        "CALENDAR" : "calendar",
        "STOREPICTURE" : "storePicture",
        "INLINEVIDEO" : "inlineVideo",
        "VPAID" : "vpaid",
        "LOCATION" : "location"
    };

    var PLACEMENT_TYPE = mraid.PLACEMENT_TYPE = {
        "INLINE" : "inline",
        "INTERSTITIAL" : "interstitial",
        "UNKNOWN" : "unknown"
    };

    var DEVICE_ORIENTATIONS = mraid.DEVICE_ORIENTATIONS = {
        "PORTRAIT" : "portrait",
        "LANDSCAPE" : "landscape",
        "NONE" : "none"
    };

    var STATES = mraid.STATES = {
        "LOADING" : "loading",
        "DEFAULT" : "default",
        "EXPANDED" : "expanded",
        "RESIZED" : "resized",
        "HIDDEN" : "hidden"
    };

    var CUSTOM_CLOSE_POSITION = mraid.CUSTOM_CLOSE_POSITION = {
        "TOP_LEFT" : "top-left",
        "TOP_CENTER" : "top-center",
        "TOP_RIGHT" : "top-right",
        "CENTER" : "center",
        "BOTTOM_LEFT" : "bottom-left",
        "BOTTOM_CENTER" : "bottom-center",
        "BOTTOM_RIGHT" : "bottom-right"
    };

    var LOCATION_PROVIDER_TYPES = mraid.LOCATION_PROVIDER_TYPES = {
        "GPS" : 1,
        "IP" : 2,
        "USER" : 3
    };

    var EVENTS = mraid.EVENTS = {
        "ERROR" : "error",
        "READY" : "ready",
        "SIZECHANGE" : "sizeChange",
        "STATECHANGE" : "stateChange",
        "VIEWABLECHANGE" : "viewableChange",
        "EXPOSURECHANGE" : "exposureChange",
        "AUDIOVOLUMECHANGE" : "audioVolumeChange"
    };

    
    /**
     * states
     **/
    var supportedFeatures = {};
    
    var placementType = PLACEMENT_TYPE.UNKNOWN;
    
    var state = STATES.LOADING;
    
    var isViewable = false;
    
    var volumePercentage = 1.0;
        
    var isResizeReady = false;

    var eventListeners = {};

    var orientationProperties = {
        "allowOrientationChange" : true,
        "forceOrientation" : DEVICE_ORIENTATIONS.NONE
    };
    
    var currentAppOrientation = {
        "orientation" : DEVICE_ORIENTATIONS.NONE,
        "locked" : false
    };
    
    var currentPosition = {
        "x" : 0,
        "y" : 0,
        "width" : 0,
        "height" : 0
    };

    var defaultPosition = {
        "x" : 0,
        "y" : 0,
        "width" : 0,
        "height" : 0
    };
    
    var expandProperties = {
        "width" : 0,
        "height" : 0,
        "useCustomClose" : false,
        "isModal" : true
    };
    
    var maxSize = {
        "width" : 0,
        "height" : 0
    };
    
    var screenSize = {
        "width" : 0,
        "height" : 0
    };

    var resizeProperties = {
        "width" : 0,
        "height" : 0,
        "offsetX" : 0,
        "offsetY" : 0,
        "customClosePosition" : CUSTOM_CLOSE_POSITION.TOP_RIGHT,
        "allowOffscreen" : true
    };

    var locationData = {
        "lat" : 0.0,
        "lon" : 0.0,
        "type" : LOCATION_PROVIDER_TYPES.GPS,
        "accuracy" : 0.0,
        "lastfix" : 0,
        "ipservice" : ""
    };

    var exposureProperties = {
        "exposedPercentage" : 0,
        "visibleRectangle" : {},
        "occlusionRectangles" : null // not used in this version
    };


    //\\//\\//\\//\\//\\//\\//\\// BRIDGE \\//\\//\\//\\//\\//\\//\\//\\

    log.i("setting up: mraid-native bridge...");

    var notifyNative = bridge.notifyNative = function(operation, params) {
        var command = operation + "?params=" + params;

        var iframe = document.createElement("IFRAME");
        iframe.setAttribute("src", "mraid://" + command);
        document.documentElement.appendChild(iframe);
        iframe.parentNode.removeChild(iframe);
        iframe = null;
    };

    bridge.setSupportedFeature = function(feature, isSupported) {
        supportedFeatures[feature] = isSupported;
    };

    bridge.setPlacementType = function(pt) {
        placementType = pt;
    };

    bridge.setCurrentAppOrientation = function(orientation, locked) {
        currentAppOrientation.orientation = orientation;
        currentAppOrientation.locked = locked;
    };

    bridge.setCurrentPosition = function(x, y, width, height) {
        var previousSize = {};
        previousSize.width = currentPosition.width;
        previousSize.height = currentPosition.height;
        //log.i("previousSize " + previousSize.width + "," + previousSize.height);
        
        currentPosition.x = x;
        currentPosition.y = y;
        currentPosition.width = width;
        currentPosition.height = height;
        
        if (width !== previousSize.width || height !== previousSize.height) {
            mraid.fireSizeChangeEvent(width, height);
        }
    };
    
    bridge.setDefaultPosition = function(x, y, width, height) {
        defaultPosition.x = x;
        defaultPosition.y = y;
        defaultPosition.width = width;
        defaultPosition.height = height;
    };
    
    bridge.setMaxSize = function(width, height) {
        maxSize.width = width;
        maxSize.height = height;

        // FIXME: do we need a separate method for this??
        expandProperties.width = width;
        expandProperties.height = height;
    };

    bridge.setScreenSize = function(width, height) {
        screenSize.width = width;
        screenSize.height = height;
    };

    bridge.setLocation = function(lat, lon, type, accuracy, lastfix, ipservice) {
        locationData.lat = lat;
        locationData.lon = lon;
        locationData.type = type;
        locationData.accuracy = accuracy;
        locationData.lastfix = lastfix;
        locationData.ipservice = ipservice;
    };
    

    //\\//\\//\\//\\//\\//\\//\\// UTILS \\//\\//\\//\\//\\//\\//\\//\\    

    log.i("setting up: utilities...");

    var contains = mraidUtils.containsInArray = function(value, array) {
        for (var i in array) {
            if (array[i] === value) 
                return true;
        }
        return false;
    };

    var resizeUtil = {};
    resizeUtil.isCloseRegionOnScreen = function(properties) {
        log.d("isCloseRegionOnScreen");
        log.d("defaultPosition " + defaultPosition.x + " " + defaultPosition.y);
        log.d("offset " + properties.offsetX + " " + properties.offsetY);
    
        var resizeRect = {};
        resizeRect.x = defaultPosition.x + properties.offsetX;
        resizeRect.y = defaultPosition.y + properties.offsetY;
        resizeRect.width = properties.width;
        resizeRect.height = properties.height;
        resizeUtil.printRect("resizeRect", resizeRect);
    
        var customClosePosition = properties.hasOwnProperty("customClosePosition") ?
        properties.customClosePosition : resizeProperties.customClosePosition;
        log.d("customClosePosition " + customClosePosition);
    
        var closeRect = { "width": 50, "height": 50 };
    
        if (customClosePosition.search("left") !== -1) {
            closeRect.x = resizeRect.x;
        } else if (customClosePosition.search("center") !== -1) {
            closeRect.x = resizeRect.x + (resizeRect.width / 2) - 25;
        } else if (customClosePosition.search("right") !== -1) {
            closeRect.x = resizeRect.x + resizeRect.width - 50;
        }
    
        if (customClosePosition.search("top") !== -1) {
            closeRect.y = resizeRect.y;
        } else if (customClosePosition === "center") {
            closeRect.y = resizeRect.y + (resizeRect.height / 2) - 25;
        } else if (customClosePosition.search("bottom") !== -1) {
            closeRect.y = resizeRect.y + resizeRect.height - 50;
        }
    
        var maxRect = { "x": 0, "y": 0 };
        maxRect.width = maxSize.width;
        maxRect.height = maxSize.height;
    
        return resizeUtil.isRectContained(maxRect, closeRect);
    };
    
    resizeUtil.fitResizeViewOnScreen = function(properties) {
        log.d("fitResizeViewOnScreen");
        log.d("defaultPosition " + defaultPosition.x + " " + defaultPosition.y);
        log.d("offset " + properties.offsetX + " " + properties.offsetY);
    
        var resizeRect = {};
        resizeRect.x = defaultPosition.x + properties.offsetX;
        resizeRect.y = defaultPosition.y + properties.offsetY;
        resizeRect.width = properties.width;
        resizeRect.height = properties.height;
        resizeUtil.printRect("resizeRect", resizeRect);
    
        var maxRect = { "x": 0, "y": 0 };
        maxRect.width = maxSize.width;
        maxRect.height = maxSize.height;
    
        var adjustments = { "x": 0, "y": 0 };
    
        if (resizeUtil.isRectContained(maxRect, resizeRect)) {
            log.d("no adjustment necessary");
            return adjustments;
        }
    
        if (resizeRect.x < maxRect.x) {
            adjustments.x = maxRect.x - resizeRect.x;
        } else if ((resizeRect.x + resizeRect.width) > (maxRect.x + maxRect.width)) {
            adjustments.x = (maxRect.x + maxRect.width) - (resizeRect.x + resizeRect.width);
        }
        log.d("adjustments.x " + adjustments.x);
    
        if (resizeRect.y < maxRect.y) {
            adjustments.y = maxRect.y - resizeRect.y;
        } else if ((resizeRect.y + resizeRect.height) > (maxRect.y + maxRect.height)) {
            adjustments.y = (maxRect.y + maxRect.height) - (resizeRect.y + resizeRect.height);
        }
        log.d("adjustments.y " + adjustments.y);
    
        resizeRect.x = defaultPosition.x + properties.offsetX + adjustments.x;
        resizeRect.y = defaultPosition.y + properties.offsetY + adjustments.y;
        resizeUtil.printRect("adjusted resizeRect", resizeRect);
    
        return adjustments;
    };
    
    resizeUtil.isRectContained = function(containingRect, containedRect) {
        log.d("isRectContained");
        resizeUtil.printRect("containingRect", containingRect);
        resizeUtil.printRect("containedRect", containedRect);
        return (containedRect.x >= containingRect.x &&
            (containedRect.x + containedRect.width) <= (containingRect.x + containingRect.width) &&
            containedRect.y >= containingRect.y &&
            (containedRect.y + containedRect.height) <= (containingRect.y + containingRect.height));
    };
 
    resizeUtil.printRect = function(label, rect) {
        log.d(label +
              " [" + rect.x + "," + rect.y + "]" +
              ",[" + (rect.x + rect.width) + "," + (rect.y + rect.height) + "]" +
              " (" + rect.width + "x" + rect.height + ")");
    };

    var dumpListeners = mraidUtils.dumpListeners = function() {
        var nEvents = Object.keys(eventListeners).length
        log.i("dumping listeners (" + nEvents + " events)");
        for (var event in eventListeners) {
            var listeners = eventListeners[event];
            log.i("  " + event + " contains " + listeners.length + " listeners");
            for (var i = 0; i < listeners.length; i++) {
                log.i("    " +  listeners[i]);
            }
        }
    };
        
    
    //\\//\\//\\//\\//\\//\\//\\// EVENT MANAGEMENT \\//\\//\\//\\//\\//\\//\\//\\    

    log.i("setting up: event-management...");

    var EventListeners = function(event) {
        this.event = event;
        this.count = 0;
        var listeners = {};

        this.add = function(func) {
            var id = String(func);
            if (!listeners[id]) {
                listeners[id] = func;
                this.count++;
            }
        };

        this.remove = function(func) {
            var id = String(func);
            if (listeners[id]) {
                listeners[id] = null;
                delete listeners[id];
                this.count--;
                return true;
            } else {
                return false;
            }
        };

        this.removeAll = function() {
            for (var id in listeners) {
                if (listeners.hasOwnProperty(id)) {
                    this.remove(listeners[id]);
                }
            }
        };

        this.broadcast = function(args) {
            for (var id in listeners) {
                if (listeners.hasOwnProperty(id)) {
                    listeners[id].apply(mraid, args);
                }
            }
        };

        this.toString = function() {
            var out = [event, ':'];
            for (var id in listeners) {
                if (listeners.hasOwnProperty(id)) {
                    out.push('|', id, '|');
                }
            }
            return out.join('');
        };
    };
    
    var broadcastEvent = mraidUtils.broadcastEvent = function() {
        var args = new Array(arguments.length);
        var l = arguments.length;
        for (var i = 0; i < l; i++) {
            args[i] = arguments[i];
        }
        var event = args.shift();
        if (eventListeners[event]) {
            eventListeners[event].broadcast(args);
        }
    };


    //\\//\\//\\//\\//\\//\\//\\// VALIDTORS \\//\\//\\//\\//\\//\\//\\//\\    

    log.i("setting up: validators...");
    
    /**
     * validators
     * 
     * The action parameter is a string which is the name of the setter function which called this function
     * (in other words, setExpandPropeties, setOrientationProperties, or setResizeProperties).
     * It serves both as the key to get the the appropriate set of validating functions from the allValidators object
     * as well as the action parameter of any error event that may be thrown.
     * 
     * added location-data validation
     **/

    var allValidators = mraidUtils.allValidators = {
        "setExpandProperties": {
            "width" : function(width) {
                return !isNaN(width);
            },
            "height" : function(height) {
                return !isNaN(height);
            },
            "useCustomClose" : function(useCustomClose) {
                if (VERSION === "3.0")
                    return true; // ignoring in case of MRAID 3

                return (typeof useCustomClose === "boolean");
            }
        },
        "setOrientationProperties": {
            "allowOrientationChange" : function(allowOrientationChange) {
                return (typeof allowOrientationChange === "boolean");
            },
            "forceOrientation" : function(forceOrientation) {
                var validValues = [ "portrait","landscape","none" ];
                return validValues.indexOf(forceOrientation) !== -1;
            }
        },
        "setResizeProperties": {
            "width" : function(width) {
                return !isNaN(width) && width >= 50;
            },
            "height" : function(height) {
                return !isNaN(height) && height >= 50;
            },
            "offsetX" : function(offsetX) {
                return !isNaN(offsetX);
            },
            "offsetY" : function(offsetY) {
                return !isNaN(offsetY);
            },
            "customClosePosition" : function(customClosePosition) {
                var validPositions = [ "top-left","top-center","top-right","center","bottom-left","bottom-center","bottom-right" ];
                return validPositions.indexOf(customClosePosition) !== -1;
            },
            "allowOffscreen" : function(allowOffscreen) {
                return (typeof allowOffscreen === "boolean");
            }
        },
        "locationData" : {
            "lat" : function(lat) {
                return !isNaN(lat);
            },
            "lon" : function(lon) {
                return !isNaN(lon);
            },
            "type" : function(type) {
                return !isNaN(type) && type >= 1 && type <= 3;
            },
            "accuracy" : function(accuracy) {
                return !isNaN(accuracy);
            },
            "lastfix" : function(lastfix) {
                return !isNaN(lastfix);
            }
        }
    };

    var validate = mraidUtils.validate = function(properties, action) {
        var retval = true;
        var validators = allValidators[action];
        for (var prop in properties) {
            var validator = validators[prop];
            var value = properties[prop];
            if (validator && !validator(value)) {
                var message = "Value of property " + prop + " (" + value + ") is invalid!";
                log.e(message);
                broadcastEvent(EVENTS.ERROR, message, action);
                retval = false;
            }
        }
        return retval;
    };

    
    //\\//\\//\\//\\//\\//\\//\\// MRAID \\//\\//\\//\\//\\//\\//\\//\\

    log.i("setting up: mraid mraid features...");
        
    /**
     * mraid properties
     **/
    mraid.supports = function(feature) {
        log.i("mraid.supports: " + feature + " " + supportedFeatures[feature]);
        var retval = supportedFeatures[feature];
        if (typeof retval === "undefined") {
            retval = false;
        }
        return retval;
    };

    mraid.getPlacementType = function() {
        log.i("mraid.getPlacementType");
        return placementType;
    };

    mraid.getOrientationProperties = function() {
        log.i("mraid.getOrientationProperties");
	
        var properties = {};
        properties.allowOrientationChange = orientationProperties.allowOrientationChange;
        properties.forceOrientation = orientationProperties.forceOrientation;
        return properties;
    };

    mraid.setOrientationProperties = function(properties) {
        log.i("mraid.setOrientationProperties...");
        
        if (!validate(properties, "setOrientationProperties")) {
            log.e("validation failed!");
            return;
        }
        
        var newOrientationProperties = {};
        newOrientationProperties.allowOrientationChange = orientationProperties.allowOrientationChange,
        newOrientationProperties.forceOrientation = orientationProperties.forceOrientation;
        
        // orientationProperties contains 2 read-write properties: allowOrientationChange and forceOrientation
        var rwProps = [ "allowOrientationChange", "forceOrientation" ];
        for (var i = 0; i < rwProps.length; i++) {
            var propname = rwProps[i];
            if (properties.hasOwnProperty(propname)) {
                newOrientationProperties[propname] = properties[propname];
            }
        }
        
        // setting allowOrientationChange to true while setting forceOrientation to either portrait or landscape
        // is considered an error condition.
        if (newOrientationProperties.allowOrientationChange &&
            newOrientationProperties.forceOrientation !== mraid.DEVICE_ORIENTATIONS.NONE) {
            var message = "allowOrientationChange is true but forceOrientation is " + newOrientationProperties.forceOrientation;
            log.e(message);
            broadcastEvent(EVENTS.ERROR, message, "setOrientationProperties");
            return;
        }
        
        orientationProperties.allowOrientationChange = newOrientationProperties.allowOrientationChange;
        orientationProperties.forceOrientation = newOrientationProperties.forceOrientation;
        
        notifyNative("setOrientationProperties", JSON.stringify(orientationProperties));
    };

    mraid.getCurrentAppOrientation = function() {
        log.i("mraid.getCurrentAppOrientation");
	
        var appOrientation = {};
        appOrientation.orientation = currentAppOrientation.orientation;
        appOrientation.locked = currentAppOrientation.locked;
        return appOrientation;
    };

    mraid.getCurrentPosition = function() {
        log.i("mraid.getCurrentPosition");
	
        var position = {
            "x": currentPosition.x,
            "y": currentPosition.y,
            "width": currentPosition.width,
            "height": currentPosition.height
        };
        return position;
    };

    mraid.getDefaultPosition = function() {
        log.i("mraid.getDefaultPosition");
	
        var position = {
            "x": defaultPosition.x,
            "y": defaultPosition.y,
            "width": defaultPosition.width,
            "height": defaultPosition.height
        };
        return position;
    };

    mraid.getState = function() {
        log.i("mraid.getState: " + state);
        return state;
    };

    mraid.getExpandProperties = function() {
        log.i("mraid.getExpandProperties");
    
        var properties = {
            "width" : expandProperties.width,
            "height" : expandProperties.height,
            "useCustomClose" : expandProperties.useCustomClose,
            "isModal" : expandProperties.isModal
        };
        return properties;
    };

    mraid.setExpandProperties = function(properties) {
        log.i("mraid.setExpandProperties");
        
        if (!validate(properties, "setExpandProperties")) {
            log.e("validation failed!");
            return;
        }
        
        var oldUseCustomClose = expandProperties.useCustomClose;
        
        // expandProperties contains 3 read-write properties: width, height, and useCustomClose;
        // the isModal property is read-only
        var rwProps = [ "width", "height", "useCustomClose" ];
        for (var i = 0; i < rwProps.length; i++) {
            var propname = rwProps[i];
            if (properties.hasOwnProperty(propname)) {
                expandProperties[propname] = properties[propname];
            }
        }
        
        // In MRAID v2.0, all expanded ads by definition cover the entire screen,
        // so the only property that the native side has to know about is useCustomClose.
        // (That is, the width and height properties are not needed by the native code.)
        if (expandProperties.useCustomClose !== oldUseCustomClose) {
            mraid.useCustomClose(properties.useCustomClose);
        }
    };

    mraid.getMaxSize = function() {
        log.i("mraid.getMaxSize: " + maxSize.width + " x " + maxSize.height);

        var size = {};
        size.width = maxSize.width;
        size.height = maxSize.height;
        return size;
    };

    mraid.getScreenSize = function() {
        log.i("mraid.getScreenSize: " + screenSize.width + " x " + screenSize.height);
        
        var size = {};
        size.width = screenSize.width;
        size.height = screenSize.height;
        return size;
    };

    mraid.getResizeProperties = function() {
        log.i("mraid.getResizeProperties");

        var properties = {
            "width" : resizeProperties.width,
            "height" : resizeProperties.height,
            "offsetX" : resizeProperties.offsetX,
            "offsetY" : resizeProperties.offsetY,
            "customClosePosition" : resizeProperties.customClosePosition,
            "allowOffscreen" : resizeProperties.allowOffscreen
        };
        return properties;
    };

    mraid.setResizeProperties = function(properties) {
        log.i("mraid.setResizeProperties");
        
        isResizeReady = false;

        // resizeProperties contains 6 read-write properties:
        // width, height, offsetX, offsetY, customClosePosition, allowOffscreen

        // The properties object passed into this function must contain width, height, offsetX, offsetY.
        // The remaining two properties are optional.
        var rwProps = [ "width", "height", "offsetX", "offsetY" ];
        for (var i = 0; i < rwProps.length; i++) {
            var propname = rwProps[i];
            if (!properties.hasOwnProperty(propname)) {
                var message = "required property " + propname + " is missing";
                log.e(message);
                broadcastEvent(EVENTS.ERROR, message, "setResizeProperties");
                return;
            }
        }

        if (!validate(properties, "setResizeProperties")) {
            log.e("validation failed!");
            return;
        }

        var adjustments = { "x": 0, "y": 0 };

        var allowOffscreen = properties.hasOwnProperty("allowOffscreen") 
                        ? properties.allowOffscreen 
                        : resizeProperties.allowOffscreen;

        if (!allowOffscreen) {
            if (properties.width > maxSize.width || properties.height > maxSize.height) {
                var message = "Resize width or height is greater than the maxSize width or height!";
                log.e(message);
                broadcastEvent(EVENTS.ERROR, message, "setResizeProperties");
                return;
            }
            adjustments = resizeUtil.fitResizeViewOnScreen(properties);
        } else if (!resizeUtil.isCloseRegionOnScreen(properties)) {
            var message = "Close event region will not appear entirely onscreen!";
            log.e(message);
            broadcastEvent(EVENTS.ERROR, message, "setResizeProperties");
            return;
        }

        var desiredProperties = ['width', 'height', 'offsetX', 'offsetY', 'customClosePosition', 'allowOffscreen'];
        for (var i = 0; i < desiredProperties.length; i++) {
            var propname = desiredProperties[i];
            if (properties.hasOwnProperty(propname)) {
                resizeProperties[propname] = properties[propname];
            }
        }

        var params = {
            "width" : resizeProperties.width,
            "height" : resizeProperties.height,
            "offsetX" : resizeProperties.offsetX + adjustments.x,
            "offsetY" : resizeProperties.offsetY + adjustments.y,
            "customClosePosition" : resizeProperties.customClosePosition,
            "allowOffscreen" : resizeProperties.allowOffscreen
        };
    
        notifyNative("setResizeProperties", JSON.stringify(params));

        isResizeReady = true;
    };

    mraid.getLocation = function() {
        if (!validate(locationData, "locationData")) {
            log.e("invalid location data!");
            return -1;
        }

        // ensure service or provider used to determine geolocation from IP address (i.e., type = 2)
        if (locationData.type == 2 && !ipservice) {
            log.e("invalid location data!");
            broadcastEvent(EVENTS.ERROR, "invalid location data!", "getLocation");
            log.e("invalid location data!");
            return -1;
        }

        var data = {
            "lat" : locationData.lat,
            "lon" : locationData.lon,
            "type" : locationData.type,
            "accuracy" : locationData.accuracy,
            "lastfix" : locationData.lastfix,
            "ipservice" : locationData.ipservice
        };
        return data;
    };


    /**
     * mraid methods
     **/
    mraid.getVersion = function() {
        log.i("mraid.getVersion: " + VERSION);
         return VERSION;
    };

    mraid.addEventListener = function(event, listener) {
        log.i("mraid.addEventListener for event: " + event);

        if (!event || !listener) {
            broadcastEvent(EVENTS.ERROR, "Both event and listener are required.", "addEventListener");
            return;
        }
        
        if (!contains(event, EVENTS)) {
            broadcastEvent(EVENTS.ERROR, "Unknown MRAID event: " + event, "addEventListener");
            return;
        }

        if (!eventListeners[event]) {
            eventListeners[event] = new EventListeners(event);
        }
        eventListeners[event].add(listener);
    };

    mraid.removeEventListener = function(event, listener) {
        log.i("mraid.removeEventListener for event: " + event);

        if (!event) {
            broadcastEvent(EVENTS.ERROR, "Event is required.", "removeEventListener");
            return;
        }

        if (!contains(event, EVENTS)) {
            broadcastEvent(EVENTS.ERROR, "Unknown MRAID event: " + event, "removeEventListener");
            return;
        }

        if (eventListeners[event]) {
            if (!listener) {
                eventListeners[event].removeAll();
            } else if (!eventListeners[event].remove(listener)) {
                broadcastEvent(EVENTS.ERROR, "Listener not currently registered for event.", "removeEventListener");
            }
        }

        if (eventListeners[event] && eventListeners[event].count === 0) {
            eventListeners[event] = null;
            delete eventListeners[event];
        }
    };

    mraid.open = function(url) {
        log.i("mraid.open: " + url);

        if (!url) {
            broadcastEvent(EVENTS.ERROR, "Invalid URL: " + url, "open");
            return;
        }

        // a cheap hack to ensure whether the url is encoded or not,
        // if its not encoded, make sure to "double encode" as the sdk does a double decode
        if (url.includes("&")) {
            //url = url.replace("&", "%26")
            url = encodeURIComponent(url);
        }

        notifyNative("open", url);
    };

    mraid.close = function() {
        log.i("mraid.close");

        if (state === STATES.HIDDEN) {
            broadcastEvent(EVENTS.ERROR, "Ad cannot be closed when it is already hidden.", "close");
            return;
        }

        notifyNative("close");
    };

    mraid.unload = function() {
        log.i("mraid.unload");
        notifyNative("unload");
    };

    mraid.useCustomClose = function(shouldUseCustomClose) {
        log.i("mraid.useCustomClose: " + shouldUseCustomClose);

        expandProperties.useCustomClose = shouldUseCustomClose;
        notifyNative("useCustomClose", shouldUseCustomClose);
    };

    mraid.expand = function(url) {
        log.i("mraid.expand: " + (url === undefined) ? "(1-part)" : url);
    
        // The only time it is valid to call expand is when the ad is
        // a banner currently in either default or resized state.
        if (placementType !== PLACEMENT_TYPE.INLINE ||
            (state !== STATES.DEFAULT && state !== STAES.RESIZED)) {
            broadcastEvent(EVENTS.ERROR, "Ad can only be expanded from the default or resized state.", "expand");
            return;
        }
    
        notifyNative("expand", (url === undefined) ? "" : url);
    };

    mraid.isViewable = function() {
        log.i("mraid.isViewable");
        return isViewable;
    };

    mraid.playVideo = function(uri) {
        log.i("mraid.playVideo: " + uri);

        // TODO: consider exposure change event too
        if (!mraid.isViewable()) {
            broadcastEvent(EVENTS.ERROR, "playVideo cannot be called until the ad is viewable", "playVideo");
            return;
        }

        if (!uri) {
            broadcastEvent(EVENTS.ERROR, "Invalid URI: " + uri, "playVideo");
            return;
        }

        notifyNative("playVideo", uri);
    };

    mraid.resize = function() {
        log.i("mraid.resize");

        // The only time it is valid to call resize is when the ad is
        // a banner currently in either default or resized state.
        // Trigger an error if the current state is expanded.
        if (placementType === PLACEMENT_TYPE.INTERSTITIAL || state === STATES.LOADING || state === STATES.HIDDEN) {
            // do nothing
            return;
        }
        if (state === STATES.EXPANDED) {
            broadcastEvent(EVENTS.ERROR, "Ad cannot be resized when in expanded state.", "resize");
            return;
        }
        if (!isResizeReady) {
            broadcastEvent(EVENTS.ERROR, "Ad is not ready for resizing.", "resize");
            return;
        }

        notifyNative("resize", JSON.stringify(resizeProperties));
    };

    mraid.storePicture = function(uri) {
        log.i("mraid.storePicture: " + uri);

        if (!mraid.supports(mraid.SUPPORTED_FEATURES.STOREPICTURE)) {
            broadcastEvent(EVENTS.ERROR, "storePicture is not supported", "storePicture");
            return;
        }

        // TODO: consider exposure change event too
        if (!mraid.isViewable()) {
            broadcastEvent(EVENTS.ERROR, "storePicture cannot be called until the ad is viewable", "storePicture");
            return;
        }

        if (!uri) {
            broadcastEvent(EVENTS.ERROR, "Invalid URI: " + uri, "storePicture");
            return;
        }

        notifyNative("storePicture", uri);
    };

    mraid.createCalendarEvent = function(parameters) {
        log.i("mraid.createCalendarEvent");

        if (!mraid.supports(mraid.SUPPORTED_FEATURES.CALENDAR)) {
            broadcastEvent(EVENTS.ERROR, "createCalendarEvent is not supported", "createCalendarEvent");
            return;
        }

        notifyNative("createCalendarEvent", JSON.stringify(parameters));
    };


    /**
     * event dispatchers
     **/
    mraid.fireErrorEvent = function(message, action) {
        broadcastEvent(EVENTS.ERROR, message, action);
    };

    mraid.fireReadyEvent = function() {
        broadcastEvent(EVENTS.READY);
    };

    mraid.fireSizeChangeEvent = function(width, height) {
        screenSize.width = width;
        screenSize.height = height;
        broadcastEvent(EVENTS.SIZECHANGE, width, height);
    };

    mraid.fireStateChangeEvent = function(newState) {
        if (state !== newState) {
            state = newState;
            broadcastEvent(EVENTS.STATECHANGE, state);
        }
    };

    mraid.fireViewableChangeEvent = function(newIsViewable) {
        if (isViewable !== newIsViewable) {
            isViewable = newIsViewable;
            broadcastEvent(EVENTS.VIEWABLECHANGE, isViewable);
        }
    };

    mraid.fireExposureChangeEvent = function(exposedPercentage, visibleRectangle, occlusionRectangles) {
        exposureProperties.exposedPercentage = exposedPercentage;
        exposureProperties.visibleRectangle = visibleRectangle;
        exposureProperties.occlusionRectangles = occlusionRectangles;
        broadcastEvent(EVENTS.EXPOSURECHANGE, exposedPercentage, visibleRectangle, occlusionRectangles);
    };

    mraid.fireAudioVolumeChangeEvent = function(percentage) {
        if (volumePercentage !== percentage) {
            volumePercentage = volumePercentage;
            broadcastEvent(EVENTS.AUDIOVOLUMECHANGE, percentage);
        }
    };



    // TODO: VPAID

    log.i("mraid object is ready!");
} ());


/**
 * pokkt extended featuers
 **/
(function() {
    log.i("setting up: mraid-extensions...");

    var mraid = window.mraid;

    if (!mraid || mraid === undefined) {
        log.e("error initializing pokkt's extended features!");
        return;
    }


    /**
     * pokkt specific constants
     **/
    var NETWORK = mraid.NETWORK = {
        OFFLINE :'offline',
        WIFI    :'wifi',
        CELL    :'cell',
        UNKNOWN :'unknown'
    };

    mraid.SUPPORTED_FEATURES.AUDIO = "audio";
    mraid.SUPPORTED_FEATURES.CAMERA = "camera";
    mraid.SUPPORTED_FEATURES.NETWORK = "network";
    mraid.SUPPORTED_FEATURES.SHAKE = "shake";
    mraid.SUPPORTED_FEATURES.TILT = "tilt";
    mraid.SUPPORTED_FEATURES.HEADING = "heading";
    mraid.SUPPORTED_FEATURES.ORIENTATION = "orientation";
    mraid.SUPPORTED_FEATURES.MAP = "map";
    
    mraid.EVENTS.SHAKE = "shake";
    mraid.EVENTS.TILTCHANGE = "tiltChange";
    mraid.EVENTS.HEADINGCHANGE = "headingChange";
    mraid.EVENTS.LOCATIONCHANGE = "locationChange";
    mraid.EVENTS.NETWORKCHANGE = "networkChange";
    mraid.EVENTS.KEYBOARDSTATECHANGE = "keyboardStateChange";
    

    /**
     * pokkt specific states
     **/
    var shakeProperties = {
        "interval" : 0,
        "intensity" : 0
    };

    var tiltProperties = {
        "interval" : 0,
        "intensity" : 0
    };

    var headingProperties = {
        "interval" : 0,
        "intensity" : 0
    };

    var tiltValues = {
        "x" : 0,
        "y" : 0,
        "z" : 0
    };

    var headingValue = 0;
    var currentNetwork = "";
    var currentKeyboardState = 0;


    /**
     * pokkt specific validators
     **/
    mraidUtils.allValidators.setShakeProperties = 
    mraidUtils.allValidators.setTiltProperties = 
    mraidUtils.allValidators.setHeadingProperties = {
        "intensity":function(value) { return !isNaN(value); },
        "interval":function(value) { return !isNaN(value); }
    };
    
    mraidUtils.allValidators.setTilt = {
        "x":function(value) { return !isNaN(value); },
        "y":function(value) { return !isNaN(value); },
        "z":function(value) { return !isNaN(value); }
    };


    /**
     * pokkt's extended properties
     **/
    mraid.setShakeProperties = function(properties) {
        log.i("mraid.setShakeProperties: " + properties);
        if (!mraidUtils.validate(properties, "setShakeProperties")) {
            log.e("validation failed!");
            return;
        }

        shakeProperties = properties;
        mraidBridge.notifyNative("setShakeProperties", JSON.stringify(properties));
    };

    mraid.getShakeProperties = function() {
        log.i("mraid.getShakeProperties");

        var properties = {};
        properties.interval = shakeProperties.interval;
        properties.intensity = shakeProperties.intensity;
        return properties;
    };

    mraid.setTiltProperties = function(properties) {
        log.i("mraid.setTiltProperties: " + properties);
        if (!mraidUtils.validate(properties, "setTiltProperties")) {
            log.e("validation failed!");
            return;
        }

        tiltProperties = properties;
        mraidBridge.notifyNative("setTiltProperties", JSON.stringify(properties));
    };

    mraid.getTiltProperties = function() {
        log.i("mraid.getTiltProperties");
        
        var properties = {};
        properties.interval = tiltProperties.interval;
        properties.intensity = tiltProperties.intensity;
        return properties;
    }

    mraid.setHeadingProperties = function(properties) {
        log.i("mraid.setHeadingProperties: " + properties);
        if (!mraidUtils.validate(properties, "setHeadingProperties")) {
            log.e("validation failed!");
            return;
        }

        headingProperties = properties;
        mraidBridge.notifyNative("setHeadingProperties", JSON.stringify(properties));
    };

    mraid.getHeadingProperties = function() {
        log.i("mraid.getHeadingProperties");
        
        var properties = {};
        properties.interval = headingProperties.interval;
        properties.intensity = headingProperties.intensity;
        return properties;
    };

    mraid.getTilt = function () {
        log.i("mraid.getTilt");

        var values = {};
        values.x = tiltValues.x;
        values.y = tiltValues.y;
        values.z = tiltValues.z;
        return values;
    };
    
    mraid.setTilt = function (newValue) {
        log.i("mraid.setTilt: " + newValue);
        if (!mraidUtils.validate(newValue, "setTilt")) {
            log.e("validation failed!");
            return;
        }

        tiltValues = newValue;
    };
    
    mraid.getNetwork = function () {
        log.i("mraid.getNetwork");
        return currentNetwork;
    };
    
    mraid.setNetwork = function (newValue) {
        log.i("mraid.setNetwork: " + newValue);
        currentNetwork = newValue;
    };
    
    mraid.getHeading = function () {
        log.i("mraid.getHeading");
        return headingValue;
    };
    
    mraid.setHeading = function (newValue) {
        log.i("mraid.setHeading: " + newValue);
        headingValue = newValue;
    };
    
    mraid.getKeyboardState = function () {
        log.i("mraid.getKeyboardState");
        return currentKeyboardState;
    }
    
    mraid.setKeyboardState = function (newValue) {
        log.i("mraid.setKeyboardState: " + newValue);
        currentKeyboardState = newValue;
    }
    

    /**
     * extended methods
     **/
    mraid.playAudio = function(url) {
        log.i("mraid.playAudio " + url);

        if (!mraid.supports(mraid.SUPPORTED_FEATURES.AUDIO)) {
            mraidUtils.broadcastEvent(mraid.EVENTS.ERROR, "playAudio is not supported", "playAudio");
            return;
        }

        mraidBridge.notifyNative("playAudio", url);
    };
    
    mraid.openCamera = function () {
        log.i("mraid.openCamera");

        if (!mraid.supports(mraid.SUPPORTED_FEATURES.CAMERA)) {
            mraidUtils.broadcastEvent(mraid.EVENTS.ERROR, "openCamera is not supported", "openCamera");
            return;
        }

        mraidBridge.notifyNative("openCamera");
    }
    

    /**
     * event dispatchers
     **/
    mraid.fireShakeEvent = function() {
        log.i("mraid.fireShakeEvent");
        mraidUtils.broadcastEvent(mraid.EVENTS.SHAKE);
    }
    
    mraid.fireTiltChangeEvent = function(x, y, z) {
        log.i("mraid.fireTiltChangeEvent, x: " + x + " y: " + y + " z: " + z);
        tiltValues.x = x;
        tiltValues.y = y;
        tiltValues.z = z;
        mraidUtils.broadcastEvent(mraid.EVENTS.TILTCHANGE, x, y, z);
    }
    
    mraid.fireLocationChangeEvent = function(lat, lon, type, accuracy, lastfix, ipservice) {
        log.i("mraid.fireLocationChangeEvent, lat: " + lat + " lon: " + lon + " type: " + type + 
                                " accuracy: " + accuracy + " lastfix: " + lastfix + " ipservice: " + ipservice);

        mraidBridge.setLocation(lat, lon, type, accuracy, lastfix, ipservice);
        
        mraidUtils.broadcastEvent(mraid.EVENTS.LOCATIONCHANGE, lat, lon, type, accuracy, lastfix, ipservice);
    }
    
    mraid.fireHeadingChangeEvent = function(val) {
        log.i("mraid.fireHeadingChangeEvent, val: " + val);
        if (headingValue != val) {
            headingValue = val;
            mraidUtils.broadcastEvent(mraid.EVENTS.HEADINGCHANGE, val);
        }
    }
    
    mraid.fireNetworkChangeEvent = function(network) {
        log.d("mraid.fireNetworkChangeEvent: " + network);
        if (currentNetwork != network) {
            currentNetwork = network;
            mraidUtils.broadcastEvent(mraid.EVENTS.NETWORKCHANGE, network);
        }
    }
    
    mraid.fireKeyboardStateChangeEvent = function(state) {
        log.d("mraid.fireKeyboardStateChangeEvent: " + state);
        if (currentKeyboardState !== state) {
            currentKeyboardState = state;
            mraidUtils.broadcastEvent(mraid.EVENTS.KEYBOARDSTATECHANGE, state);
        }
    }
    
    log.i("mraid extensions are ready!");
} ());
