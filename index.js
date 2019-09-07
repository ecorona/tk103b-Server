var moment = require('moment');
require('dotenv').config();
require('console-stamp')(console, { label: false, colors: { stamp: ['gray', 'bgBlack'] } });
var gpstracker = require('./lib/server');

var logData = process.env.LOG_DATA||false;
var logCollector = process.env.LOG_COLLECTOR||false;
var logPings = process.env.LOG_PINGS||false;
var logPosition = process.env.LOG_POSITION||true;
var logSend = process.env.LOG_SEND||false;
var logCommands = process.env.LOG_COMMANDS||true;

var collectEvery = 30000; //collect iddle trackers every 30s

var minutesIddle = 2; //minutes to wait before removing a tracker after no response

/*
███████ ███████ ██████  ██    ██ ███████ ██████  ███████ ███████ ████████ ██    ██ ██████
██      ██      ██   ██ ██    ██ ██      ██   ██ ██      ██         ██    ██    ██ ██   ██
███████ █████   ██████  ██    ██ █████   ██████  ███████ █████      ██    ██    ██ ██████
     ██ ██      ██   ██  ██  ██  ██      ██   ██      ██ ██         ██    ██    ██ ██
███████ ███████ ██   ██   ████   ███████ ██   ██ ███████ ███████    ██     ██████  ██
*/

var server = gpstracker.create().listen(process.env.TRACKER_PORT||9000, () => {
  console.log('·• tk103b Server Listening on:', server.address());
  console.log('·• Logging:');
  console.log('   data:      ',logData?'ON':'OFF');
  console.log('   collector: ',logCollector?'ON':'OFF');
  console.log('   pings:     ',logPings?'ON':'OFF');
  console.log('   position:  ',logPosition?'ON':'OFF');
  console.log('   send:      ',logSend?'ON':'OFF');
  console.log('   commands:  ',logCommands?'ON':'OFF');
  console.log('•·');
  server.logData = logData;

  server.conectados = [];

  /*
   ██████   █████  ██████  ██████   █████   ██████  ███████  ██████  ██████  ██      ██      ███████  ██████ ████████  ██████  ██████
  ██       ██   ██ ██   ██ ██   ██ ██   ██ ██       ██      ██      ██    ██ ██      ██      ██      ██         ██    ██    ██ ██   ██
  ██   ███ ███████ ██████  ██████  ███████ ██   ███ █████   ██      ██    ██ ██      ██      █████   ██         ██    ██    ██ ██████
  ██    ██ ██   ██ ██   ██ ██   ██ ██   ██ ██    ██ ██      ██      ██    ██ ██      ██      ██      ██         ██    ██    ██ ██   ██
   ██████  ██   ██ ██   ██ ██████  ██   ██  ██████  ███████  ██████  ██████  ███████ ███████ ███████  ██████    ██     ██████  ██   ██
  */

  setInterval(() => {
    var trackerTimeup = moment().subtract(minutesIddle, 'm').unix() * 1000;
    if(server.conectados.length){
      // recorrer todos los trackers y poner offline aquellos que el tiempo almacenado en
      // tracker.gps.lastSeenAt haya caducado en 2m
      server.conectados.forEach((imei, index)=>{
        if(server.trackers[imei].gps.online){
          if(server.trackers[imei].gps.lastSeenAt<trackerTimeup){
            server.conectados.splice(index, 1);
            delete server.trackers[imei];
            if(logCollector){console.log('[-1] Tracker '+imei+' has gone offline (GarbageCollector - '+minutesIddle+' minutes iddle)... Deleted.');}
          }
        }
      });

      if(logCollector){console.log('This server is currently tracking ',server.conectados.length,'online devices.');}
    }
  }, collectEvery);
});

/*
████████ ██████   █████   ██████ ██   ██ ███████ ██████      ███████ ██    ██ ███████ ███    ██ ████████ ███████
   ██    ██   ██ ██   ██ ██      ██  ██  ██      ██   ██     ██      ██    ██ ██      ████   ██    ██    ██
   ██    ██████  ███████ ██      █████   █████   ██████      █████   ██    ██ █████   ██ ██  ██    ██    ███████
   ██    ██   ██ ██   ██ ██      ██  ██  ██      ██   ██     ██       ██  ██  ██      ██  ██ ██    ██         ██
   ██    ██   ██ ██   ██  ██████ ██   ██ ███████ ██   ██     ███████   ████   ███████ ██   ████    ██    ███████
*/


/*
██       ██████   ██████   ██████  ███    ██
██      ██    ██ ██       ██    ██ ████   ██
██      ██    ██ ██   ███ ██    ██ ██ ██  ██
██      ██    ██ ██    ██ ██    ██ ██  ██ ██
███████  ██████   ██████   ██████  ██   ████
*/

server.trackers.on('logon', (tracker) => {
  //cuando un tracker se quiere conectar...
  tracker.logSend = logSend;
  tracker.logCommands = logCommands;
  console.log(`Tracker ${tracker.imei} is requesting access.`);

  //podemos...
  //dar acceso! (aqui podriamos validar si el tracker esta activo en BD etc, y continuar o terminar)
  tracker.send('LOAD');
  console.log(`[+1] Tracker ${tracker.imei} is online.`);
  server.conectados.push(tracker.imei);
  console.log('This server is currently tracking ',server.conectados.length,'online devices.');
  //o..  desconectarlo!
  //tracker.destroy();

  //inicializarlo...
  setTimeout(()=>{
    console.log(`Setting up tracker ${tracker.imei}`);
    tracker.trackEvery(3).minutes(); //decirle que nos mande su ubicación cada 3 minutos
    tracker.setTimeZone('-6'); //establecerle una zona horaria
    tracker.getPosition(); //solicitar su posicion
  }, 5000);

  //al ponerle un objeto gps lo estamos "aceptando"
  tracker.gps = {
    id:  parseInt(Math.random()*10000000), //db
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

  /*
  ██████   ██████  ███████ ██ ████████ ██  ██████  ███    ██
  ██   ██ ██    ██ ██      ██    ██    ██ ██    ██ ████   ██
  ██████  ██    ██ ███████ ██    ██    ██ ██    ██ ██ ██  ██
  ██      ██    ██      ██ ██    ██    ██ ██    ██ ██  ██ ██
  ██       ██████  ███████ ██    ██    ██  ██████  ██   ████
  */

  tracker.on('position', (position) => {
    //actualizar posicion en memoria
    tracker.gps.lastPos = position.point;
    tracker.gps.lastSeenAt = Date.now();
    if(logPosition){console.log(`Tracker ${tracker.imei} position :`, tracker.gps.lastPos);}
    //actualizar base de datos?
    //notificar a otras interfaces por ws?
  });

  /*
  ██████  ██ ███    ██  ██████
  ██   ██ ██ ████   ██ ██
  ██████  ██ ██ ██  ██ ██   ███
  ██      ██ ██  ██ ██ ██    ██
  ██      ██ ██   ████  ██████
  */

  tracker.on('ping', () => {
    //actualizar estado en memoria
    tracker.gps.lastSeenAt = Date.now();
    tracker.gps.online = true;
    if(logPings){console.log(`Tracker ${tracker.imei} ping:`, tracker.imei, tracker.gps.panico?'Pánico':'');}
    //actualizar base de datos?
    //notificar a otras interfaces por ws?
  });

  /*
  ██   ██ ███████ ██      ██████      ███    ███ ███████ ██
  ██   ██ ██      ██      ██   ██     ████  ████ ██      ██
  ███████ █████   ██      ██████      ██ ████ ██ █████   ██
  ██   ██ ██      ██      ██          ██  ██  ██ ██
  ██   ██ ███████ ███████ ██          ██      ██ ███████ ██
  */

  tracker.on('help me', ()=>{
    //actualizar en memoria
    tracker.gps.online  = true;
    tracker.gps.panico = true;
    tracker.gps.lastSeenAt = Date.now();
    console.log(`Tracker ${tracker.imei} help me:`, tracker.gps.panico?'Pánico':'');
    //actualizar base de datos?
    //notificar a otras interfaces por ws?
  });

  /*
  ███████ ████████
  ██         ██
  █████      ██
  ██         ██
  ███████    ██
  */

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

  /*
  ██ ████████
  ██    ██
  ██    ██
  ██    ██
  ██    ██
  */

  //comando timezone ha sido aceptado
  tracker.on('it', ()=>{
    //actualizar en memoria
    tracker.gps.online  = true;
    tracker.gps.lastSeenAt = Date.now();
    console.log('setTimeZone aceptado:', tracker.imei);
    //actualizar base de datos?
    //notificar a otras interfaces por ws?
  });
});
