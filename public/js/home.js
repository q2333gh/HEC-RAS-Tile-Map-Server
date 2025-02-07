var app = {},
projectTree = {}

// call the service to get a list of available datasets
Ajax({
  url:'../api/datasets',
  success:function(data){
    data.forEach(function(dataset){
      var pHash = dataset.project_hash
      if(!projectTree.hasOwnProperty(pHash)) projectTree[pHash] = {}

      if(typeof projectTree[pHash].projectName == 'undefined') projectTree[pHash].projectName = dataset.project_name
      if(typeof projectTree[pHash].plans == 'undefined') projectTree[pHash].plans = []
      if(typeof projectTree[pHash].maps == 'undefined') projectTree[pHash].maps = []
      if(typeof projectTree[pHash].nodes == 'undefined') projectTree[pHash].nodes = []
      if(typeof projectTree[pHash].bounds == 'undefined') projectTree[pHash].bounds = [[99999,99999],[-99999,-99999]]
      if(typeof projectTree[pHash].layers == 'undefined') projectTree[pHash].layers = {}


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
            layer: layer.layerid,
            maxNativeZoom: maxZoom,
            zIndex:999,
            bounds: L.latLngBounds([[bottomBound,leftBound],[topBound,rightBound]]),
            opacity: 0.5
          })

        if(topBound > projectTree[pHash].bounds[1][0]) projectTree[pHash].bounds[1][0] = topBound
        if(bottomBound < projectTree[pHash].bounds[0][0]) projectTree[pHash].bounds[0][0] = bottomBound
        if(leftBound < projectTree[pHash].bounds[0][1]) projectTree[pHash].bounds[0][1] = leftBound
        if(rightBound > projectTree[pHash].bounds[1][1]) projectTree[pHash].bounds[1][1] = rightBound

        if(projectTree[pHash].plans.indexOf(plan) === -1){
          projectTree[pHash].plans.push(plan)
          projectTree[pHash].nodes.push({
            id:plan,
            parent:'#',
            text:plan,
            state:{
              opened:true
            }
          })
        }

        if(projectTree[pHash].maps.indexOf(mapType) === -1){
          projectTree[pHash].maps.push(mapType)
          projectTree[pHash].nodes.push({
            id:parentFolder,
            parent:plan,
            text:mapType,
            animationGroup:true
          })
        }

        projectTree[pHash].layers[layerId] = tileLayer

        projectTree[pHash].nodes.push({
          id:layerId,
          parent:parentFolder,
          text:layer.time,
          icon:'fa fa-map-o',
          mapLayer:true
        })

      })

    })
    
    console.log(projectTree)

    for(project in projectTree){
      if(projectTree.hasOwnProperty(project)){

        var datasetHtml = [
          '<div class="p-y-lg section">',
            '<div class="container">',
              '<div class="row">',
                '<div class="col-md-5">',
                  '<a href="/rastiles/#'+ project +'"><h2 class="text-primary">'+ projectTree[project].projectName +'</h2></a>',
                  //'<h5>'+ project +'</h5>',
                    function(){
                      var returnValue = '';
                      for(var i = 0; i < projectTree[project].plans.length; i++){
                        returnValue += '<h5 class="plan-name">'+projectTree[project].plans[i]+'</h5>'
                      }
                      return returnValue;
                    }(),
                '</div>',
                '<div class="col-md-7">',
                  '<div id="map-'+ project +'" class="inset-map"></div>',
                '</div>',
              '</div>',
            '</div>',
          '</div>'].join('')

          $('body').append(datasetHtml)

          var datasetBounds = [{
            "type": "Feature",
            "geometry": {
              "type": "Polygon",
              "coordinates": [[
                  [projectTree[project].bounds[0][1], projectTree[project].bounds[0][0]],
                  [projectTree[project].bounds[1][1], projectTree[project].bounds[0][0]],
                  [projectTree[project].bounds[1][1], projectTree[project].bounds[1][0]],
                  [projectTree[project].bounds[0][1], projectTree[project].bounds[1][0]],
                  [projectTree[project].bounds[0][1], projectTree[project].bounds[0][0]]
                ]]
             },
             "properties": {
               "layerid": project
             }
          }]

          var streetmap = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',{
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
          })
          var mapEl = 'map-'+project
          app[mapEl] = L.map(mapEl)
          streetmap.addTo(app[mapEl])
          var datasetBoundsLayer = L.geoJson(datasetBounds,{
            style:{
                "color": "#ff7800",
                "weight": 3,
                "opacity": 0.5
            },
            fill:false
          }).addTo(app[mapEl])
          app[mapEl].fitBounds(datasetBoundsLayer.getBounds())

      }
    }




  },
  // success:function(data){
  //   data.forEach(function(dataset){
  //     var datasetBounds = []
  //
  //     dataset.data.layers.forEach(function(layer){
  //       var layerName = layer.table + ': ' + layer.time,
  //         maxZoom = dataset.data.metadata[layer.table+'_maxzoom'],
  //         topBound = dataset.data.metadata[layer.table+'_top'],
  //         bottomBound = dataset.data.metadata[layer.table+'_bottom'],
  //         leftBound = dataset.data.metadata[layer.table+'_left'],
  //         rightBound = dataset.data.metadata[layer.table+'_right']
  //
  //       datasetBounds.push({
  //         "type": "Feature",
  //         "geometry": {
  //           "type": "Polygon",
  //           "coordinates": [[
  //               [leftBound, bottomBound],
  //               [rightBound, bottomBound],
  //               [rightBound, topBound],
  //               [leftBound, topBound],
  //               [leftBound, bottomBound]
  //             ]]
  //          },
  //          "properties": {
  //            "layerid": layer.layerid
  //          }
  //       })
  //
  //     })
  //
  //     var layerStatus = {
  //       layerCount: dataset.data.layers.length,
  //       tables:{}
  //     }
  //     dataset.data.layers.forEach(function(layer){
  //       if(!layerStatus.tables.hasOwnProperty(layer.table)){
  //         layerStatus.tables[layer.table] = {
  //           first:layer.time,
  //           last:layer.time,
  //           count:1
  //         }
  //       }else{
  //         layerStatus.tables[layer.table].last = layer.time
  //         layerStatus.tables[layer.table].count++
  //       }
  //     })
  //
  //     layerStatusDiv = [
  //       '<div style="font-family: consolas;">',
  //         '<div class="layer-count">'+ layerStatus.layerCount +' Layers</div>'
  //     ]
  //
  //     for(table in layerStatus.tables){
  //       if(layerStatus.tables.hasOwnProperty(table)){
  //         layerStatusDiv.push('<div class="table-name">'+ table + ' ('+layerStatus.tables[table].count+')</div>')
  //         layerStatusDiv.push('<div class="layer-span">'+ layerStatus.tables[table].first + ' to '+ layerStatus.tables[table].last +'</div>')
  //       }
  //     }
  //
  //     layerStatusDiv.push('</div>')
  //
  //     var datasetHtml = [
  //       '<div class="p-y-lg section">',
  //         '<div class="container">',
  //           '<div class="row">',
  //             '<div class="col-md-6">',
  //               '<a href="/rastiles/#'+ dataset.id +'"><h2 class="text-primary">'+ dataset.name +'</h2></a>',
  //               '<h5>'+ dataset.id +'</h5>',
  //               layerStatusDiv.join(''),
  //             '</div>',
  //             '<div class="col-md-6">',
  //               '<div id="map-'+ dataset.id +'" class="inset-map"></div>',
  //             '</div>',
  //           '</div>',
  //         '</div>',
  //       '</div>'].join('')
  //
  //     $('body').append(datasetHtml)
  //
  //     window.setTimeout(function(){
  //       var streetmap = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',{
  //         attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
  //       })
  //       var mapEl = 'map-' + dataset.id
  //       app[mapEl] = L.map(mapEl)
  //       streetmap.addTo(app[mapEl])
  //       var datasetBoundsLayer = L.geoJson(datasetBounds,{
  //         style:{
  //             "color": "#ff7800",
  //             "weight": 3,
  //             "opacity": 0.5
  //         },
  //         fill:false
  //       }).addTo(app[mapEl])
  //       app[mapEl].fitBounds(datasetBoundsLayer.getBounds())
  //     },10)
  //
  //   })
  // },
  fail:function(status){
    console.log(status)
  }
})
