var EventEmitter = require('events').EventEmitter;

function Tracker(client){
  EventEmitter.call(this);
  this.imei = client.imei;
  this.client = client;
}

Tracker.prototype = Object.create(EventEmitter.prototype);

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
        var message = '**,imei:' + thisTracker.imei + ',C,' + interval;
        console.log('tracker->trackEvery', message);
        thisTracker.client.write(new Buffer(message));
      };
    });
  return result;
};

Tracker.prototype.getPosition = function(){
  var cmd = '**,imei:' + this.imei + ',B';
  console.log('tracker->getPosition', cmd);
  this.client.write(new Buffer(cmd));
};

Tracker.prototype.cmd = function(cmd){
  cmd = '**,imei:' + this.imei + ','+cmd;
  console.log('tracker->cmd->',cmd);
  this.client.write(new Buffer(cmd));
};

Tracker.prototype.desactivarMotor = function(){
  var cmd = '**,imei:' + this.imei + ',J';
  console.log('tracker->desactivarMotor',cmd);
  this.client.write(new Buffer(cmd));
};

Tracker.prototype.activarMotor = function(){
  var cmd = '**,imei:' + this.imei + ',K';
  console.log('tracker->activarMotor',cmd);
  this.client.write(new Buffer(cmd));
};

Tracker.prototype.cancelHelp = function(){
  var cmd = '**,imei:' + this.imei + ',E';
  console.log('tracker->cancelHelp',cmd);
  this.client.write(new Buffer(cmd));
};

Tracker.prototype.activarAlarma = function(){
  console.log('tracker->activarAlarma');
  this.client.write(new Buffer('**,imei:' + this.imei + ',L'));
};

Tracker.prototype.desactivarAlarma = function(){
  console.log('tracker->desactivarAlarma');
  this.client.write(new Buffer('**,imei:' + this.imei + ',M'));
};

Tracker.prototype.setSpeedLimit = function(limit){
  console.log('tracker->setSpeedLimit', limit);
  if(limit<10) {limit = 10;}
  if(limit>120) {limit = 120;}
  limit = Array(3 - String(limit).length + 1).join('0')+ limit;
  this.client.write(new Buffer('**,imei:' + this.imei + ',H,'+limit));
};

Tracker.prototype.setTimeZone = function(tz){
  if(!tz) {tz='-5';}
  console.log('tracker->setTimeZone', tz);
  this.client.write(new Buffer('**,imei:' + this.imei + ',I,'+tz));
};

Tracker.prototype.setSmsMode = function(){
  console.log('tracker->setSmsMode');
  this.client.write(new Buffer('**,imei:' + this.imei + ',N'));
};

Tracker.prototype.cancelPosition = function(){
  console.log('tracker->cancelPosition');
  this.client.write(new Buffer('**,imei:' + this.imei + ',D'));
};

Tracker.prototype.moveAlarm = function(){
  console.log('tracker->moveAlarm');
  this.client.write(new Buffer('**,imei:' + this.imei + ',G'));
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