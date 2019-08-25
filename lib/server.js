var server = module.exports;
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

server.create = function() {

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
      //si tiene imei, dar de baja de memoria!
      if(client.imei && server.trackers[client.imei]){
        server.trackers[client.imei].emit('disconnect', hadError);
        server.trackers[client.imei] = {};
        delete server.trackers[client.imei];
        console.log('deleted: ', client.imei);
      }else{
        console.log('delete: no encontrado.');
      }
    });

    client.on('data', (chunk) => {
      data = chunk.toString();
      //proceso de cola de mensajes recibidos segun documentacion
      var messagesToProcess = data.split(';');
      messagesToProcess.forEach((msg)=>{
        processData(server, client, msg);
      });
    });
  });

  server.trackers = new EventEmitter();
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
  //obtenemos el imei del cliente(socket existente) o si no de data(socket nuevo)
  var imei = client.imei||extractImei(data);
  var evento;
  if(!imei) {return;} //si no hay imei no nos interesa
  //aqui separamos las partes del mensaje que vamos a procesar.
  var messageParts = data.trim().split(',');
  //si el mensaje no tiene partes, no nos interesa
  if(!messageParts.length){return;}
  //obtenemos evento...
  if( messageParts[1]){
    evento =  messageParts[1];
  }

  /*
  ██       ██████   ██████   ██████  ███    ██
  ██      ██    ██ ██       ██    ██ ████   ██
  ██      ██    ██ ██   ███ ██    ██ ██ ██  ██
  ██      ██    ██ ██    ██ ██    ██ ██  ██ ██
  ███████  ██████   ██████   ██████  ██   ████

  Un dispositivo intenta hacer logon:
  */
  if (messageParts && messageParts[2] === 'A') {

    //ponemos el imei en el cliente para futura identificacion
    client.imei = imei;

    //instanciamos el cliente para trabajar con el.
    var nuevoTracker = new Tracker(client);

    //lo instanciamos en memoria en array trackers del server con el imei como indice
    server.trackers[imei] = nuevoTracker;

    //heredar evento hacia afuera!
    server.trackers.emit('logon', nuevoTracker);

    return;
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

    //responder "ON". (solo llegan de unidades inicializadas previamente)
    server.trackers[imei].client.write(new Buffer('ON'));

    //heredar evento
    server.trackers[imei].emit('ping', server.trackers[imei]);

    return; //un ping no contiene nada mas, finalizar
  }

  /*
  ██████   ██████  ███████ ██  ██████ ██  ██████  ███    ██
  ██   ██ ██    ██ ██      ██ ██      ██ ██    ██ ████   ██
  ██████  ██    ██ ███████ ██ ██      ██ ██    ██ ██ ██  ██
  ██      ██    ██      ██ ██ ██      ██ ██    ██ ██  ██ ██
  ██       ██████  ███████ ██  ██████ ██  ██████  ██   ████

  El mensaje recibido contiene una posicion && messageParts[4] === 'F'
  */
  if (messageParts && messageParts[4] && messageParts[4] === 'F') {

    if (!server.trackers[imei]) { //el tracker, no se encuentra entre los inicializados en memoria (logon)
      console.log('tk103b Server->Se ha recibido una posicion de un GPS no reconocido!', imei);
      return;
    }

    server.trackers[imei].emit('position', new Position(data));
    //no return!, continuar por si es un evento que contiene posicion, tambien emitirlo.
  }

  /*
  ███████ ██    ██ ███████ ███    ██ ████████
  ██      ██    ██ ██      ████   ██    ██
  █████   ██    ██ █████   ██ ██  ██    ██
  ██       ██  ██  ██      ██  ██ ██    ██
  ███████   ████   ███████ ██   ████    ██

  Cualquier otro evento recibido por el tracker que no sea tracker (position)
  */
  if (messageParts && evento && evento !== 'tracker') {

    if (!server.trackers[imei]) {
      console.log(`tk103b Server->processData->se ha recibido un evento ${evento} de un GPS (${imei}) no reconocido.` );
      return;
    }

    //console.log(`tk103b Server->Tracker ${imei} evento ${evento}`);
    server.trackers[imei].emit(evento, messageParts);
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
