/**
 * Define a namespace for the application.
 */
var app = {};

/**
 * @constructor
 * @extends {ol.interaction.Pointer}
 */
app.Drag = function () {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: app.Drag.prototype.handleDownEvent,
    handleDragEvent: app.Drag.prototype.handleDragEvent,
    handleMoveEvent: app.Drag.prototype.handleMoveEvent,
    handleUpEvent: app.Drag.prototype.handleUpEvent,
  });

  /**
   * @type {ol.Pixel}
   * @private
   */
  this.coordinate_ = null;

  /**
   * @type {string|undefined}
   * @private
   */
  this.cursor_ = "pointer";

  /**
   * @type {ol.Feature}
   * @private
   */
  this.feature_ = null;

  /**
   * @type {string|undefined}
   * @private
   */
  this.previousCursor_ = undefined;
};
ol.inherits(app.Drag, ol.interaction.Pointer);

/**
 * @param {ol.MapBrowserEvent} evt Map browser event.
 * @return {boolean} `true` to start the drag sequence.
 */
app.Drag.prototype.handleDownEvent = function (evt) {
  var map = evt.map;

  var feature = map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
if (layer.get("name") === "select_location") return feature;
  });

  if (feature) {
    this.coordinate_ = evt.coordinate;
    this.feature_ = feature;
  }

  return !!feature;
};

/**
 * @param {ol.MapBrowserEvent} evt Map browser event.
 */
app.Drag.prototype.handleDragEvent = function (evt) {
  var deltaX = evt.coordinate[0] - this.coordinate_[0];
  var deltaY = evt.coordinate[1] - this.coordinate_[1];

  var geometry = this.feature_.getGeometry();
  geometry.translate(deltaX, deltaY);

  this.coordinate_[0] = evt.coordinate[0];
  this.coordinate_[1] = evt.coordinate[1];
};

/**
 * @param {ol.MapBrowserEvent} evt Event.
 */
app.Drag.prototype.handleMoveEvent = function (evt) {
  if (this.cursor_) {
    var map = evt.map;
    var feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
      return feature;
    });
    var element = evt.map.getTargetElement();
    if (feature) {
      if (element.style.cursor != this.cursor_) {
        this.previousCursor_ = element.style.cursor;
        element.style.cursor = this.cursor_;
      }
    } else if (this.previousCursor_ !== undefined) {
      element.style.cursor = this.previousCursor_;
      this.previousCursor_ = undefined;
    }
  }
};

/**
 * @return {boolean} `false` to stop the drag sequence.
 */
app.Drag.prototype.handleUpEvent = function () {
  console.log(vectorSource.getFeatures()[0].getGeometry().getCoordinates());
  this.coordinate_ = null;
  this.feature_ = null;
  return false;
};

var map = new ol.Map({
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM(),
    }),
  ],
  target: "map",
  controls: ol.control.defaults({
    attributionOptions: {
      collapsible: false,
    },
  }),
  interactions: ol.interaction.defaults().extend([new app.Drag()]),

  view: new ol.View({
    projection: "EPSG:4326",
    center: [10.797939494675724, 51.908781340977825],
    zoom: 6,
  }),
});
//add location marker
var vectorSource = new ol.source.Vector({
  features: [new ol.Feature(new ol.geom.Point(map.getView().getCenter()))],
});
var add_location = new ol.layer.Vector({
  source: vectorSource,
  style: new ol.style.Style({
    image: new ol.style.Icon(
      /** @type {olx.style.IconOptions} */ ({
        scale: 0.1,
        src: "./assets/images/mp.png",
      })
    ),
  }),
  visible: false,
  name:'select_location'
});
map.addLayer(add_location);
//fetch all points
var master_points_source = new ol.source.Vector();
var master_points = new ol.layer.Vector({
  source: master_points_source,
  style: function (feat) {
    if (feat.getProperties().type === 'food') {
      return new ol.style.Style({
        image: new ol.style.Icon(
          /** @type {olx.style.IconOptions} */ ({
            scale: 0.05,
            src: "./assets/images/food.png",
          })
        ),
      });
    } else {
return new ol.style.Style({
  image: new ol.style.Icon(
    /** @type {olx.style.IconOptions} */ ({
      scale: 0.05,
      src: "./assets/images/clothes.png",
    })
  ),
});
    }
    
  }
});
map.addLayer(master_points);
function fetchdata() {
  fetch(
    "https://f4uhoylz66.execute-api.ap-south-1.amazonaws.com/prod/donationcenter",

  )
    .then((res) => res.json())
    .then((data) => {
      //add all points to map
      var allPoints = dynamoDBtoGeojson(data);
      master_points_source.clear()
      master_points_source.addFeatures(
        new ol.format.GeoJSON().readFeatures(allPoints)
      );
    });
}
fetchdata();
var img = ''
function readFile() {
  if (this.files && this.files[0]) {
    var FR = new FileReader();

    FR.addEventListener("load", function (e) {
      img = e.target.result.replace("data:", "").replace(/^.+,/, "");
    });

    FR.readAsDataURL(this.files[0]);
  }
}

document
  .getElementById("exampleFormControlFile1")
  .addEventListener("change", readFile);

function submitform() {
  //check all inputs 
  var place_name = document.getElementById('place_name').value
  var place_time = document.getElementById('place_time').value || 'always'
  var place_type= document.getElementById('place_type').value 
  if (place_name) {
    //check if img is added
    bodyParam = {
      name:place_name,
      time: place_time,
      type: place_type,
      functional: "yes",
    };
    if (img) {
      bodyParam["image"] = img;
    } 
    
      //add new entry
      fetch(
        "https://f4uhoylz66.execute-api.ap-south-1.amazonaws.com/prod/donationcenter",
        {
          method: "POST",
    
          body: JSON.stringify({
            data: bodyParam,
            geometry: {
              lng: vectorSource
                .getFeatures()[0]
                .getGeometry()
                .getCoordinates()[0],
              lat: vectorSource
                .getFeatures()[0]
                .getGeometry()
                .getCoordinates()[1],
            },
          }),
        }
      )
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
          img = "";
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Added " + data['name'] + " successfully",
            showConfirmButton: false,
            timer: 1500,
          });
          fetchdata();
           clearform();
        });
  } else {
Swal.fire({
  position: "top-end",
  icon: "error",
  title: "Please add valid name",
  showConfirmButton: false,
  timer: 1500,
});
  }
}

function selectMapLocation() {
  add_location.setVisible(true);
  document.getElementById('submit-btn').style.display = 'block'
}

function clearform() {
  add_location.setVisible(false);
  document.getElementById("place_name").value = "";
  document.getElementById("place_time").value = "";
  document.getElementById("exampleFormControlFile1").value = "";
}




function dynamoDBtoGeojson(dynamodata) {
  var geoJSON = {
    type: "FeatureCollection",
    features: [],
  };

  dynamodata.forEach(feature => {
    if (feature.geoJson) {
      let geojson_feat = {type: "Feature"};
      geojson_feat["geometry"] = {
        type: camelize(JSON.parse(feature.geoJson).type),
        coordinates: JSON.parse(feature.geoJson).coordinates,
      };
      geojson_feat["properties"] = feature;
      delete geojson_feat.properties.geoJson
      delete geojson_feat.properties.geohash;
      delete geojson_feat.properties.hashKey;
      geoJSON.features.push(geojson_feat);
    }
  })
  
  return geoJSON;
}

function camelize(str) {
 return str[0].toUpperCase() + str.substring(1).toLowerCase();

}

map.on('click', function (evt) {
  var feature = map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    if (layer.get("name") !== "select_location") return feature;
  });

  if (feature) {
    console.log(feature)
    document.getElementById('popup').style.display = 'block'
    document.getElementById("popup-img").src = feature.getProperties().photoURL;
    document.getElementById("popup-type").innerHTML = feature.getProperties().type;
     document.getElementById("popup-name").innerHTML =
       feature.getProperties().name;
     document.getElementById("popup-time").innerHTML =
       feature.getProperties().time;
  document.getElementById("popup-functional").innerHTML =
    feature.getProperties().functional;
  } else {
    document.getElementById("popup").style.display = "none";

  }
})

$("#addBtn").click(function(){
  $(".form").addClass("showForm");
});
$("#minimize").click(function(){
  $(".form").removeClass("showForm");
})