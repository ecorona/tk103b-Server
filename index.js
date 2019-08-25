var gpstracker = require('./lib/server');

var server = gpstracker.create().listen(9000, () => {
  console.log('·• Listening on:', server.address());
});

//cuando un tracker se quiere conectar...
server.trackers.on('logon', (tracker) => {

  console.log('tracker con imei solicita acceso:', tracker.imei);

  //podemos...
  //dar acceso! (aqui podriamos validar si el tracker esta activo en BD etc, y continuar o terminar)
  tracker.client.write(new Buffer('LOAD'));
  //o..  desconectarlo!
  //tracker.destroy();

  tracker.trackEvery(60).seconds(); //decirle que nos mande su ubicación cada 60 segundos
  tracker.setTimeZone('-6'); //establecerle una zona horaria
  tracker.getPosition(); //solicitar su posicion


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
    console.log('tracker position :', tracker.imei, position);

    let pos = {
      type: 'Point',
      coordinates: [position.lng, position.lat]
    };

    //actualizar posicion en memoria
    tracker.gps.lastPos = pos;
    tracker.gps.lastSeenAt = Date.now();

    //actualizar base de datos?
    //notificar a otras interfaces por ws?
  });

  //ping
  tracker.on('ping', () => {
    console.log('tracker ping :', tracker.imei, tracker.gps.panico);

    //actualizar estado en memoria
    tracker.gps.lastSeenAt = Date.now();
    tracker.gps.online = true;

    //actualizar base de datos?
    //notificar a otras interfaces por ws?
  });

  //help me!
  tracker.on('help me', ()=>{
    console.log('tracker help me :', tracker.imei);
    //actualizar en memoria
    tracker.gps.online  = true;
    tracker.gps.panico = true;
    tracker.gps.lastSeenAt = Date.now();

    //actualizar base de datos?
    //notificar a otras interfaces por ws?
  });

  //panico ha sido desactivado
  tracker.on('et', ()=>{
    console.log('tracker et:', tracker.imei);
    //actualizar en memoria
    tracker.gps.online  = true;
    tracker.gps.panico = false;
    tracker.gps.lastSeenAt = Date.now();

    //actualizar base de datos?
    //notificar a otras interfaces por ws?

  });

});
