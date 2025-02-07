var Hapi = require('hapi')
var inert = require('inert')
var fs = require('fs')
var hecTiles = require('./lib/hec_tiles')

hecTiles.init(__dirname + '\\tilesets')

var server = new Hapi.Server();
server.connection({ port: 3000 });

server.register(inert,function(err){
  if (err) {
    throw err;
  }

  //set up our routes starting with the client and then adding API handlers
  server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: 'public',
        listing: false,
        index: true
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/rastiles/{param*}',
    handler: {
      directory: {
        path: 'public/map',
        listing: false,
        index: true
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/api/tiles/{layerid}/{z}/{x}/{y}',
    handler: function(request, reply){
      hecTiles.getImage(request.params.layerid, request.params.z, request.params.x, request.params.y, function(img){
        reply(img).header('Content-Type', 'image/png')
      })
    }
  })

  server.route({
    method: 'GET',
    path: '/api/datasets',
    handler: function(request, reply){
      reply(hecTiles.datasets)
    }
  })

  server.start(function (err) {
    if (err) {
      throw err;
    }
    console.log('Server running at:', server.info.uri);
  });
})
