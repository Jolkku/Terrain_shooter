var socket;
var players = [];
var rpgs = [];
var particles = [];
var airBurstParticles = [];
var users = 0;
var scl = 30;   //default scale
var vertexes;
var terrain = [];
var stage = 0;
var counter = true;
var counter4 = true;
var counter5 = true;
//var maxTerrainHeight = -500;    //dafault value
//var smoothness = 0.2;   //default value
var playerIcons = [];
var pendingPlayer = 0;
var screenWidth;
var screenHeight;
var connectedPlayer;
var counter2 = true;
var terrainLoadingdone = true;
var weapon = "cannon";
var id;
var airBurstFire = true;
var rtime = 5000;

function setup() {
  createCanvas(windowWidth, windowHeight - 5);
  background(255);
  screenWidth = windowWidth;
  screenHeight = windowHeight - 5;
  socket = io.connect('https://sheltered-plateau-92653.herokuapp.com/');
  //socket = io.connect('localHost:3000');
  socket.on('users', setUserCount);
  socket.on('createPlayer', function(data){createPlayer(data)});
  socket.on('updateOtherPlayersScreenSize', function(data){updateOtherPlayersScreenSize(data)});
  socket.on('updateDeath', function(data){updateDeath(data)});
  socket.on('updateTerrain', function(data){updateTerrain(data)});
  socket.on('removePlayer', function(socketId){removePlayer(socketId)});
  socket.on('sendHost', function(){sendHost()});
  socket.on('sendMyself', function(data){sendMyself(data)});
  socket.on('pendingConnection', function(data){pendingPlayer = data.name});
  socket.on('startGame', function(data){startGame(data)});
  socket.on('updateOtherPlayersPos', function(data) {players[1].x = data.x;players[1].y = data.y});
  socket.on('createRpg', function(data){rpgs.push(new Rpg(data.x, data.y, data.angle, data.power, data.name, data.guid, data.type))});
  socket.on('updateOtherPlayersAngle', function(data){players[1].angle = data.angle});
  socket.on('blowRpg', function(data){blowRpg(data)});
}



function draw() {
  switch (stage) {
    case 0:
    if (counter) {
      counter = false;
      if (players.length > 0) {
        resetPlayersScore();
        sendPlayers();
      }
      generateTerrain(scl, screenWidth, 500, 0.08, random(0, 99999));
      createCanvas(windowWidth, windowHeight - 5);
    }
    translate(0, windowHeight-5);
    background(135, 206, 250);
    stroke(69, 150, 0);
    renderTerrain();
    renderMenuText();
      break;

    case 1:
    if (counter2 && players.length > 1 && terrainLoadingdone) {
      createCanvas(screenWidth, screenHeight);
      pendingPlayer = null;
      connectedPlayer = null;
      counter2 = false;
      resetPlayersPos();
    }
    translate(0, screenHeight);
    vertexes = round(screenWidth/scl);
    background(135, 206, 250);
    stroke(69, 150, 0);
    updateParticles();
    updateAirBurstParticles();
    renderTerrain();
    checkTerrainCollision();
    moving();
    updatePlayers();
    updateRpgs();
    resetTouching();
    renderGameText();
    break;

    case 2:
    if (counter4) {
      reset();
      counter4 = false;
    }
    translate(0, screenHeight);
    background(135, 206, 250);
    stroke(69, 150, 0);
    updateParticles();
    updateAirBurstParticles();
    renderTerrain();
    checkTerrainCollision();
    moving();
    updatePlayers();
    updateRpgs();
    resetTouching();
    renderGameText();
    break;

    default:
    background(255);
    fill(0);
    textSize(40);
    text(users, 10, 30);
  }
}



function Player(x, y, socketId, guid, name) {
  this.dead = false;
  this.screenWidth = windowWidth;
  this.screenHeight = windowHeight - 5;
  this.score = 0;
  this.shoot = false;
  this.power = 0;
  this.touching = false;
  this.x = x;
  this.y = y;
  this.angle = -Math.PI/2;
  this.guid = guid;
  this.socketId = socketId;
  this.name = name;
  this.colour = 0;
  this.velx = 0;
  this.vely = 0;
  this.render = function() {
    this.colour = (this.name - 1) * 255;
    push();
    rectMode(CENTER);
    stroke(0);
    line(this.x + Math.cos(this.angle) * 10, this.y + Math.sin(this.angle) * 10, this.x + (Math.cos(this.angle) * 25), this.y + (Math.sin(this.angle) * 25));
    fill(this.colour, 0, 255 - this.colour);
    noStroke();
    translate(this.x, this.y);
    rect(0, 0, 6, 6);
    pop();
  };
  this.update = function() {
    if (this.y < -5) {
      if (this.touching == false) {
        this.vely += 0.2;
        this.x += this.velx;
        this.y += this.vely;
      }
    } else {
      if (this.dead == false && stage == 1 && players[0].name == this.name) {
        console.log("ran fall");
        this.dead = true;
        this.death();
        players[1].score++;
        stage = 2;
        let data = {
          to: players[1].socketId,
          socketId: players[0].socketId,
          addScore: 0,
          x: players[0].x,
          y: players[0].y,
        }
        socket.emit('sendDeath', data);
      }
    }
    if (this.shoot) {
      if (this.power < 20) {
        this.power += 0.08;
      }
    }
  };
  this.death = function() {
    while(counter3 < 101) {
      particles.push(new Particle(this.x, this.y, 15, true));
      counter3++;
    }
  };
}

function PlayerIcon(x, y, name, socketId) {
  this.socketId = socketId;
  this.scl = 30;
  this.name = name;
  this.pos = createVector(x, y);
  this.render = function() {
    push();
    stroke(0);
    strokeWeight(2);
    textAlign(CENTER, CENTER);
    rectMode(CENTER);
    if (pendingPlayer == this.name) {
      fill(0, 255, 0);
    } else {
      fill(255);
    }
    rect(this.pos.x, this.pos.y, (this.scl * 4.16666666667), (this.scl * 1.33333333333));
    fill(0);
    textSize(this.scl);
    strokeWeight(1);
    text(`Player${this.name}`, this.pos.x, this.pos.y);
    pop();
  };
  this.update = function() {
    if (mouseX > this.pos.x - 63 && mouseX < this.pos.x + 63 && (mouseY - height) > this.pos.y - 20 && (mouseY - height) < this.pos.y + 20) {
      this.scl = 32;
    } else {
      this.scl = 30;
    }
  };
}

function Rpg(x, y, angle, power, name, guid, type) {
  this.type = type;
  this.guid = guid;
  this.dead = false;
  this.name = name;
  this.power = power;
  this.angle = angle;
  this.pos = createVector(x, y);
  this.vel = createVector(Math.cos(this.angle) * this.power, Math.sin(angle) * this.power);
  this.update = function() {
    this.vel.add(0, 0.2);
    this.pos.add(this.vel);
  };
  this.render = function() {
    if (this.dead == false) {
      push();
      fill(255, 0, 0);
      strokeWeight(5);
      stroke(255, 0, 0);
      point(this.pos.x, this.pos.y);
      pop();
    }
  };
  this.blow = function() {
    switch (type) {
      case "cannon":
      let counter = 0;
      while(counter < 101) {
        particles.push(new Particle(this.pos.x, this.pos.y, 15, true));
        counter++;
      }
        break;
      case "airburst":
        for (var i = 0; i < 100; i++) {
          airBurstParticles.push(new AirBurstParticle(this.pos.x, this.pos.y, 35));
        }
        break;
    }
  };
  this.chechHit = function() {
    if (dist(players[0].x, players[0].y, this.pos.x, this.pos.y) < 30) {
      players[0].dead = true;
      players[0].death();
      players[1].score++;
      stage = 2;
      let data = {
        to: players[1].socketId,
        socketId: players[0].socketId,
        addScore: 0,
        x: players[0].x,
        y: players[0].y,
      }
      socket.emit('sendDeath', data);
    }
    if (dist(players[1].x, players[1].y, this.pos.x, this.pos.y) < 30) {
      players[1].dead = true;
      players[1].death();
      players[0].score++;
      stage = 2;
      let data = {
        to: players[1].socketId,
        socketId: players[1].socketId,
        addScore: 1,
        x: players[1].x,
        y: players[1].y,
      }
      socket.emit('sendDeath', data);
    }
  };
}

function Particle(x, y, life, vel) {
  this.pos = createVector(x, y);
  if (vel) {
    this.vel = p5.Vector.random2D();
    this.vel.mult(random(0.5, 4));
  } else {
    this.vel = 0;
  }
  this.life = 255;
  this.update = function() {
    this.pos.add(this.vel);
    this.life -= life * 1.5;
  };
  this.render = function() {
    push();
    fill(255);
    strokeWeight(3);
    stroke(0, this.life);
    point(this.pos.x, this.pos.y);
    pop();
  };
}

function AirBurstParticle(x, y, life) {
  this.life = 255;
  this.pos = createVector(x, y);
  this.vel = p5.Vector.random2D();
  this.vel.mult(random(1.5, 6));
  this.pPos = createVector(this.pos.x, this.pos.y);
  this.update = function() {
    this.pPos.set(this.pos);
    this.pos.add(this.vel);
    this.life -= life;
  }
  this.render = function() {
    if (this.life > 0) {
      push();
      stroke(0, (this.life * 2));
      strokeWeight(1);
      line(this.pPos.x, this.pPos.y, this.pos.x, this.pos.y);
      pop();
    }
  }
}



function generateTerrain(size, width, maxHeight, smoothness, setyoff) {
  terrain = [];
  vertexes = round(width/size);
  yoff = setyoff;
  for (let x = 0; x <= vertexes; x++) {
    terrain[x] = map(noise(yoff), 0, 1, 0, -maxHeight);
    yoff += smoothness;
  }
  terrain[round(terrain.length / 2)] = 0;
  terrain[round(terrain.length / 2) - 1] = 0;
  terrain[round(terrain.length / 2) - 2] += 30;
  terrain[round(terrain.length / 2) + 1] += 30;
}

function checkForDuplicatePlayers(array) {
  for ( let i = 0; i < array.length; i++){
    for (let j = i+1; j< array.length; j++){
      if (array[i].guid === array[j].guid){
        players.splice(i, 1);
      }
    }
  }
}

function checkForDuplicatePlayerIcons(array) {
  for ( let i = 0; i < array.length; i++){
    for (let j = i+1; j< array.length; j++){
      if (array[i].socketId === array[j].socketId){
        playerIcons.splice(i, 1);
      }
    }
  }
}

function touchingLine(x1, y1, x2, y2, x3, y3, x4, y4) {
  let uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
  let uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
  if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
    return true;
  }
  return false;
}

function modulo(n, m) {
  return ((n % m) + m) % m;
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function mouseClicked() {
  if (stage == 0) {
    counter3 = 0;
    for (let i = 0; i < playerIcons.length; i++) {
      if (playerIcons[i].scl == 32) {
        if (pendingPlayer == playerIcons[i].name) {
          generateTerrain(scl, screenWidth, 500, 0.08, random(0, 99999));
          stage = 1;
          counter2 = true;
          if ((players[0].screenWidth * players[0].screenHeight) < (players[1].screenWidth * players[1].screenHeight) || (players[0].screenWidth * players[0].screenHeight) == (players[1].screenWidth * players[1].screenHeight)) {
            screenWidth = players[0].screenWidth;
            screenHeight = players[0].screenHeight;
          } else {
            screenWidth = players[1].screenWidth;
            screenHeight = players[1].screenHeight;
          }
          let data = {
            socketId: playerIcons[i].socketId,
            terrain: terrain,
            width: screenWidth,
            height: screenHeight,
          };
          connectedPlayer = playerIcons[i].socketId;
          socket.emit('sendStartGame', data);
          for (let i = 1; i < players.length; i++) {
            if (players[i].socketId != connectedPlayer) {
              players.splice(i, 1);
            }
          }
        } else {
          let data = {
            socketId: playerIcons[i].socketId,
            name: players[0].name,
            connectedPlayer: players[0].socketId,
          };
          socket.emit('receiveInvitation', data);
          console.log("connect with player" + playerIcons[i].name + ' ' + 'socketId: ' + playerIcons[i].socketId);
          connectedPlayer = playerIcons[i].socketId;
        }
      }
    }
  } else if (stage == 1) {
    switch (weapon) {
      case "cannon":
        if (players[0].shoot) {
          let guid = uuidv4();
          rpgs.push(new Rpg(players[0].x, players[0].y, players[0].angle, players[0].power, players[0].name, guid, weapon));
          let data = {
            x: players[0].x,
            y: players[0].y,
            angle: players[0].angle,
            power: players[0].power,
            socketId: players[1].socketId,
            name: players[0].name,
            guid: guid,
            type: weapon,
          };
          socket.emit('sendRpg', data);
          data = {
            socketId: players[1].socketId,
            angle: players[0].angle,
          };
          socket.emit('hostUpdateAngle', data);
          players[0].shoot = false;
          players[0].power = 0;
        } else {
          players[0].shoot = true;
        }
        break;
      case "airburst":
        if (airBurstFire) {
          airBurstFire = false;
          console.log(airBurstFire);
          reloadAirburst();
          let guid = uuidv4();
          rpgs.push(new Rpg(players[0].x, players[0].y, players[0].angle, 30, players[0].name, guid, weapon));
          let data = {
            x: players[0].x,
            y: players[0].y,
            angle: players[0].angle,
            power: 30,
            socketId: players[1].socketId,
            name: players[0].name,
            guid: guid,
            type: weapon,
          };
          socket.emit('sendRpg', data);
        }
        break;
    }
  }
}

function setUserCount(send) {
  users = send;
}

function mouseMoved() {
  if (stage > 0 && players.length > 1) {
    let data = {
      socketId: players[1].socketId,
      angle: players[0].angle,
    };
    socket.emit('hostUpdateAngle', data);
  }
}

function reset() {
  terrainLoadingdone = false;
  clearTimeout(id);
  airBurstFire = false;
  setTimeout(function() {
    resetPlayersPos();
    airBurstFire = true;
    stage = 1;
    counter3 = 0;
    counter2 = true;
    counter4 = true;
    players[0].power = 0;
    players[0].angle = -Math.PI/2;
    players[0].dead = false;
    players[0].velx = 0;
    players[0].vely = 0;
    players[0].shoot = false;
    players[1].power = 0;
    players[1].angle = -Math.PI/2;
    players[1].dead = false;
    players[1].velx = 0;
    players[1].vely = 0;
    players[1].shoot = false;
    if (players[0].name == 1) {
      generateTerrain(scl, screenWidth, 500, 0.08, random(0, 99999));
      terrainLoadingdone = true;
      let data = {
        terrain: terrain,
        socketId: players[1].socketId,
      };
      socket.emit('sendUpdateTerrain', data);
    }
  }, 3000);
}

function moving() {
  push();
  translate(0, screenHeight);
  players[0].angle = Math.atan2(mouseY - players[0].y - screenHeight, mouseX - players[0].x);
  pop();
  vertexes = round(screenWidth/scl);
  if (keyIsDown(65)) {				//left
    if (players[0].touching == false && players[0].y < -20) {
      players[0].x += -1.5;
    } else {
      for (let x = 0; x < terrain.length; x++) {
        if (touchingLine(((screenWidth / vertexes) * x), terrain[x], ((screenWidth / vertexes) * (x + 1)) , terrain[x + 1], players[0].x - 4, players[0].y + 4, players[0].x + 4, players[0].y - 4) || touchingLine(((screenWidth / vertexes) * x) , terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], players[0].x + 4, players[0].y + 4, players[0].x - 4, players[0].y + 4) || touchingLine(((screenWidth / vertexes) * x) , terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], players[0].x - 4, players[0].y + 4, players[0].x - 4, players[0].y - 4) || touchingLine(((screenWidth / vertexes) * x) , terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], players[0].x + 4, players[0].y + 4, players[0].x + 4, players[0].y - 4)) {
          let lol = atan2(terrain[x +1] - (terrain[x]), ((screenWidth / vertexes) * (x + 1)) - ((screenWidth / vertexes) * (x)))  * 180/Math.PI;
          let angle = (modulo(lol, 360) * Math.PI / 180);
          players[0].x += -Math.cos(angle) * 1;
          players[0].y += -Math.sin(angle) * 1;
        }
      }
    }
    let data = {
      socketId: players[1].socketId,
      x: players[0].x,
      y: players[0].y,
    };
    socket.emit('hostUpdatePos', data);
  }
  if (keyIsDown(68)) {				//right
    if (players[0].touching == false && players[0].y < -20) {
      players[0].x += 1.5;
    } else {
      for (let x = 0; x < terrain.length; x++) {
        if (touchingLine(((screenWidth / vertexes) * x), terrain[x], ((screenWidth / vertexes) * (x + 1)) , terrain[x + 1], players[0].x - 4, players[0].y + 4, players[0].x + 4, players[0].y - 4) || touchingLine(((screenWidth / vertexes) * x) , terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], players[0].x + 4, players[0].y + 4, players[0].x - 4, players[0].y + 4) || touchingLine(((screenWidth / vertexes) * x) , terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], players[0].x - 4, players[0].y + 4, players[0].x - 4, players[0].y - 4) || touchingLine(((screenWidth / vertexes) * x) , terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], players[0].x + 4, players[0].y + 4, players[0].x + 4, players[0].y - 4)) {
          let lol = atan2(terrain[x +1] - (terrain[x]), ((screenWidth / vertexes) * (x + 1)) - ((screenWidth / vertexes) * (x)))  * 180/Math.PI;
          let angle = (modulo(lol, 360) * Math.PI / 180);
	        //players[0].pos.add(Math.cos(angle) * 1, Math.sin(angle) * 1);
          players[0].x += Math.cos(angle) * 1;
          players[0].y += Math.sin(angle) * 1;
        }
      }
    }
    let data = {
      socketId: players[1].socketId,
      x: players[0].x,
      y: players[0].y,
    };
    socket.emit('hostUpdatePos', data);
  }
}

function keyPressed() {
  if (keyCode == 49) {
    weapon = "cannon";
    players[0].power = 0;
    players[0].shoot = false;
  }
  if (keyCode == 50) {
    weapon = "airburst";
    players[0].power = 0;
    players[0].shoot = false;
  }
}

function rpghitreg(Ax, Ay, Bx, By, Cx, Cy) {
  return (Bx - Ax) * (Cy - Ay) - (By - Ay) * (Cx - Ax);
}

function linecircle( x1,  y1,  x2,  y2,  cx,  cy) {
  let distX = x1 - x2;
  let distY = y1 - y2;
  let len = sqrt( (distX*distX) + (distY*distY) );
  let dot = ( ((cx-x1)*(x2-x1)) + ((cy-y1)*(y2-y1)) ) / pow(len,2);
  let closestX = x1 + (dot * (x2-x1));
  let closestY = y1 + (dot * (y2-y1));
  let onSegment = linePoint(x1,y1,x2,y2, closestX,closestY);
  //if (!onSegment) return false;
  return [closestX, closestY];
}

function linePoint(x1, y1, x2, y2, px, py) {
  let d1 = dist(px,py, x1,y1);
  let d2 = dist(px,py, x2,y2);
  let lineLen = dist(x1,y1, x2,y2);
  let buffer = 0.1;
  if (d1+d2 >= lineLen-buffer && d1+d2 <= lineLen+buffer) {
    return true;
  }
  return false;
}

function resetPlayersScore() {
  for (var i = 0; i < players.length; i++) {
    players[i].score = 0;
  }
}

function sendPlayers() {
  let data = {
    socketId: players[0].socketId,
  };
  socket.emit('sendPlayers', data);
}

function renderTerrain() {
  beginShape();
  for (let x = 0; x <= vertexes; x++) {
    //noFill();
    vertex(width/vertexes * x, terrain[x]);
    fill(69, 139, 0);
    //ellipse(((width / vertexes) * x), terrain[x], 5);
    //noFill();
    //text(`${round(((width / vertexes) * x))}, ${round(terrain[x])}`, ((width / vertexes) * x), terrain[x] - 5);
  }
  vertex(width, 0);
  vertex(0, 0);
  endShape(CLOSE);
}

function renderMenuText() {
  push();
  textAlign(CENTER);
  textSize(50);
  fill(0);
  strokeWeight(1);
  text('Terrain Shooter', width/2, -height * 0.87);
  textSize(30);
  if (players.length > 0) {
    text(`You are: Player${players[0].name}`, width/2, -height * 0.8);
  }
  textSize(40);
  text('Other Players:', width/2, -height * 0.73);
  textSize(30);

  if (playerIcons.length > 0) {
    for (let i = 0; i < playerIcons.length; i++) {
      playerIcons[i].update();
      playerIcons[i].render();
    }
  }
  pop();
}

function renderGameText() {
  push();
  noStroke();
  textSize(20);
  fill(0);
  strokeWeight(1);
  text(`Your Score: ${players[0].score}`, 20, -height + 30);
  text(`Player2's score: ${players[1].score}`, screenWidth - 180, -height + 30);
  text(`Angle: ${-round(players[0].angle * (180/Math.PI))}`, 20, -height + 60);
  text(`Weapon type: ${weapon}`, 20, -height + 90);
  textSize(10);
  textAlign(CENTER);
  if (players[0].shoot && stage == 1) {
    text(round(players[0].power), players[0].x, players[0].y + 15);
  }
  pop();
}

function resetPlayersPos() {
  if (players[0].name == 1) {
    players[0].x = 50;
    players[0].y = terrain[1] - 40;
  } else {
    players[0].x = screenWidth - 50;
    players[0].y = terrain[(terrain.length - 2)] - 40;
  }
  if (players.length > 1) {
    if (players[1].name == 1) {
      players[1].x = 50;
      players[1].y = terrain[1] - 40;
    } else {
      players[1].x = screenWidth - 50;
      players[1].y = terrain[(terrain.length - 2)] - 40;
    }
  }
}

function updateParticles() {
  if (particles.length > 0) {
    for (let k = 0; k < particles.length; k++) {
      particles[k].update();
      particles[k].render();
      if (particles[k].life < 0) {
        particles.splice(k, 1);
      }
    }
  }
}

function updateAirBurstParticles() {
  if (airBurstParticles.length > 0) {
    for (let k = 0; k < airBurstParticles.length; k++) {
      airBurstParticles[k].update();
      airBurstParticles[k].render();
      if (airBurstParticles[k].life < 0) {
        airBurstParticles.splice(k, 1);
      }
    }
  }
}

function updatePlayers() {
  for (let i = 0; i < players.length; i++) {
    if (players[i].dead != true) {
      players[i].update();
      players[i].render();
    }
  }
}

function updateRpgs() {
  if (rpgs.length > 0) {
    loop1:
    for (let i = 0; i < rpgs.length; i++) {
      if (rpgs[i].pos.y > -10 || rpgs[i].dead) {
        rpgs.splice(i, 1);
        break;
      }
      rpgs[i].update();
      rpgs[i].render();
      for (let k = 0; k < rpgs.length; k++) {
        if (rpgs[i] != rpgs[k] && rpgs[i].type == "airburst") {
          if ((dist(rpgs[i].pos.x, rpgs[i].pos.y, rpgs[k].pos.x, rpgs[k].pos.y) < 25)) {
            rpgs[i].blow();
            rpgs[k].blow();
            rpgs[i].dead = true;
            rpgs[k].dead = true;
            let guid;
            let guid2;
            let x;
            let y;
            if (rpgs[i].name = players[1].name) {
              guid = rpgs[i].guid;
              guid2 = rpgs[k].guid;
              x = rpgs[k].pos.x;
              y = rpgs[k].pos.y;
            }
            if (rpgs[k].name = players[1].name) {
              guid = rpgs[k].guid;
              guid2 = rpgs[i].guid;
              x = rpgs[i].pos.x;
              y = rpgs[i].pos.y;
            }
            let data = {
              to: players[1].socketId,
              guid: guid,
              guid2: guid2,
              x: x,
              y: y,
            }
            socket.emit('sendBlowRpg', data);
            break loop1;
          }
        }
      }
      for (let x = 0; x < terrain.length; x++) {
        if(rpghitreg(((screenWidth / vertexes) * x), terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], rpgs[i].pos.x, rpgs[i].pos.y) > 0) {
          if (rpgs[i].pos.x > ((screenWidth / vertexes) * x) && rpgs[i].pos.x < ((screenWidth / vertexes) * (x + 1))) {
            let buffer = linecircle(((screenWidth / vertexes) * x), terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], rpgs[i].pos.x, rpgs[i].pos.y);
            rpgs[i].pos.x = buffer[0];
            rpgs[i].pos.y = buffer[1];
            rpgs[i].blow();
            if (rpgs[i].name == players[0].name && weapon == "cannon") {
              rpgs[i].chechHit();
            }
            rpgs.splice(i, 1);
            break;
          }
        }
      }
    }
  }
}

function checkTerrainCollision() {
  if (players.length > 1) {
    for (let x = 0; x < terrain.length; x++) {
      if (touchingLine(((screenWidth / vertexes) * x), terrain[x], ((screenWidth / vertexes) * (x + 1)) , terrain[x + 1], players[0].x - 4, players[0].y + 4, players[0].x + 4, players[0].y - 4) || touchingLine(((screenWidth / vertexes) * x) , terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], players[0].x + 4, players[0].y + 4, players[0].x - 4, players[0].y + 4) || touchingLine(((screenWidth / vertexes) * x) , terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], players[0].x - 4, players[0].y + 4, players[0].x - 4, players[0].y - 4) || touchingLine(((screenWidth / vertexes) * x) , terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], players[0].x + 4, players[0].y + 4, players[0].x + 4, players[0].y - 4)) {
        players[0].touching = true;
        players[0].velx = 0;
        players[0].vely = 0;
      }
    }
    for (let x = 0; x < terrain.length; x++) {
      if (touchingLine(((screenWidth / vertexes) * x), terrain[x], ((screenWidth / vertexes) * (x + 1)) , terrain[x + 1], players[1].x - 4, players[1].y + 4, players[1].x + 4, players[1].y - 4) || touchingLine(((screenWidth / vertexes) * x) , terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], players[1].x + 4, players[1].y + 4, players[1].x - 4, players[1].y + 4) || touchingLine(((screenWidth / vertexes) * x) , terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], players[1].x - 4, players[1].y + 4, players[1].x - 4, players[1].y - 4) || touchingLine(((screenWidth / vertexes) * x) , terrain[x], ((screenWidth / vertexes) * (x + 1)), terrain[x + 1], players[1].x + 4, players[1].y + 4, players[1].x + 4, players[1].y - 4)) {
        players[1].touching = true;
        players[1].velx = 0;
        players[1].vely = 0;
      }
    }
  }
}

function resetTouching() {
  if (players.length > 1) {
    players[0].touching = false;
    players[1].touching = false;
  }
}

function createPlayer(data) {
  console.log("created player");
  players.push(new Player(data.x, data.y, data.socketId, data.guid, data.name));
  checkForDuplicatePlayers(players);
  checkForDuplicatePlayerIcons(playerIcons);
  if (players.length > 1) {
    playerIcons.push(new PlayerIcon(width/2, -height * (0.73 - ((players.length - 1) / 15)), data.name, data.socketId));
  }
  data = {
    width: screenWidth,
    height: screenHeight,
    socketId: players[0].socketId,
  };
  socket.emit('sendScreenSize', data);
}

function updateOtherPlayersScreenSize(data) {
  for (let i = players.length - 1; i >= 0; i--) {
    if (players[i].socketId == data.socketId) {
      players[i].screenWidth = data.width;
      players[i].screenHeight = data.height;
    }
  }
}

function updateDeath(data) {
  console.log("updateDeath");
  for (var i = 0; i < players.length; i++) {
    if (players[i].socketId == data.socketId) {
      players[data.addScore].score++;
      players[i].x = data.x;
      players[i].y = data.y;
      players[i].dead = true;
      players[i].death();
      stage = 2;
    }
  }
}

function updateTerrain(data) {
  terrain = data.terrain;
  terrainLoadingdone = true;
}

function removePlayer(socketId) {
  if (socketId == players[1].socketId) {
    stage = 0;
    counter = true;
    pendingPlayer = null;
    connectedPlayer = null;
  }
  for (let i = players.length - 1; i >= 0; i--) {
    if (players[i].socketId == socketId) {
      players.splice(i, 1);
      players[0].name = players.length;
    }
  }

  for (let x = playerIcons.length - 1; x >= 0; x--) {
    if (playerIcons[x].socketId == socketId) {
      playerIcons.splice(x, 1);
    }
  }
}

function sendHost() {
  let data = {
    x: players[0].x,
    y: players[0].y,
    socketId: players[0].socketId,
    guid: players[0].guid,
    name: players[0].name,
  };
  socket.emit('sentHost', data);
}

function sendMyself(data) {
  let myData = {
    to: data.socketId,
    socketId: players[0].socketId,
    guid: players[0].guid,
    name: players[0].name,
    x: 0,
    y: 0,
  };
  socket.emit('sentMyself', myData);
}

function startGame(data) {
  console.log("startedGame");
  createCanvas(data.width, data.height);
  rpgs = [];
  screenWidth = data.width;
  screenHeight = data.height;
  terrain = data.terrain;
  for (let i = 1; i < players.length; i++) {
    if (players[i].socketId != connectedPlayer) {
      players.splice(i, 1);
    }
  }
  stage = 1;
  counter2 = true;
}

function blowRpg(data) {
  console.log('ran blow');
  console.log(data);
  for (var i = 0; i < rpgs.length; i++) {
    console.log(rpgs[i].guid);
    if (rpgs[i].guid == data.guid) {
      rpgs[i].blow();
      rpgs[i].dead = true;
    }
    if (rpgs[i].guid == data.guid2) {
      rpgs[i].pos.x = data.x;
      rpgs[i].pos.y = data.y;
      rpgs[i].blow();
      rpgs[i].dead = true;
    }
  }
}

function reloadAirburst() {
  counter5 = false
  id = setTimeout(function() {
    airBurstFire = true;
    counter5 = true;
  }, rtime);
}

/*

*/
