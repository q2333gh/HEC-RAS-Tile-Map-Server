var map = L.map('map')
  .setView([39.0968,-120.00323], 12);
//Streetmap base layer
var streetmap = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',{
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
}).addTo(map)
//Darkmatter base layer
var darkStreetmap =
  L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',{
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
})
//Imagery base layer
var mapquestPhoto = L.tileLayer("http://{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg", {
  maxZoom: 18,
  subdomains: ["oatile1", "oatile2", "oatile3", "oatile4"],
  attribution: 'Tiles courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a>. Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
});
var mapquestPhotoLabel = L.layerGroup([L.tileLayer("http://{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg", {
  maxZoom: 18,
  reuseTiles: true,
  subdomains: ["oatile1", "oatile2", "oatile3", "oatile4"]
}), L.tileLayer("http://{s}.mqcdn.com/tiles/1.0.0/hyb/{z}/{x}/{y}.png", {
  maxZoom: 19,
  subdomains: ["oatile1", "oatile2", "oatile3", "oatile4"],
  attribution: 'Labels courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">. Map data (c) <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors, CC-BY-SA. Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency'
})]);

var basemaps = {
  	"Street Map":streetmap,
    "Darkmatter":darkStreetmap,
  	"Aerial Photo":mapquestPhoto,
  	"Aerial Photo with Streets":mapquestPhotoLabel
  },
  modelLayers = {},
  animLayers = [],
  projectTree = {},
  maxBounds = [[99999,99999],[-99999,-99999]],
  datasetId = window.location.hash.substring(1)

L.control.layers(basemaps).addTo(map);

Ajax({
  url:'../api/datasets',
  success:function(data){
    data.forEach(function(dataset){

      if(dataset.project_hash === datasetId){
        if(typeof projectTree.projectName == 'undefined') projectTree.projectName = dataset.project_name
        if(typeof projectTree.plans == 'undefined') projectTree.plans = []
        if(typeof projectTree.tables == 'undefined') projectTree.tables = []
        if(typeof projectTree.maps == 'undefined') projectTree.maps = []
        if(typeof projectTree.nodes == 'undefined') projectTree.nodes = []
        if(typeof projectTree.layers == 'undefined') projectTree.layers = {}

        dataset.data.layers.forEach(function(layer){
          var layerName = layer.table + ': ' + layer.time,
            layerId = layer.layerid,
            maxZoom = dataset.data.metadata[layer.table+'_maxzoom'],
            topBound = dataset.data.metadata[layer.table+'_top'],
            bottomBound = dataset.data.metadata[layer.table+'_bottom'],
            leftBound = dataset.data.metadata[layer.table+'_left'],
            rightBound = dataset.data.metadata[layer.table+'_right'],
            plan = dataset.data.metadata[layer.table+'_plan_name'],
            mapType = dataset.data.metadata[layer.table+'_map_type'],
            parentFolder = dataset.data.metadata[layer.table+'_plan_name'] + dataset.data.metadata[layer.table+'_map_type'],
            tileLayer = L.tileLayer('/api/tiles/{layer}/{z}/{x}/{y}.png',{
              title: layer.time,
              legend: layer.table,
              layer: layer.layerid,
              maxNativeZoom: Number(maxZoom),
              zIndex:9999,
              bounds: L.latLngBounds([[bottomBound,leftBound],[topBound,rightBound]]),
              opacity: 0.5
            })

          if(topBound > maxBounds[1][0]) maxBounds[1][0] = topBound
          if(bottomBound < maxBounds[0][0]) maxBounds[0][0] = bottomBound
          if(leftBound < maxBounds[0][1]) maxBounds[0][1] = leftBound
          if(rightBound > maxBounds[1][1]) maxBounds[1][1] = rightBound

          if(projectTree.tables.indexOf(layer.table) === -1){
            projectTree.tables.push(layer.table)
          }

          if(projectTree.plans.indexOf(plan) === -1){
            projectTree.plans.push(plan)
            projectTree.nodes.push({
              id:plan,
              parent:'#',
              text:plan,
              state:{
                opened:true
              }
            })
          }

          if(projectTree.maps.indexOf(parentFolder) === -1){
            projectTree.maps.push(parentFolder)
            projectTree.nodes.push({
              id:parentFolder,
              parent:plan,
              text:mapType,
              animationGroup:true
            })
          }

          projectTree.layers[layerId] = tileLayer

          if(layer.time == 'Max')
          {
            projectTree.nodes.unshift({
              id:layerId,
              parent:parentFolder,
              text:layer.time,
              icon:'fa fa-map-o',
              mapLayer:true
            })

          }
          else
          {
              projectTree.nodes.push({
              id:layerId,
              parent:parentFolder,
              text:layer.time,
              icon:'fa fa-map-o',
              mapLayer:true
            })
          }
        })

        // build the legend html here and attach it in an object to the map then we can just toggle through them by name as needed
        if(typeof map.legends == 'undefined') map.legends = {}
        projectTree.tables.forEach(function(table){
          if(typeof dataset.data.metadata[table+'_legend_values'] !== 'undefined'){
            var colors = dataset.data.metadata[table+'_legend_rgba'].split(','),
                values = dataset.data.metadata[table+'_legend_values'].split(','),
                legendHtml = {};

            //coping with trailing comma in the colors and values arrays
            if(colors[colors.length-1]=='') colors.pop()
            if(values[values.length-1]=='') values.pop()

            legendHtml.trad = []
            legendHtml.grad = []

            // --> this builds a list of items with a box of color and a label based on the value
            values.forEach(function(val,i){
              var swatchColor = 'rgba('+colors[0+(i*4)]+','+colors[1+(i*4)]+','+colors[2+(i*4)]+','+colors[3+(i*4)]/255+');'
              legendHtml.trad.push(['<li class="legend-item">',
                                  '<div class="legend-item-fill legend-item-swatch" style="background-color:'+swatchColor+';"></div>',
                                  '<div class="legend-item-title">'+val+'</div>',
                                '</li>'].join(''))
            })
            //********END TRADITIONAL SECTION

            // --> this builds a gradiant legend, kind of wonky styling
            var stops = []
            values.forEach(function(val,i,arr){
              var pct = 100 / arr.length * i;
              var color = 'rgba('+colors[0+(i*4)]+','+colors[1+(i*4)]+','+colors[2+(i*4)]+','+colors[3+(i*4)]/255+')'
              stops.push([pct+'%',color])
            })

            //--> Do as I say, not as I do time
            var style = [
              'background: rgb(30,87,153);',
              'background: -moz-linear-gradient(top, ',
                function(){
                  var stupidString = ''
                  stops.forEach(function(stop){
                    if(typeof stop[0] !== 'undefined') stupidString += stop[1] + ' ' + stop[0] + ','
                  })
                  return stupidString.substr(0,stupidString.length-1)
                }(),
              ');',
              'background: -webkit-gradient(linear, left top, left bottom, ',
                function(){
                  var stupidString = ''
                  stops.forEach(function(stop){
                    if(typeof stop[0] !== 'undefined') stupidString += 'color-stop(' + stop[0] + ',' + stop[1] + '),'
                  })
                  return stupidString.substr(0,stupidString.length-1)
                }(),
              ');',
              'background: -webkit-linear-gradient(top, ',
                function(){
                  var stupidString = ''
                  stops.forEach(function(stop){
                    if(typeof stop[0] !== 'undefined') stupidString += stop[1] + ' ' + stop[0] + ','
                  })
                  return stupidString.substr(0,stupidString.length-1)
                }(),
              ');',
              'background: -o-linear-gradient(top, ',
                function(){
                  var stupidString = ''
                  stops.forEach(function(stop){
                    if(typeof stop[0] !== 'undefined') stupidString += stop[1] + ' ' + stop[0] + ','
                  })
                  return stupidString.substr(0,stupidString.length-1)
                }(),
              ');',
              'background: -ms-linear-gradient(top, ',
                function(){
                  var stupidString = ''
                  stops.forEach(function(stop){
                    if(typeof stop[0] !== 'undefined') stupidString += stop[1] + ' ' + stop[0] + ','
                  })
                  return stupidString.substr(0,stupidString.length-1)
                }(),
              ');',
              'background: linear-gradient(to bottom, ',
                function(){
                  var stupidString = ''
                  stops.forEach(function(stop){
                    if(typeof stop[0] !== 'undefined') stupidString += stop[1] + ' ' + stop[0] + ','
                  })
                  return stupidString.substr(0,stupidString.length-1)
                }(),
              ');',
              'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='+rgb2hex(stops[0][1])+', endColorstr='+rgb2hex(stops[stops.length-1][1])+',GradientType=0 );'
            ].join('')

            legendHtml.grad.push(['<li class="legend-item">',
                                '<div class="legend-item-fill legend-item-grad" style="'+style+'"></div>',
                                '<div class="legend-item-min">'+values[0]+'</div>',
                                '<div class="legend-item-max">'+values[values.length-1]+'</div>',
                              '</li>'].join(''))
            //********END GRADIENT SECTION

            //--> change legendHtml.grad to legendHtml.trad to get the boxes for each legend item
            map.legends[table] = legendHtml.trad.join('')

          }
        })


      }

    })

    map.fitBounds(L.latLngBounds(maxBounds))
    animLayers = []

    $('.project-name').text(projectTree.projectName)

    $('.table-of-contents').jstree({
      'core' : {
        'data' : projectTree.nodes
      }
    }).on("select_node.jstree", function (e, data) {
      if(data.node.original.animationGroup){
        animLayers = data.node.children
        $('.layer-name').text('').show()
        $('.anim-buttons').show()
      }else if(data.node.original.mapLayer){
        animLayers = []
        map.eachLayer(function(layer){
          if(typeof layer.options.layer !== 'undefined') map.removeLayer(layer)
        })
        map.addLayer(projectTree.layers[data.node.id])
        map.showLegend(projectTree.layers[data.node.id].options.legend)
        $('.layer-name').text(projectTree.layers[data.node.id].options.title || '').show()
        $('.anim-buttons').hide()
      }else{
        animLayers = []
        $('.layer-name').text('').hide()
        $('.anim-buttons').hide()
      }
    })

  },
  fail:function(status){
    console.log(status)
  }
})

map.animate = function(interval){
  map.eachLayer(function(layer){
    if(typeof layer.options.layer !== 'undefined') map.removeLayer(layer)
  })
  map.activeLayer = 0
  map.loop = window.setInterval(function(){
    map.stepForward()
  },interval)
}
map.stepForward = function(){
  var current = map.activeLayer
  map.activeLayer++
  if(map.activeLayer === animLayers.length){
    map.activeLayer = 0
  }
  $('.layer-name').text(projectTree.layers[animLayers[map.activeLayer]].options.title)
  map.addLayer(projectTree.layers[animLayers[map.activeLayer]])
  map.showLegend(projectTree.layers[animLayers[map.activeLayer]].options.legend)
  if(map.hasLayer(projectTree.layers[animLayers[current]])) map.removeLayer(projectTree.layers[animLayers[current]])
}
map.stepBack = function(activeLayer){
  var current = map.activeLayer
  map.activeLayer--
  if(map.activeLayer === -1){
    map.activeLayer = animLayers.length-1
  }
  $('.layer-name').text(projectTree.layers[animLayers[map.activeLayer]].options.title)
  map.addLayer(projectTree.layers[animLayers[map.activeLayer]])
  map.showLegend(projectTree.layers[animLayers[map.activeLayer]].options.legend)
  if(map.hasLayer(projectTree.layers[animLayers[current]])) map.removeLayer(projectTree.layers[animLayers[current]])
}
map.stopAnimate = function(){
  window.clearInterval(map.loop)
}
map.showLegend = function(tableName){
  if(map.activeLegend !== tableName){
    map.activeLegend = tableName
    $('#legend-list').empty().append(map.legends[tableName]).show()
    $('.legend-item-fill').fadeTo(1,0.5)
  }
}

$('.btn-play').on('click',function(e){
  e.preventDefault()
  map.animate(750)
  $('.btn-stop').show()
  $(this).hide()
})

$('.btn-stop').on('click',function(e){
  e.preventDefault()
  map.stopAnimate()
  $('.btn-play').show()
  $(this).hide()
})

$('.btn-back').on('click',function(e){
  e.preventDefault()
  map.stepBack()
})

$('.btn-forward').on('click',function(e){
  e.preventDefault()
  map.stepForward()
})

map.opacitySlider = $('.opacity-slider').slider({
  min:0,
  max:100,
  step:1,
  value:50,
  stop:function(e, ui){
    $('.legend-item-fill').fadeTo(100,ui.value/100)
    for(layer in projectTree.layers){
      if(projectTree.layers.hasOwnProperty(layer)){
        projectTree.layers[layer].setOpacity(ui.value/100)
      }
    }
  }
})

///--> helper function
//Function to convert hex format to a rgb color
function rgb2hex(rgb){
 rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
 return (rgb && rgb.length === 4) ? "#" +
  ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
  ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
  ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
}

// /// --> shapefile support  for future use
// var shapeLayer = L.geoJson().addTo(map);
//
// map.handleFile = function(file){
//     //shapeLayer.clearLayers(); // remove any existing data -> comment out to allow multiple shapefiles
//     map.spin(true);
//
//     if (file.name.slice(-3) === 'zip') {
//         var reader = new FileReader();
//         reader.onload = function(){
//             if(reader.readyState !==2 || this.error){
//                 return;
//             }else{
//                 shp(reader.result).then(function(geoJson){
//
//                     map.spin(false);
//                     shapeLayer.addData(geoJson,{
//                         filter:function(feature,layer){
//                             if(feature.geometry.coordinates[0].length>1000){
//                                 return true;
//                             }
//                         }
//                     });
//
//                     map.fitBounds(shapeLayer.getBounds());
//
//                 },function(e){
//                     map.spin(false);
//                     console.log('Error: ', e);
//                 });
//             }
//         };
//         reader.readAsArrayBuffer(file);
//     }else{
//         return undefined;
//     }
// }

// var AddShapefileControl = L.Control.extend({
//     options: {
//         position: 'topleft'
//     },
//
//     onAdd: function(map) {
//         this._container = L.DomUtil.create('div', 'nsi-control-query leaflet-bar leaflet-control');
//         this._input = L.DomUtil.create('input', 'hide-input', this._container);
//         this._input.type = 'file';
//         this._input.id = 'input';
//
//         this._button = L.DomUtil.create('a','leaflet-bar-single',this._container);
//         this._icon = L.DomUtil.create('i', 'fa fa-plus-square-o', this._button);
//         this._button.title = 'Add a shapefile to the map';
//
//         L.DomEvent
//                 .on(this._input, 'change', this._queryShapefile, this)
//                 .on(this._button, 'click', L.DomEvent.stopPropagation)
//                 .on(this._button, 'click', L.DomEvent.preventDefault)
//                 .on(this._button, 'click', this._fireInput, this);
//
//         return this._container;
//     },
//
//     _queryShapefile: function(){
//         var file = document.getElementById('input').files[0];
//         map.handleFile(file);
//     },
//     _fireInput:function(){
//         this._input.click();
//     }
// })
//
// map.addControl(new AddShapefileControl());
//
//
// // --> find me add-on
// var locateMe = L.easyButton('fa-location-arrow',function(){
//   map.locate({setView: true, maxZoom: 16});
// }).addTo(map)
//
// function onLocationFound(e) {
//     var radius = e.accuracy / 2;
//
//     L.marker(e.latlng).addTo(map)
//         .bindPopup("You are within " + radius + " meters from this point").openPopup();
//
//     L.circle(e.latlng, radius).addTo(map);
// }
// map.on('locationfound', onLocationFound);
//
// function onLocationError(e) {
//     alert(e.message);
// }
// map.on('locationerror', onLocationError);
