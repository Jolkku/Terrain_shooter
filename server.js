var players = [];

function Player(x, y, socketId) {
  this.socketId = socketId;
  this.x = x;
  this.y = y;
}

let port = process.env.PORT;
/*if (port == null || port == "") {
  port = 3000;
}*/

const uuidv4 = require('uuid/v4');
var express = require('express');
var app = express();
const server =  app.listen(68041);
console.log('Port is: ' + port);
app.use(express.static('public'));
console.log("My server is running");
var socket = require('socket.io');
var io = socket(server);
io.sockets.on('connection', newConnection);



function removeConnection(socket) {
  console.log('Client has disconnected');
  var send = Object.keys(io.sockets.connected).length;
  console.log(Object.keys(io.sockets.connected).length);
  io.emit('users', send);
}

function newConnection(socket) {
  players.push(new Player(0, 0, socket.id));
  let data = {
    x: 0,
    y: 0,
    socketId: socket.id,
    guid: uuidv4(),
    name: players.length,
  }
  socket.emit('createPlayer', data);
  console.log('New connection: socket.id: ' + socket.id);
  var send = Object.keys(io.sockets.connected).length;
  console.log('User count: ' + Object.keys(io.sockets.connected).length);
  io.emit('users', send);

  if (players.length > 1) {
    io.emit('sendHost');
  }

  socket.on('sentHost',
    function(data) {
      socket.broadcast.emit('createPlayer', data);
    }
  );

  socket.on('sendScreenSize',
    function(data) {
      socket.broadcast.emit('updateOtherPlayersScreenSize', data);
    }
  );

  /*socket.on('test',
    function(data) {
      console.log(data.test);
    }
  );*/

  socket.on('sendPlayersLength',
    function() {
      socket.emit('receivePlayersLength', Object.keys(io.sockets.connected).length);
    }
  );

  socket.on('sendStartGame',
    function(data) {
      io.to(`${data.socketId}`).emit('startGame', data);
    }
  );

  socket.on('hostUpdatePos',
    function(data) {
      io.to(`${data.socketId}`).emit('updateOtherPlayersPos', data);
    }
  );

  socket.on('hostUpdateAngle',
    function(data) {
      io.to(`${data.socketId}`).emit('updateOtherPlayersAngle', data);
    }
  );

  socket.on('sendRpg',
    function(data) {
      io.to(`${data.socketId}`).emit('createRpg', data);
    }
  );

  socket.on('receiveInvitation',
    function(data) {
      io.to(`${data.socketId}`).emit('pendingConnection', data);
    }
  );

  socket.on('disconnect',
    function() {
      io.emit('removePlayer', socket.id);
      for (var i = players.length - 1; i >= 0; i--) {
        if (players[i].socketId == socket.id) {
          players.splice(i, 1);
        }
      }
      removeConnection();
    }
  );
}
