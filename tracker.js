var EventEmitter = require('events').EventEmitter;

function Tracker(client, imei){
  EventEmitter.call(this);
  this.imei = imei;
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
