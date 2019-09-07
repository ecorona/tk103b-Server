var moment = require('moment');
require('dotenv').config();
require('console-stamp')(console, { label: false, colors: { stamp: ['gray', 'bgBlack'] } });
var gpstracker = require('./lib/server');

var logData = false;
var logCollector = false;
var logPings = false;
var logPosition = true;

//instanciamos el server...
var server = gpstracker.create().listen(process.env.TRACKER_PORT||9000, () => {
  console.log('·• Listening on:', server.address());
  server.logData = logData;
  server.conectados = [];

  //GarbageCollector
  setInterval(() => {
    if(server.conectados.length){
      var minutes = 2;
      var timeup = moment().subtract(minutes, 'm').unix() * 1000;
      // recorrer todos los trackers y poner offline aquellos que el tiempo almacenado en
      // tracker.gps.lastSeenAt haya caducado en 2m
      if(logCollector){console.log('Collector is collecting:', timeup);}
      server.conectados.forEach((imei, index)=>{
        if(server.trackers[imei].gps.online){
          if(server.trackers[imei].gps.lastSeenAt<timeup){
            server.conectados.splice(index, 1);
            delete server.trackers[imei];
            if(logCollector){console.log('Tracker '+imei+' has gone offline (GarbageCollector - '+minutes+' minutes iddle)... Deleted.');}
          }
        }
      });
    }
  }, 10000);

});

//preparamos los eventos...
server.trackers.on('logon', (tracker) => {
  //cuando un tracker se quiere conectar...

  console.log('tracker con imei solicita acceso:', tracker.imei);

  //podemos...
  //dar acceso! (aqui podriamos validar si el tracker esta activo en BD etc, y continuar o terminar)
  console.log('dando acceso a', tracker.imei);
  tracker.send('LOAD');
  server.conectados.push(tracker.imei);
  //o..  desconectarlo!
  //tracker.destroy();
  setTimeout(()=>{
    tracker.trackEvery(3).minutes(); //decirle que nos mande su ubicación cada 3 minutos
    tracker.setTimeZone('-6'); //establecerle una zona horaria
    tracker.getPosition(); //solicitar su posicion
  }, 5000);

  //al ponerle un objeto gps lo estamos "aceptando"
  tracker.gps = {
    id:  'id de la base de datos',
    lastPos: {
      type: 'Point',
      coordinates: [0, 0] //lng, lat
    },
    speed: 0,
    lastSeenAt: Date.now(),
    heading: -1,
    panico: false,
    online: true,
    descripcion: 'Nombre del cliente o vehiculo o dispositivo'
  };

  //eventos...

  //position
  tracker.on('position', (position) => {

    let pos = {
      type: 'Point',
      coordinates: [position.lng, position.lat]
    };

    //actualizar posicion en memoria
    tracker.gps.lastPos = pos;
    tracker.gps.lastSeenAt = Date.now();

    if(logPosition){console.log('tracker position :', tracker.imei, tracker.gps.lastPos);}
    //actualizar base de datos?
    //notificar a otras interfaces por ws?
  });

  //ping
  tracker.on('ping', () => {
    //actualizar estado en memoria
    tracker.gps.lastSeenAt = Date.now();
    tracker.gps.online = true;

    if(logPings){console.log('tracker ping :', tracker.imei, tracker.gps.panico?'Pánico':'');}
    //actualizar base de datos?
    //notificar a otras interfaces por ws?
  });

  //help me!
  tracker.on('help me', ()=>{
    //actualizar en memoria
    tracker.gps.online  = true;
    tracker.gps.panico = true;
    tracker.gps.lastSeenAt = Date.now();

    console.log('tracker help me :', tracker.imei, tracker.gps.panico?'Pánico':'');
    //actualizar base de datos?
    //notificar a otras interfaces por ws?
  });

  //comando desactivar panico ha sido desactivado
  tracker.on('et', ()=>{
    //actualizar en memoria
    tracker.gps.online  = true;
    tracker.gps.panico = false;
    tracker.gps.lastSeenAt = Date.now();

    console.log('DesactivarAlarma aceptado:', tracker.imei, tracker.gps.panico?'Pánico':'');
    //actualizar base de datos?
    //notificar a otras interfaces por ws?

  });

  //comando timezone ha sido aceptado
  tracker.on('it', ()=>{
    //actualizar en memoria
    tracker.gps.online  = true;
    tracker.gps.lastSeenAt = Date.now();

    console.log('TimeZone aceptado:', tracker.imei);
    //actualizar base de datos?
    //notificar a otras interfaces por ws?

  });

});
