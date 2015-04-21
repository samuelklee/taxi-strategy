var map1;
var zonesData = {};
var lines1;

var rectOpacity1 = 0.25;
var mapboxAccessToken = "MAPBOX-API-KEY-GOES-HERE";
L.Path.CLIP_PADDING = 5;

//state variables
var engineState = "idle";
var depthState = "novice";
var treeDepth = 1;
var treeWidth = 4;
var startZoneState = -1;
var mouseZoneState = -1;
var nextMoveState = "none";
var btnColor = "#f7b731";

var timeState = 0;
var faresState = 0;
var profitState = 0.00;

var statusFlag = "none";

var zoneOverlays1 = [];
var startZone = [];
var startZoneOverlay = [];
var causalZonesState;
var causalZoneOverlays = [];
var nextMoveOverlays = [];
var nextMoveSimOverlays = [];

var deferredLoadZones = $.Deferred();

var expandDetails1 = 0;

function clearZoneOverlays1() {
  while(zoneOverlays1[0]){
    map1.removeLayer(zoneOverlays1.pop().rect);
  };
}

function loadZonesFile1() {
  $.get("static/data/zones-latlng-grid.txt", function(data) {
    window.zonesData = data.split("\n");
    deferredLoadZones.resolve();
  });
}

function clearStartZoneOverlay() {
  if (startZoneOverlay[0]) {
    map1.removeLayer(startZoneOverlay.pop());
  }
}

function plotStartZoneOverlay(nextMove) {
  var fc;
  var bounds = zoneOverlays1[startZoneState - 1].bounds;
  if (nextMove.makePickup == 1) {
    fc = "red";
  }
  else {
    fc = "blue";
  }
  startZoneOverlay.push(L.rectangle(bounds, {color: "#f7b731", fillColor: fc, opacity: 0.25, weight: 1, fillOpacity: 3*rectOpacity1}).addTo(map1).bringToBack());
}

function clearNextMoveOverlays() {
  while (nextMoveOverlays[0]) {
    map1.removeLayer(nextMoveOverlays.pop());
  }
}

function plotNextMove(nextMove) {
  var bounds = zoneOverlays1[nextMove.nextZone - 1].bounds;
  var startLatLng = [zoneOverlays1[startZoneState - 1].bounds[0][0] + 0.0025, zoneOverlays1[startZoneState - 1].bounds[0][1] + 0.0025];
  var nextLatLng = [bounds[0][0] + 0.0025, bounds[0][1] + 0.0025];
  nextMoveOverlays.push(L.rectangle(bounds, {color: "#f7b731", fillColor: "purple", opacity: 0.25, weight: 1, fillOpacity: 3*rectOpacity1}).addTo(map1).bringToBack());
  nextMoveOverlays.push(L.polyline([startLatLng, nextLatLng], {color: "#f7b731", weight: 2, opacity: 3*rectOpacity1}).addTo(map1));
}

function predictNextMove() {
  nextMoveState = "calculating";
  document.getElementById("simulatebtn1").innerHTML = "Simulate shift";
  updateStatus();
  $.getJSON($SCRIPT_ROOT + '/_predict', {
    currentZone_py: startZoneState,
    currentTimeBin_py: 43,
    treeDepth_py: treeDepth,
    treeWidth_py: treeWidth
  }, function(data) {
    clearStartZoneOverlay();
    clearNextMoveOverlays();
    clearCausalZoneOverlays();
    
    causalZonesState = data.causalZones;
    nextMoveState = data;
    
    plotStartZoneOverlay(data);
    plotNextMove(data);
    plotCausalZones();
    updateStatus();
  });
}

function zoneRect(zone, bounds, style) {
    this.zone = zone;
    this.bounds = bounds;
    this.style = style;
    this.rect = L.rectangle(bounds, style);
    this.rect.addTo(map1);
    this.rect.on("mouseover", function(e) { 
      mouseZoneState = zone;
      e.target.setStyle({color: "#f7b731", fillColor: "#f7b731", opacity: 0.25, weight: 1, fillOpacity: 2*rectOpacity1});
      updateStatus();
    });
    this.rect.on("mouseout", function(e) { 
      e.target.setStyle(style);
      updateStatus();
    });
    this.rect.on("click touchend", function(e) { 
      if (engineState == "idle") {
        if (mouseZoneState != 0) {
          startZoneState = mouseZoneState;
          predictNextMove();
        }
        else {
          statusFlag = "booniesStart";
          updateStatus();
        }
      }
    });
}

function plotCausalZones() {
  for (zone_i = 0; zone_i < causalZonesState.length; zone_i++) {
    if (causalZonesState[zone_i] != 0) {
      var bounds = zoneOverlays1[causalZonesState[zone_i] - 1].bounds;
      causalZoneOverlays.push(L.rectangle(bounds, {color: "#000000", fillColor: "#00FF7F", opacity: 0.25, weight: 1, fillOpacity: 1.5*rectOpacity1}).addTo(map1).bringToBack());
    }
  }
}

function clearCausalZoneOverlays() {
  while(causalZoneOverlays[0]){
    map1.removeLayer(causalZoneOverlays.pop());
  };
}

function plotZones1() {
  var line, latSW, lngSW, latNE, lngNE, isZone;
  var lines1 = zonesData;
  for (var i = 0; i < lines1.length - 1; i++) {
    line = lines1[i].split(",");
    latSW = parseFloat(line[0]);
    lngSW = parseFloat(line[1]);
    latNE = parseFloat(line[2]);
    lngNE = parseFloat(line[3]);
    zone = parseInt(line[4]);
    if (zone != 0) {
      fc = "#f7b731";
    }
    else {
      fc = "#000000";
    }
    var bounds = [[latSW, lngSW], [latNE, lngNE]];
    var rect = new zoneRect(zone, bounds, {color: "#000000", fillColor: fc, opacity: 0.25, weight: 1, fillOpacity: rectOpacity1});
    zoneOverlays1.push(rect);
  }
}

function initializeMap1() {
  updateStatus();
  var allowedBounds1 = L.latLngBounds(L.latLng(40.65, -74.025), L.latLng(40.85, -73.825));

  map1 = new L.Map("map1", {center: new L.LatLng(40.75, -73.925), zoom: 12, minZoom: 11, maxZoom: 16, maxBounds: allowedBounds1, doubleClickZoom: false});
  L.tileLayer("https://{s}.tiles.mapbox.com/v4/mapbox.dark/{z}/{x}/{y}.png?access_token=" + mapboxAccessToken, {
    attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Mapbox</a>'}).addTo(map1); 
    
  loadZonesFile1();
  $.when(deferredLoadZones).then(function(data){plotZones1()});
}

function nextMoveString(nextMove, sim){
  if (sim == false) {
    if (nextMove == "none") {
      return "";
    }
    var deltaTime = 10*parseInt(nextMove.deltaTimeBins);
    if (nextMove.makePickup == "1") {
      return '<span style="color: red">Take</span> pickup or go to <span style="color: purple">' + 
             zoneNameFromZone(nextMove.nextZone) + '</span> | ' + profitString(parseFloat(nextMove.expectedReward), "");
    }
    else {
      return '<span style="color: blue">Skip</span> pickup and go to <span style="color: purple">' + 
             zoneNameFromZone(nextMove.nextZone) + '</span> | ' + profitString(parseFloat(nextMove.expectedReward), "");
    }
  }
  else {
    if (nextMove == "none") {
      return "";
    }
    if (nextMove.madePickup == "1") {
      return '<span style="color: red">Made</span> pickup, going to ' + 
             zoneNameFromZone(nextMove.nextZone) + ' | ' + profitString(parseFloat(nextMove.expectedReward), "");
    }
    else if (nextMove.madePickup == "0") {
      return '<span style="color: #f7b731">No&nbsp;&nbsp;</span> pickup, going to ' + 
             zoneNameFromZone(nextMove.nextZone) + ' | ' + profitString(parseFloat(nextMove.expectedReward), "");
    }
    else if (nextMove.madePickup == "-1") {
      return '<span style="color: blue">Skip</span> pickup, going to ' + 
             zoneNameFromZone(nextMove.nextZone) + ' | ' + profitString(parseFloat(nextMove.expectedReward), "");
    }
  }
}

function getPolicy(currentZone, currentTimeBin, callback) {
  $.getJSON($SCRIPT_ROOT + '/_predict', {
    currentZone_py: currentZone,
    currentTimeBin_py: currentTimeBin,
    treeDepth_py: treeDepth,
    treeWidth_py: treeWidth
  }, function(data) {
    policyMakePickup = data.makePickup;
    policyZone = data.nextZone;
    policyTimeBin = data.deltaTimeBins + currentTimeBin;
    if (data.causalZones.length == 0 | engineState == "done") {
      engineState = "done";
      document.getElementById("simulatebtn1").innerHTML = "Reset engine";
      document.getElementById("messagestatus1").innerHTML = "Engine idle.";
      deferredSimDone.resolve();
    }
    else {
      callback(currentZone, currentTimeBin, policyMakePickup, policyZone, policyTimeBin, plotTrip);
    }
  });
}

function simulateTrip(currentZone, currentTimeBin, policyMakePickup, policyZone, policyTimeBin, callback) {
  $.getJSON($SCRIPT_ROOT + '/_simulate_trip', {
    currentZone_py: currentZone,
    currentTimeBin_py: currentTimeBin,
    policyMakePickup_py: policyMakePickup,
    policyZone_py: policyZone,
    policyTimeBin_py: policyTimeBin
  }, function(trip) {
    if (engineState == "done") {
      document.getElementById("simulatebtn1").innerHTML = "Reset engine";
      document.getElementById("messagestatus1").innerHTML = "Engine idle.";
      deferredSimDone.resolve();
    }
    else {
      callback(currentZone, trip, getPolicy);
    }
  });
}

function clearNextMoveSimOverlays() {
  while (nextMoveSimOverlays[0]) {
    map1.removeLayer(nextMoveSimOverlays.pop());
  }
}

function plotNextMoveSim(currentZone, nextMoveSim) {
//  var dfr = $.Deferred();
//  clearCausalZoneOverlays();
//  plotCausalZones();
//  dfr.resolve();
  if (nextMoveSim.nextZone == 0 ) {
    var bounds = zoneOverlays1[586].bounds;
  }
  else {
    var bounds = zoneOverlays1[nextMoveSim.nextZone - 1].bounds;
  }
  if (currentZone == 0) {
    var currentLatLng = [zoneOverlays1[586].bounds[0][0] + 0.0025, zoneOverlays1[586].bounds[0][1] + 0.0025];
  }
  else {
    var currentLatLng = [zoneOverlays1[currentZone - 1].bounds[0][0] + 0.0025, zoneOverlays1[currentZone - 1].bounds[0][1] + 0.0025];
  }
  var nextLatLng = [bounds[0][0] + 0.0025, bounds[0][1] + 0.0025];
  if (nextMoveSim.madePickup == "1") {
    var sc = "red";
  }
  else if (nextMoveSim.madePickup == "0") {
    var sc = "#f7b731";
  }
  else if (nextMoveSim.madePickup == "-1") {
    var sc = "blue";
  }
//  nextMoveOverlays.push(L.rectangle(bounds, {color: "#f7b731", fillColor: "purple", opacity: 0.25, weight: 1, fillOpacity: 3*rectOpacity1}).addTo(map1).bringToBack());
  nextMoveSimOverlays.push(L.polyline([currentLatLng, nextLatLng], {color: sc, weight: 2, opacity: 3*rectOpacity1}).addTo(map1));
}

function plotTrip(currentZone, trip, callback) {
  plotNextMoveSim(currentZone, trip);
  nextMoveState = trip;
  causalZonesState = trip.causalZones;
  tripReward = trip.expectedReward;
  madePickup = trip.madePickup;
  timeState += trip.deltaTimeBins*10;
  profitState += tripReward;
  if (madePickup == 1) {
    faresState++;
  }
  updateStatus();
  if (engineState == "done") {
    document.getElementById("simulatebtn1").innerHTML = "Reset engine";
    document.getElementById("messagestatus1").innerHTML = "Engine idle.";
    deferredSimDone.resolve();
  }
  else {
    callback(trip.nextZone, trip.nextTimeBin, simulateTrip);
  }
}

var deferredSimDone;
function simulateShift() {
  var currentZone = startZoneState;
  var currentTimeBin = 43;
  var tripReward, madePickup;
  var policyMakePickup, policyZone, policyTimeBin; 
  engineState = "simulating";
  btnColor = "grey";
  deferredSimDone = $.Deferred();
  clearCausalZoneOverlays();
  clearNextMoveOverlays();
  updateStatus();
  trip = getPolicy(currentZone, currentTimeBin, simulateTrip);
}

function simulateBtn() {
  if (nextMoveState == "calculating")
      updateStatus();
  else {
    if (engineState == "idle") {
      if (startZoneState == -1) {
        statusFlag = "simNoStart";
        updateStatus();
      }
      else {
        engineState = "simulating"
        document.getElementById("simulatebtn1").innerHTML = "Stop simulation";
        clearCausalZoneOverlays();
        clearNextMoveOverlays();
        simulateShift();
      }
    }
    else if (engineState == "simulating") {
      engineState = "done";
      document.getElementById("simulatebtn1").innerHTML = "Reset engine";
      //clear sim overlays
    }
    else if (engineState == "done") {
      $.when(deferredSimDone).done(function() {
        nextMoveState = "none";
        timeState = 0;
        profitState = 0.00;
        faresState = 0;
        btnColor = "#f7b731";
        clearNextMoveSimOverlays();
        updateStatus();
        engineState = "idle";
        predictNextMove();
        updateStatus();
      });
    }
  }
}

function updateStatus() {
  if (statusFlag == "none" & nextMoveState != "calculating") {
    if (startZoneState == -1) {
      document.getElementById("startstatus1").innerHTML = "Start: select on map";
    }
    else {
      document.getElementById("startstatus1").innerHTML = "Start: " + zoneNameFromZone(startZoneState).toString();
    }
    if (engineState == "idle" && mouseZoneState != -1) {
      document.getElementById("messagestatus1").innerHTML = zoneNameFromZone(mouseZoneState).toString();
    } 
  }
  else if (statusFlag == "booniesStart") {
    document.getElementById("messagestatus1").innerHTML = "Protip: don't start in the boonies.";
    statusFlag = "none";
  }
  else if (statusFlag == "simNoStart") {
    document.getElementById("messagestatus1").innerHTML = "Select a starting zone first.";
    statusFlag = "none";
  }
  
  if (nextMoveState == "calculating" | engineState == "simulating") {
    document.getElementById("messagestatus1").innerHTML = "Calculating...";
  }
  if (nextMoveState != "calculating") {
    document.getElementById("nextmovestatus1").innerHTML = "Next move: " + nextMoveString(nextMoveState, engineState == "simulating" | engineState == "done");
  }
  
  if (engineState != "idle") {
    document.getElementById("shiftstatus1").innerHTML = "Shift stats: " + pad(timeState, 3, 0, "&nbsp;") + " min&nbsp;"  + 
      pad(faresState, 2, 0, "&nbsp;") + " fares&nbsp;"  + profitString(profitState, "&nbsp;");
  }
  
  document.getElementById("depthbtn1").style.color = btnColor;
  document.getElementById("opacitybtn1").style.color = btnColor;
}

function changeDetails1() {
  if (expandDetails1 == 1) {
    expandDetails1 = 0;
    document.getElementById("detailsbtn1").innerHTML = "Details (Click to expand)";
  }
  else {
    expandDetails1 = 1;
    document.getElementById("detailsbtn1").innerHTML = 'Details (Click to collapse)<br><br>' +
      'You&#39;re an NYC taxi driver.<br>' +
      'It&#39;s 7AM on a weekday&mdash;time to hustle.<br><br>' +
      'Maybe you see fares on the sidewalk.<br>' +
      'Should you <span style="color: red">pick them up</span> and<br>' +
      'take them where they need to go?<br>' +
      'Or <span style="color: blue">leave them on the curb</span><br>' +
      'and hope for better luck and<br>' +
      'better fares elsewhere?<br><br>' +
      'Maybe it&#39;s slow and quiet.<br>' +
      'Should you hang out and wait<br>' +
      'or should you <span style="color: purple">go hunting</span>?<br><br>' +
      'Indeed, picking up fares in NYC is a game<br>' +
      'of both chance and skill.<br>' +
      'But using data from millions of trips,<br>' +
      'we can determine the board<br>' +
      'on which the game is played.<br>' +
      'And, just as in chess, we can <br>' +
      'calculate moves by looking ahead.<br><br>' +
      'Select a starting location.<br>' +
      '<span style="color: #00FF7F">Possible moves</span> (<10 min) will be shown.<br>' + 
      'The engine will suggest one<br>' +
      'of them, which will tell you:<br>' +
      'to <span style="color: red">make</span> or <span style="color: blue">skip</span> available pickups,<br>' +
      'the best location to <span style="color: purple">go hunting</span><br>' +
      '(if you don&#39;t pick up a fare),<br>' +
      'and the average reward<br>' +
      '(fare + tip - gas).<br><br>' +
      'Use the buttons to simulate a shift,<br>' +
      'and to select depth of strategy<br>' +
      'and opacity level.<br><br>' + 
      '<font size="2">Note 1: Our simulated drivers are only<br>' +
      'allowed to make one move every 10 minutes,<br>' +
      'so their performance cannot be directly<br>' +
      'compared to that of real drivers.<br>' +
      'See the blog for more details.<br></font>' + 
      '<font size="2">Note 2: Performance of the engine<br>' +
      'depends on how recently the<br>' +
      'Heroku dynos have had their oil changed.</font>';    
  }
}

function changeOpacity1() {
  if (engineState == "idle") {
    if (rectOpacity1 == 0.25) {
      rectOpacity1 = 0.4;
      document.getElementById("opacitybtn1").innerHTML = "Opacity: H";
    } 
    else {
      rectOpacity1 = 0.25;
      document.getElementById("opacitybtn1").innerHTML = "Opacity: L";
    }
    clearZoneOverlays1();
    plotZones1();
    
    if (startZoneState != -1) {
      clearStartZoneOverlay();
      clearNextMoveOverlays();
      clearCausalZoneOverlays();
      
      plotStartZoneOverlay(nextMoveState);
      plotNextMove(nextMoveState);
      plotCausalZones();
    }
  }
}

function changeDepth1() {
  if (engineState == "idle") {
    if (depthState == "novice") {
      depthState = "master";
      treeDepth = 1;
      treeWidth = 16;
      if (startZoneState != -1) {
        predictNextMove();
      }
    } 
    else if (depthState == "master") {
      depthState = "grandmaster";
      treeDepth = 2;
      treeWidth = 16;
      if (startZoneState != -1) {
        predictNextMove();
      }
    } 
    else if (depthState == "grandmaster") {
      depthState = "novice";
      treeDepth = 1;
      treeWidth = 4;
      if (startZoneState != -1) {
        predictNextMove();
      }
    }
    document.getElementById("depthbtn1").innerHTML = "Depth: " + depthState;
  }
}

function zoneNameFromZone(zone) {
  if (zone == 0) {
    return "The Boonies";
  }
  return "Zone " + pad(zone, 4, 0, "&nbsp;");
}

function pad(num, totalLength, numDec, padChar) {
  var padLength = totalLength - num.toFixed(numDec).toString().length;
  var padString = new Array(1 + padLength).join(padChar);
  return padString + num.toFixed(numDec);
}

function profitSignColor(profit) {
  if (profit < 0) {
    return ["-", "blue"];
  }
  else if (profit == 0) {
    return ["&nbsp;", "#f7b731"];
  }
  return ["+", "red"];
}

function profitString(profit, padChar) {
  profitSC = profitSignColor(profit);
  return '<span style="color: ' + profitSC[1] + '">' + profitSC[0] + "$" + pad(Math.abs(profit.toFixed(2)), 6, 2, padChar) + '</span>';
}

L.DomEvent.addListener(window, "load", initializeMap1);
