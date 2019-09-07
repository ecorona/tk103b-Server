/*
 * convertir grados a to decimal
 */
function convertPoint(point){
  var integerPart = ~~(Math.round(point)/100);
  var decimalPart = (point - (integerPart * 100)) / 60;
  return (integerPart + decimalPart).toFixed(6);
}

/*
 * Conversion de coordenadas
 * West and South are negative coordinates.
 */
function toSign(c){
  return c === 'S' || c === 'W' ? -1 : 1;
}

/*
 * Objeto de posicion obtenido del mensaje de datos del dispositivo que contenga una posicion
 */
function Position(message){
  var parts = message.split(',');
  this.lat = toSign(parts[8])  * convertPoint(parseFloat(parts[7]));
  this.lng = toSign(parts[10]) * convertPoint(parseFloat(parts[9]));
  this.point = {
    type: 'Point',
    coordinates: [this.lng, this.lat]
  };
  var anio = '20' + parts[2].substr(0, 2);
  var mes = parts[2].substr(2,2);
  var dia = parts[2].substr(4,2);
  var hr = parts[2].substr(6,2);
  var mm = parts[2].substr(8,2);
  var ss = parts[2].substr(10,2);
  this.date = new Date(
              parseInt(anio, 10),
              parseInt(mes,10)-1,
              parseInt(dia,10),
              parseInt(hr,10),
              parseInt(mm,10),
              parseInt(ss,10));

  this.imei = parts[0].split(':')[1];
  this.speed = parseInt(parts[11], 10) * 1.85;
  if(parts && parts[12]) {this.heading = parseInt(parts[12], 10);}else{this.heading=-1;}
}

module.exports = Position;
