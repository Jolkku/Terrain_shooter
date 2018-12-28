var players = [];
var recordedData = [];


function Player(x, y, socketId) {
  this.socketId = socketId;
  this.x = x;
  this.y = y;
}

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

const uuidv4 = require('uuid/v4');
var express = require('express');
var app = express();
const server =  app.listen(port);
console.log('Port is: ' + port);
app.use(express.static('public'));
console.log("My server is running");
var socket = require('socket.io');
var io = socket(server);
io.sockets.on('connection', newConnection);



function removeConnection(socket) {
  console.log('Client has disconnected');
  let send = Object.keys(io.sockets.connected).length;
  console.log(Object.keys(io.sockets.connected).length);
  io.emit('users', send);
  if (Object.keys(io.sockets.connected).length <= 1) {
    recordedData = [];
  }
}

function newConnection(socket) {
  players.push(new Player(0, 0, socket.id));
  let data = {
    x: 0,
    y: 0,
    socketId: socket.id,
    guid: uuidv4(),
    name: players.length,
  };
  socket.emit('createPlayer', data);
  console.log('New connection: socket.id: ' + socket.id);
  var send = Object.keys(io.sockets.connected).length;
  console.log('User count: ' + Object.keys(io.sockets.connected).length);
  io.emit('users', send);

  if (players.length > 1) {
    io.emit('sendHost');
  }

  socket.on('sendPlayers',
    function(data) {
      socket.broadcast.emit('sendMyself', data);
    }
  );

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

  socket.on('sendStartGame',
    function(data) {
      io.to(`${data.socketId}`).emit('startGame', data);
    }
  );

  socket.on('sentMyself',
    function(myData) {
      console.log('receivedSentmyself ' + myData);
      let data = {
        x: 0,
        y: 0,
        socketId: myData.socketId,
        guid: myData.guid,
        name: myData.name,
      };
      io.to(`${myData.to}`).emit('createPlayer', data);
    }
  );

  socket.on('sendUpdateTerrain',
    function(data) {
      io.to(`${data.socketId}`).emit('updateTerrain', data);
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
      io.to(`${data.client1}`).to(`${data.client2}`).emit('createRpg', data);
    }
  );

  socket.on('sendBlowRpg',
    function(data) {
      io.to(`${data.to}`).to(`${data.from}`).emit('blowRpg', data);
      data["timestamp"] = Date.now();
      recordedData.push(data);
    }
  );

  socket.on('sendDeath',
    function(data) {
      if (recordedData.length > 0) {
        let time = Date.now();
        for (var i = 0; i < recordedData.length; i++) {
          if (time - recordedData[i]["timestamp"] > 100) {
            recordedData.splice(i, 1);
          }
        }
      }
      if (recordedData.length < 1) {
        io.to(`${data.to}`).to(`${data.from}`).emit('updateDeath', data);
      }
    }
  );

  socket.on('sendFall',
    function(data) {
      io.to(`${data.to}`).emit('updateDeath', data);
    }
  );

  socket.on('receiveInvitation',
    function(data) {
      io.to(`${data.socketId}`).emit('pendingConnection', data);
    }
  );

  socket.on('logRecordedData',
    function() {
      socket.emit('receiveRecordedData', recordedData);
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
