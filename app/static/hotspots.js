var map2;
var map2Data = {};
var lines2;

var rectOpacity2 = 0.25;
var DayOfWeek2 = "Weekday";
var L12 = "";
var TimeOfDay2 = 0;
var threshold2 = 0;

var originalVal;
var expandDetails2 = 0;

var mapboxAccessToken = "MAPBOX-API-KEY-GOES-HERE";
L.Path.CLIP_PADDING = 5;

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

var overlays2 = [];

function clearOverlays2() {
  while(overlays2[0]){
    map2.removeLayer(overlays2.pop());
  };
}

var dfr_i2 = 0;
var deferreds2 = [];

function loadFile2(dataTag) {
  $.get("static/data/zone-weight/" + dataTag + ".txt", function(data) {
    window.map2Data[dataTag] = data.split('\n');
    deferreds2[dfr_i2].resolve();
    dfr_i2++;
  });
}

function loadMap2Data() {
  var dataTag;
  var dayArray = ["Weekday", "Weekend"];
  var timeArray = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
  var l1Array = ["-L1", ""];  
  
  for (var day = 0; day <= 1; day++) {
    for (var time = 0; time <= 11; time++) {
      for (var l1 = 0; l1 <= 1; l1++)  {
        deferreds2.push(new $.Deferred());
        dataTag = dayArray[day] + "-" + timeArray[time] + l1Array[l1];
        loadFile2(dataTag);
      }
    }
  }
}

function plotZoneWeights2(dataTag) {
  var line, latSW, lngSW, latNE, lngNE, r, g, b, a, w, fc;
  var lines2 = map2Data[dataTag];
  for (var i = 0; i < lines2.length - 1; i++) {
    line = lines2[i].split(',');
    latSW = parseFloat(line[0]);
    lngSW = parseFloat(line[1]) - 0.005;
    latNE = parseFloat(line[2]);
    lngNE = parseFloat(line[3]) - 0.005;
    r = Math.floor(255*parseFloat(line[4]));
    g = Math.floor(255*parseFloat(line[5]));
    b = Math.floor(255*parseFloat(line[6]));
    a = line[7];
    w = line[8];
    if (threshold2 == 1) {
      if (L12 == "-L1" && Math.abs(w) < 0.05) {
        fc = '#000000';
      }
      else if (L12 == "" && Math.abs(w) < 0.02) {
        fc = '#000000';
      }
      else {
        fc = rgbToHex(r, g, b);
      }
    }
    else {
      fc = rgbToHex(r, g, b);
    }
    
    var bounds = [[latSW, lngSW], [latNE, lngNE]];
    overlays2.push(L.rectangle(bounds, {color: "#000000", fillColor: fc, opacity: 0.25, weight: 1, fillOpacity: rectOpacity2}).addTo(map2));
  }
}

function initializeMap2() {
  var allowedBounds2 = L.latLngBounds(L.latLng(40.65, -74.03), L.latLng(40.85, -73.83));

  map2 = new L.Map('map2', {center: new L.LatLng(40.75, -73.93), zoom: 12, minZoom: 11, maxZoom: 16, maxBounds: allowedBounds2, doubleClickZoom: false});
  L.tileLayer('https://{s}.tiles.mapbox.com/v4/mapbox.dark/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken, {
    attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Mapbox</a>'}).addTo( map2 ); 
  
  loadMap2Data();
  $.when.apply(null, deferreds2).done(function(data){plotZoneWeights2(DayOfWeek2 + "-" + TimeOfDay2.toString() + L12)});
}

var sliderTime = new Slider("#map2slider", {
    ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    ticks_labels: ['0<sup>h</sup>', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22<sup>h</sup>'],
    ticks_snap_bounds: 30
});

sliderTime.setValue(TimeOfDay2);

sliderTime.on('slideStart', function(ev){
    originalVal = sliderTime.getValue();
});

sliderTime.on('slideStop', function(ev){
    var newVal = sliderTime.getValue();
    if(originalVal != newVal) {
      TimeOfDay2 = sliderTime.getValue(TimeOfDay2);
      clearOverlays2();
      plotZoneWeights2(DayOfWeek2 + "-" + TimeOfDay2.toString() + L12);
    }
});

function changeDetails2() {
  if (expandDetails2 == 1) {
    expandDetails2 = 0;
    document.getElementById("detailsbtn2").innerHTML = "Details (Click to expand)";
  } 
  else {
    expandDetails2 = 1;
    document.getElementById("detailsbtn2").innerHTML = 'Details (Click to collapse)<br><br>' + 
      'When and where do <span style="color: red">hot</span> and <span style="color: blue">cold</span><br>drivers make their pickups?<br><br>' +
      '<span style="color: red">Red</span> spots indicate locations and times<br>frequented by <span style="color: red">highly performing</span> drivers.<br>' +
      '<span style="color: blue">Blue</span> spots indicate locations and times<br>frequented by <span style="color: blue">poorly performing</span> drivers.<br><br>' +
      'Use the slider to select time of day.<br>' +
      'Use the buttons to toggle day of week,<br>feature extraction (regularization),' +
      '<br>thresholding of <span style="color: green">neutral areas</span>,<br>and opacity level.';
  }
}

function toggleDayOfWeek2() {
  if (DayOfWeek2 == "Weekday") {
    DayOfWeek2 = "Weekend";
    document.getElementById("dayofweekbtn2").innerHTML = "Weekend";
  } 
  else {
    DayOfWeek2 = "Weekday";
    document.getElementById("dayofweekbtn2").innerHTML = "Weekday";
  }
  clearOverlays2();
  plotZoneWeights2(DayOfWeek2 + "-" + TimeOfDay2.toString() + L12);
}

function toggleL12() {
  if (L12 == "-L1") {
    L12 = "";
    document.getElementById("L1btn2").innerHTML = "Regularization: N";
  } 
  else {
    L12 = "-L1";
    document.getElementById("L1btn2").innerHTML = "Regularization: Y";
  }
  clearOverlays2();
  plotZoneWeights2(DayOfWeek2 + "-" + TimeOfDay2.toString() + L12);
}

function toggleThreshold2() {
  if (threshold2 == 1) {
    threshold2 = 0;
    document.getElementById("thresholdbtn2").innerHTML = 'Show <span style="color: green">neutral areas</span>: Y';
  } 
  else {
    threshold2 = 1;
    document.getElementById("thresholdbtn2").innerHTML = 'Show <span style="color: green">neutral areas</span>: N';
  }
  clearOverlays2();
  plotZoneWeights2(DayOfWeek2 + "-" + TimeOfDay2.toString() + L12);
}

function changeOpacity2() {
  if (rectOpacity2 == 0.25) {
    rectOpacity2 = 0.5;
    document.getElementById("opacitybtn2").innerHTML = "Opacity: H";
  } 
  else {
    rectOpacity2 = 0.25;
    document.getElementById("opacitybtn2").innerHTML = "Opacity: L";
  }
  clearOverlays2();
  plotZoneWeights2(DayOfWeek2 + "-" + TimeOfDay2.toString() + L12);
}

L.DomEvent.addListener(window, 'load', initializeMap2);
