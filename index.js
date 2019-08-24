var net = require('net');
var EventEmitter = require('events').EventEmitter;
var Tracker = require('./tracker');
var Position = require('./position');

/*
███████ ███████ ██████  ██    ██ ███████ ██████
██      ██      ██   ██ ██    ██ ██      ██   ██
███████ █████   ██████  ██    ██ █████   ██████
     ██ ██      ██   ██  ██  ██  ██      ██   ██
███████ ███████ ██   ██   ████   ███████ ██   ██
*/

var crearServer = function() {

  var data = '';

  var server = net.createServer();

  /*
   ██████  ██████  ███    ██ ███    ██ ███████  ██████ ████████ ██  ██████  ███    ██
  ██      ██    ██ ████   ██ ████   ██ ██      ██         ██    ██ ██    ██ ████   ██
  ██      ██    ██ ██ ██  ██ ██ ██  ██ █████   ██         ██    ██ ██    ██ ██ ██  ██
  ██      ██    ██ ██  ██ ██ ██  ██ ██ ██      ██         ██    ██ ██    ██ ██  ██ ██
   ██████  ██████  ██   ████ ██   ████ ███████  ██████    ██    ██  ██████  ██   ████
  */

  server.on('connection', (client)=>{
    console.log('·• Nuevo cliente conectado!:', client.address());

    //#TODOS: validar otro tipo de conexiones y estar seguros que es un tk103b antes de intentar procesar los mensajes.

    client.on('error', (err) => {
      console.log('socket error', client.imei, client.address(), err);
    });

    client.on('end', () => {
      console.log('socket end',client.imei , client.address());
      //si tiene imei, dar de baja de memoria!
      if(client.imei && server.trackers[client.imei]){
        server.trackers[client.imei] = {};
        delete server.trackers[client.imei];
        console.log('deleted: ', client.imei);
      }else{
        console.log('delete: no encontrado.');
      }
      //el socket se ha cerrado, el cliente ha desconectado, perdida de internet.
    });

    client.on('close', (hadError) => {
      console.log('socket close', client.imei, hadError, client.address());
      //si tiene imei, dar de baja de memoria!
      if(client.imei && server.trackers[client.imei]){
        server.trackers[client.imei] = {};
        delete server.trackers[client.imei];
        console.log('deleted: ', client.imei);
      }else{
        console.log('delete: no encontrado.');
      }
      //el socket se ha cerrado, el cliente ha desconectado, perdida de internet.
    });

    client.on('data', (chunk) => {
      data = chunk.toString();
      console.log('Arribo de datos de cliente:', data);

      //lo tratan de ver con el navegador
      if (data.substr(0, 3) === 'GET') { client.destroy(); return;}

      //proceso de cola de mensajes recibidos segun documentacion
      var messagesToProcess = data.split(';');
      console.log('Mensajes a procesar:', messagesToProcess);
      messagesToProcess.forEach((msg)=>{
        console.log('Procesando:', msg);
        processData(server, client, msg);
      });
    });

  });

  server.on('listening', ()=>{
    console.log('·• Listening on:', server.address());
  });

  server.trackers = {};
  return server;
};

/*
██████  ██████   ██████   ██████ ███████ ███████ ███████ ██████   █████  ████████  █████
██   ██ ██   ██ ██    ██ ██      ██      ██      ██      ██   ██ ██   ██    ██    ██   ██
██████  ██████  ██    ██ ██      █████   ███████ ███████ ██   ██ ███████    ██    ███████
██      ██   ██ ██    ██ ██      ██           ██      ██ ██   ██ ██   ██    ██    ██   ██
██      ██   ██  ██████   ██████ ███████ ███████ ███████ ██████  ██   ██    ██    ██   ██
*/

function processData(server, client, data) {
  console.log('tk103b Server->incommingData:>>>', data, '<<<');

  var imei = client.imei||extractImei(data); //obtenemos el imei del cliente o si no de data

  var evento;

  if(!imei) {return;} //si no hay imei no nos interesa

  console.log('imei en proceso:', imei);

  //aqui separamos las partes del mensaje que vamos a procesar.
  var messageParts = data.trim().split(',');

  if(!messageParts.length){return;} //si el mensaje no tiene partes, no nos interesa

  if( messageParts[1]){
    evento =  messageParts[1];
  }

  /*
  ██████  ██ ███    ██  ██████
  ██   ██ ██ ████   ██ ██
  ██████  ██ ██ ██  ██ ██   ███
  ██      ██ ██  ██ ██ ██    ██
  ██      ██ ██   ████  ██████
  */
  /*
  cuando el mensaje solo tiene el imei y es el mismo del cliente...
  */
  if (imei === messageParts[0]) {
    //es un ping!

    //responder "ON". (solo llegan de unidades inicializadas previamente)
    client.write(new Buffer('ON'));

    server.trackers[imei].gps.lastSeenAt = Date.now();
    server.trackers[imei].gps.online = true;

    //actualizar base de datos?
    //notificar a otras interfaces por ws?

    console.log(`tk103b Server->Tracker ${imei} Actualizado en evento ping`, server.trackers[imei].gps);
    return; //un ping no contiene nada mas, finalizar
  }

  /*
  ██       ██████   ██████   ██████  ███    ██
  ██      ██    ██ ██       ██    ██ ████   ██
  ██      ██    ██ ██   ███ ██    ██ ██ ██  ██
  ██      ██    ██ ██    ██ ██    ██ ██  ██ ██
  ███████  ██████   ██████   ██████  ██   ████
  */
  /*
  Un dispositivo intenta hacer logon:
  */
  if (messageParts && messageParts[2] === 'A') {

    console.log('tk103b Server->processData->logon', imei);

    //aqui podriamos buscar el imei en nuestra bd para ver si puede iniciar (activo, pagado, valido, etc)

    //si nuestra validación con el imei esta bien... continuamos inicializandolo

    //instanciamos el cliente como tracker para trabajar con el.
    var nuevoTracker = new Tracker(client, imei);

    //este objeto va a ser usado para manipularlo en memoria en cada evento subsecuente que se reciba de el
    nuevoTracker.gps = {
      id:'id de la base de datos',
      imei: imei,
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

    //esperar 5 segundos e inicializar con comandos!
    setTimeout(() => {
      nuevoTracker.trackEvery(60).seconds(); //decirle que nos mande su ubicación cada 60 segundos
      nuevoTracker.setTimeZone('-6'); //establecerle una zona horaria
      nuevoTracker.getPosition(); //solicitar su posicion
    }, 5000);


    //ponemos el imei en el cliente para futura identificacion de pings
    client.imei = imei;

    //una vez que queremos que comience a mandarnos eventos, le respondemos "LOAD"
    client.write(new Buffer('LOAD')); //le respondemos load para que continue enviando posiciones

    //lo instanciamos en memoria en array trackers del server con el imei como indice (puede ser el id de la bd tambien)
    server.trackers[imei] = nuevoTracker;

    console.log(`tk103b Server->Tracker ${imei} conectado.`, nuevoTracker.gps);
    return;
  }

  /*
  ██████   ██████  ███████ ██  ██████ ██  ██████  ███    ██
  ██   ██ ██    ██ ██      ██ ██      ██ ██    ██ ████   ██
  ██████  ██    ██ ███████ ██ ██      ██ ██    ██ ██ ██  ██
  ██      ██    ██      ██ ██ ██      ██ ██    ██ ██  ██ ██
  ██       ██████  ███████ ██  ██████ ██  ██████  ██   ████
  */
  /*
  el mensaje recibido contiene un mensaje de posicion
  */
  if (messageParts && messageParts[4] && messageParts[4] === 'F') {
    console.log('tk103b Server->processData->position(' + evento + ')');

    if (!server.trackers[imei]) { //el tracker, no se encuentra entre los inicializados en memoria (logon)
      console.log('tk103b Server->Se ha recibido una posicion de un GPS no reconocido!', imei);
      return;
    }

    var position = new Position(data);
    //si la posicion es la misma que la ultima...
    //#todos:Calcular distancia tambien y no mandar si no es mayor a un umbral (10m)
    if (server.trackers[imei].gps.lastPos && server.trackers[imei].gps.lastPos.coordinates[0] === position.lng && server.trackers[imei].gps.lastPos.coordinates[1] === position.lat) {
      //es la misma posicion que la anterior!
      console.log('tk103b Server->position->repetida', position.lat, position.lng);
    } else {

      console.log('tk103b Server->position: ', imei, position.lat, position.lng);

      //actualizar posicion en memoria
      server.trackers[imei].gps.lastPos = {
        type: 'Point',
        coordinates: [position.lng, position.lat]
      };
      server.trackers[imei].gps.lastSeenAt = Date.now();

      //actualizar base de datos?
      //notificar a otras interfaces por ws?

      console.log(`tk103b Server->Tracker ${imei} Actualizado en evento ${evento}`, server.trackers[imei].gps.lastPos);
    }

    //no return!, continuar por si ademas de posicion trae otro paquete, como "help me"
  }

  /*
  ██   ██ ███████ ██      ██████      ███    ███ ███████
  ██   ██ ██      ██      ██   ██     ████  ████ ██
  ███████ █████   ██      ██████      ██ ████ ██ █████
  ██   ██ ██      ██      ██          ██  ██  ██ ██
  ██   ██ ███████ ███████ ██          ██      ██ ███████
  */
  /*
  el paquete contiene un help me, se ha presionado el boton, o es una continuación de evento
  que normalmente lo manda cada 30 segundos una vez que ha sido activado hasta que se
  desactive ya sea por un comando sms o tcp.
  */
  if (messageParts && evento && evento === 'help me') {
    imei = extractImei(data);
    console.log('tk103b Server->processData->help me:', evento, imei);

    if (!server.trackers[imei]) { //el tracker no esta registrado con nosotros!
      console.log('tk103b Server->Se ha recibido una solicitud de ayuda (help me) de un GPS no reconocido!', imei);
      return;
    }

    //actualizar en memoria
    server.trackers[imei].gps.online  = true;
    server.trackers[imei].gps.panico = true;
    server.trackers[imei].gps.lastSeenAt = Date.now();

    //actualizar base de datos?
    //notificar a otras interfaces por ws?

    console.log(`tk103b Server->Tracker ${imei} Actualizado en evento ${evento}`, server.trackers[imei].gps);
    return; //despues de helpe no trae mas...
  }

  /*
    ██████  █████  ███    ██  ██████ ███████ ██       █████  ██████      ██████   █████  ███    ██ ██  ██████  ██████
   ██      ██   ██ ████   ██ ██      ██      ██      ██   ██ ██   ██     ██   ██ ██   ██ ████   ██ ██ ██      ██    ██
   ██      ███████ ██ ██  ██ ██      █████   ██      ███████ ██████      ██████  ███████ ██ ██  ██ ██ ██      ██    ██
   ██      ██   ██ ██  ██ ██ ██      ██      ██      ██   ██ ██   ██     ██      ██   ██ ██  ██ ██ ██ ██      ██    ██
    ██████ ██   ██ ██   ████  ██████ ███████ ███████ ██   ██ ██   ██     ██      ██   ██ ██   ████ ██  ██████  ██████
  */
  /*
  en la posicion 1 llega un "et" como confirmacion de haber recibido un comando para cancelar el
  boton de panico tracker.cancelHelp();
  */
  if (messageParts && evento && evento === 'et') {
    imei = extractImei(data);
    console.log('tk103b Server->processData->cancelar panico(et):', evento, imei);

    //actualizar en memoria
    server.trackers[imei].gps.online  = true;
    server.trackers[imei].gps.panico = false;
    server.trackers[imei].gps.lastSeenAt = Date.now();

    //actualizar base de datos?
    //notificar a otras interfaces por ws?

    console.log(`tk103b Server->Tracker ${imei} Actualizado en evento etc (cancelar panico aceptado)`, server.trackers[imei].gps);
    return; //despues de confirmación no trae mas
  }
  /*
  ███████ ██    ██ ███████ ███    ██ ████████
  ██      ██    ██ ██      ████   ██    ██
  █████   ██    ██ █████   ██ ██  ██    ██
  ██       ██  ██  ██      ██  ██ ██    ██
  ███████   ████   ███████ ██   ████    ██
  */
  /*
  cualquier otro evento recibido por el tracker que no sea helpe, tracker (position), o et...
  */
  if (messageParts && evento && (evento !== 'help me' || evento !== 'et' || evento !== 'tracker')) {
    if (!server.trackers[imei]) {
      console.log(`tk103b Server->processData->se ha recibido un evento ${evento} de un GPS (${imei}) no reconocido.` );
      return;
    }
    //actualizar en memoria
    server.trackers[imei].gps.online  = true;
    server.trackers[imei].gps.lastSeenAt = Date.now();

    //actualizar base de datos?
    //notificar a otras interfaces por ws?

    console.log(`tk103b Server->Tracker ${imei} Actualizado en evento ${evento}`, server.trackers[imei].gps);
    return; //fin!
  }
}

/*
 * Obtener el imei del mensaje
 */
function extractImei(message) {
  var data = (/imei\:([0-9]*)/).exec(message);
  if (data && typeof data === 'object' && data.length && data[1]) {
    return data[1];
  }
  return false;
}

//aqui vamos!
crearServer().listen(9000, () => {
  console.log('·• tk103b Server ready!');
});
