var moment = require('moment');
var EventEmitter = require('events').EventEmitter;

function Tracker(client){
  EventEmitter.call(this);
  this.imei = client.imei;
  this.client = client;
}

Tracker.prototype = Object.create(EventEmitter.prototype);

Tracker.prototype.logCommand = function(cmd){
  if(this.logCommand){console.log(`tracker->cmd(${cmd})`);}
};

/*
 * usage: tracker.trackEvery(10).seconds();
 *        tracker.trackEvery(1).hours();
 *        tracker.trackEvery(10).meters();
 */
Tracker.prototype.trackEvery = function(value){
  var result = {};
  var thisTracker = this;
  var multiTrackFormat = {
    'seconds': [2,'s'],
    'minutes': [2,'m'],
    'hours':   [2,'h'],
    'meters':  [4,'m']
  };
  Object.keys(multiTrackFormat)
    .forEach((k) => {
      result[k] = function(){
        var format = multiTrackFormat[k];
        var interval = Array(format[0] - String(value).length + 1).join('0')+ value + format[1];
        var message = `C,${interval}`;
        console.log('tracker->trackEvery', message);
        thisTracker.cmd(message);
      };
    });
  return result;
};

Tracker.prototype.send = function(data){
  if(this.logCommandSend){console.log('tracker->send', data);}
  this.client.write(new Buffer(data));
};

Tracker.prototype.cmd = function(cmd){
  this.send(`**,imei:${this.imei},${cmd}`);
};

Tracker.prototype.stopTracking = function(){
  this.logCommand('stopTracking');
  this.cmd('A');
};

Tracker.prototype.getPosition = function(){
  this.logCommand('getPosition');
  this.cmd('B');
};

Tracker.prototype.desactivarMotor = function(){
  this.logCommand('desactivarMotor');
  this.cmd('J');
};

Tracker.prototype.activarMotor = function(){
  this.logCommand('activarMotor');
  this.cmd('K');
};

Tracker.prototype.cancelHelp = function(){
  this.logCommand('cancelHelp');
  this.cmd('E');
};

Tracker.prototype.activarAlarma = function(){
  this.logCommand('activarAlarma');
  this.cmd('L');
};

Tracker.prototype.desactivarAlarma = function(){
  this.logCommand('desactivarAlarma');
  this.cmd('M');
};

Tracker.prototype.setSpeedLimit = function(limit){
  this.logCommand('setSpeedLimit', limit);
  if(limit<10) {limit = 10;}
  if(limit>120) {limit = 120;}
  limit = Array(3 - String(limit).length + 1).join('0')+ limit;
  this.cmd(`H,${limit}`);
};

Tracker.prototype.setTimeZone = function(tz){
  if(!tz) {tz='-5';}
  this.logCommand('setTimeZone: '+tz );
  this.cmd(`I,${tz}`); //responde 'it'
};

Tracker.prototype.setSmsMode = function(){
  this.logCommand('setSmsMode');
  this.cmd(`N`);
};

Tracker.prototype.cancelPosition = function(){
  this.logCommand('cancelPosition');
  this.cmd(`D`);
};

Tracker.prototype.moveAlarm = function(){
  this.logCommand('moveAlarm');
  this.cmd(`G`);
};

Tracker.prototype.addGeoFence = function(a, b, c, d){
  this.logCommand('addGeoFence', a, b, c ,d);
  this.cmd(`O,${a},${b},${c},${d}`);
};

Tracker.prototype.disableGeoFence = function(){
  this.logCommand('disableGeoFence');
  this.cmd(`P`);
};

Tracker.prototype.uploadSDPoints = function(date){
  if(!moment(date).isValid()) {return false;}
  this.logCommand('uploadSDPoints');
  var theDate = moment(date).format('YYYYMMDD');
  this.cmd(`Q,${theDate}`);
};

Tracker.prototype.cancelUploadSDPoints = function(){
  this.logCommand('cancelUploadSDPoints');
  this.cmd(`S`);
};

module.exports = Tracker;

/*
Get current position ( 1 position only )
** , imei : 999999999999999 , B ;

Set multiple positions
** , imei : 999999999999999 , C , # # x ;
    where # # is a number from 01 to 99
    and x is s for seconds , m for minutes , h for hours
        Example : set location at every 2 minutes
        ** , imei : 999999999999999 , C , 02m ;

Stop sending positions
** , imei : 999999999999999 , A ;

Stop sending alarm messages (door alarm , acc alarm , power alarm , SOS alarm)
** , imei : 999999999999999 , E;

Set positioning by distance ( only if vehicle tracker sends position has traveled XXXX meters )
** , imei : 999999999999999 , F , XXXXm ;
    where XXXX is the distance in meters (you can September less than 200m but the minimum will always be about 200m )

Activate the alarm movement ( sends SMS if unit moves 200m )
** , imei : 999999999999999 , G ;

Activate the speed alarm ( sends SMS if speed goes above XXX km / h )
** , imei : 999999999999999 , H , XXX ;
    where XXX is the speed in km / h

Set the timezone to GMT +0 (this only works enquiry.c tracker on gps -trace with timezone set to +0
** , imei : 999999999999999 , I +0;
    I is capitol i

Stop / block the engine
** , imei : 999999999999999 , J ;

Resume / unblock the engine
** , imei : 999999999999999 , K ;

Arm alarm (door , acc , shock sensor)
** , imei : 999999999999999 , L ;

Disarm alarm (door , acc , shock sensor)
** , imei : 999999999999999 , M ;

Turn off GPRS ( returns to SMS mode . This can only be undone by sending an SMS )
** , imei : 999999999999999 , N ;

Create a Geofence alarm between points A, B and C , D
** , IMEI : 999999999999999 O, A, B , C, D;
    Example:
    ** , imei : 012497000324230 , O, -30.034173 , -051.167557 , -30.044679 , -051.146198 ;

Deactivate geofence
** , imei : 999999999999999 , P ;

Request upload of SD card saved points ( only on tracker with sd card )
** , imei : 999999999999999 , Q , XXXXXXXX ;
    where XXXXXXXX is the date in yyyymmdd format

Cancel upload of SD card saved points
** , imei : 999999999999999 , S ;

*/
