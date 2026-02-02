"use strict";

const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

canvas.height = window.innerHeight * 0.8;
canvas.width = window.innerWidth * 0.95;

const ballSpeed = 0.5*canvas.height;
const rectHeight = 0.15*canvas.height;
const paddleSpeed = 2*ballSpeed;

const STATE_START = 0;
const STATE_PLAY = 1;
let state = STATE_START;

let paused = true;
let balls = [];
let paddles = [];
let leftPaddle;
let rightPaddle;
let objects = [];
let leftScore=0;
let rightScore=0;
let spawnRequestTimestamp = Date.now();
let buttons = [];
const mouse = {
  x: 0,
  y: 0
};

let cpuLeftPaddle = true;
let darkMode = true;
let colours = darkMode
    ? ["#009900", "#FF0000", "#0044FF"]
    : ["#005500", "#AA0000", "#0000AA"];

document.getElementById("instructions").innerHTML = "Select one or two players to start the game.";

class Circle {
    constructor(x,y,vx,vy,radius) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.mass = Math.PI*radius**2
        this.vxCached = vx;
        this.vyCached = vy;
        this.ay = 0;
        this.ayCached = 0;
        this.colourStyle = colours[Math.floor(Math.random() * 3)];
    }
    pause() {
        this.vxCached = this.vx;
        this.vyCached = this.vy;
        this.ayCached = this.ay;
        this.vx = 0;
        this.vy = 0;
        this.ay = 0;
    }
    resume() {
        this.vx = this.vxCached;
        this.vy = this.vyCached;
        this.ay = this.ayCached;
    }
    // TODO center the text on the buttons.
    update(elapsedSec) {
        // ball-paddle collisions
        let collided = false;
        let heightCorrection = 0;
        let tAfter = elapsedSec;
        const cornerBounceRadius = 0.75*this.radius;
        for(const paddle of paddles) {
            if(this.x + this.radius > paddle.x
                && this.x - this.radius < paddle.x + paddle.w
            ) {
                if(this.y <= paddle.y + paddle.h
                    && this.y >= paddle.y - this.radius
                ) { // bounce off the top
                    if(paddle.vy < 0 && paddle.y + elapsedSec * paddle.vy > paddle.w) { // margin of paddle.w, see Rectangle
                        this.vy = paddle.vy - Math.abs(this.vy);
                    }else {
                        this.vy = -Math.abs(this.vy);
                    }
                    this.y = paddle.y - this.radius; // move ball outside so this code isn't run two frames in a row.
                } else if(this.y <= paddle.y + paddle.h + this.radius
                    && this.y >= paddle.y
                ) { // bounce off the bottom
                    if(paddle.vy > 0 && paddle.y + paddle.h + elapsedSec * paddle.vy < canvas.height - paddle.w) {
                        this.vy = paddle.vy + Math.abs(this.vy);
                    }else {
                        this.vy = Math.abs(this.vy);
                    }
                    this.y = paddle.y + paddle.h + this.radius;
                }
            } else if(this.x + this.radius + elapsedSec * this.vx > paddle.x
                && this.x - this.radius + elapsedSec * this.vx < paddle.x + paddle.w
                && this.y <= paddle.y + paddle.h + cornerBounceRadius
                && this.y >= paddle.y - cornerBounceRadius
            ) { // bounce off the left or the right side
                // Determine collision parameters
                const distanceFrompaddle = (this.vx < 0) ?
                    (this.x - this.radius) - (paddle.x + paddle.w) :
                    paddle.x - (this.x + this.radius);
                const tBefore = Math.abs(distanceFrompaddle / this.vx);
                tAfter = elapsedSec - tBefore;
                heightCorrection = tBefore * this.vy;
                const fractionAlongPaddle = (this.y - (paddle.y + 0.5*paddle.h))/paddle.h; // -0.5 to 0.5
                const bounceAngle = fractionAlongPaddle * 0.5 * Math.PI;
                // Perform the update.
                // Speed is slower during the serve.
                this.vx = -Math.sign(this.vx) * ballSpeed * 2 * Math.cos(bounceAngle);
                this.vy = ballSpeed * 2 * Math.sin(bounceAngle);
                this.x = (this.vx > 0) ?
                    paddle.x + paddle.w + this.radius + tAfter * this.vx :
                    paddle.x - this.radius + tAfter * this.vx; // note this.vx was updated before this line.
                collided = true;
            }
        }
        
        if(!collided) {
            this.x += elapsedSec * this.vx;
        }

        if(this.ay == 0) {
            this.y += (heightCorrection + tAfter * this.vy);
            if(this.y + this.radius > canvas.height) {
                // Bounce off the ground.
                this.y = canvas.height - this.radius;
                this.vy = -this.vy;
            }
        }else {
            this.vy += this.ay * elapsedSec;
            // Bounce off the ground.
            if(this.vy > 0 && (this.y + elapsedSec * this.vy + this.radius > canvas.height)) {
                // vy is only accelerating until it bounces, after which it is decelerating.
                const distanceAboveGround = canvas.height - (this.y + this.radius);
                let vground = Math.sqrt(this.vy*this.vy + 2*this.ay*distanceAboveGround);
                let trise = elapsedSec - (vground - this.vy) / this.ay;
                this.vy = -vground + this.ay*trise;
                this.y = canvas.height - this.radius - (vground*trise - 0.5*this.ay*trise*trise);
            }else {
                // Falling normally
                this.y += elapsedSec * this.vy;
            }
        }

        // prevent going past the top
        if(this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy = -this.vy;
        }
    }
    render() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI);
        ctx.stroke();
        ctx.fillStyle = this.colourStyle;
        ctx.fill();
    }
}

class Rectangle {
    constructor(x,y,vx,vy,w,h,cpuControlled) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.w = w;
        this.h = h;
        this.vxCached = vx;
        this.vyCached = vy;
        this.rotationRadCW = 0;
        this.cpuControlled = cpuControlled;
        this.lastVelocityChangeMs = Date.now();
    }
    pause() {
        this.vxCached = this.vx;
        this.vyCached = this.vy;
        this.vx = 0;
        this.vy = 0;
    }
    resume() {
        this.vx = this.vxCached;
        this.vy = this.vyCached;
    }
    update(elapsedSec) {
        if(!paused && this.cpuControlled){
            if(balls.length > 0) {
                let newVy;
                if(balls[0].y > this.y + this.h) {
                    newVy = paddleSpeed;
                }else if(balls[0].y < this.y){
                    newVy = -paddleSpeed;
                }else {
                    newVy = 0;
                }
                const REACTION_TIME_MS = 150;
                if(newVy != this.vy && Date.now() - this.lastVelocityChangeMs > REACTION_TIME_MS) {
                    this.vy = newVy;
                    this.lastVelocityChangeMs = Date.now();
                }
            }else {
                this.vy = 0;
            }
        }
        this.y += elapsedSec * this.vy;
        if(this.y < this.w) {
            this.y = this.w;
        }else if(this.y + this.h > canvas.height - this.w) {
            this.y = canvas.height - this.h - this.w
        }
    }
    render() {
        ctx.save(); // (https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations)
        ctx.translate(0, this.y);
        ctx.rotate(this.rotationRadCW);
        ctx.translate(-0, -this.y);
        ctx.fillStyle = "#90A0B0";
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.restore();
    }
}

function togglePaused() {
    paused = !paused;
    // document.getElementById('pauseButtonName').innerHTML = paused ? "play_arrow" : "pause";
    // document.getElementById('pauseButtonText').innerHTML = paused ? "<u>P</u>lay" : "<u>P</u>ause";
    if(paused) {
        for(const obj of objects) {
            obj.pause();
        }
    }else {
        for(const obj of objects) {
            obj.resume();
        }
    }
}

document.addEventListener('keyup', (event) => {
    switch(event.key) {
        case 'p':
            togglePaused();
            break;
        case 'w':
        case 's':
            if(cpuLeftPaddle) break;
            leftPaddle.vy = 0;
            leftPaddle.vyCached = 0;
            break;
        case 'i':
        case 'k':
        case 'ArrowUp':
        case 'ArrowDown':
            rightPaddle.vy = 0;
            rightPaddle.vyCached = 0;
            break;
    }
});

document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'w':
            if(cpuLeftPaddle) break;
            if(!paused) leftPaddle.vy = -paddleSpeed;
            else leftPaddle.vyCached = -paddleSpeed;
            break;
        case 's':
            if(cpuLeftPaddle) break;
            if(!paused) leftPaddle.vy = paddleSpeed;
            else leftPaddle.vyCached = paddleSpeed;
            break;
        case 'i':
        case 'ArrowUp':
            if(!paused) rightPaddle.vy = -paddleSpeed;
            else rightPaddle.vyCached = -paddleSpeed;
            break;
        case 'k':
        case 'ArrowDown':
            if(!paused) rightPaddle.vy = paddleSpeed;
            else rightPaddle.vyCached = paddleSpeed;
            break;
    }
});

class Button {
    constructor(x,y,w,h,text,callback){
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.text = text;
        this.callback = callback;
        this.fillStyle = "#90A0B0";
    }
    handleMouseInput(x, y) {
        if(x > this.x && x < this.x + this.w
            && y > this.y && y < this.y + this.h)
        {
            this.callback();
        }
    }
    handleMouseOver(x, y) {
        if(x > this.x && x < this.x + this.w
            && y > this.y && y < this.y + this.h)
        {
            this.fillStyle = "#90BBB0";
        }else {
            this.fillStyle = "#90A0B0";
        }
    }
    render() {
        ctx.fillStyle = this.fillStyle;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.w, this.h, 10);
        ctx.fill();
        ctx.font = (0.5*this.h).toString() + "px Arial";
        ctx.fillStyle = "#FFFFFF";
        // Text's x, y coordinate is the bottom left corner.
        ctx.fillText(this.text, this.x + 0.15*this.h, this.y + 0.70*this.h);
    }
}
const buttonWidth = 0.4*canvas.width;
const buttonHeight = 0.1*canvas.height;
let btnOnePlayer = new Button(
    0.5*canvas.width - 0.5*buttonWidth, 0.5*canvas.height - 2*buttonHeight,
    buttonWidth, buttonHeight, "One Player", function() {
        startGame(true);
    });
let btnTwoPlayers = new Button(
    0.5*canvas.width - 0.5*buttonWidth, 0.5*canvas.height - 0.75*buttonHeight,
    buttonWidth, buttonHeight, "Two Players", function() {
        startGame(false);
    });
buttons = [btnOnePlayer, btnTwoPlayers];

canvas.addEventListener('mousedown', function(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    for(const button of buttons) {
        button.handleMouseInput(x, y);
    }
});

canvas.addEventListener("mousemove", function(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
});

function startGame(isSinglePlayer) {
    cpuLeftPaddle = isSinglePlayer;
    const rectWidth = 0.025*canvas.width;
    let rectVx = 0;
    let rectVy = 0;
    let rectX = 0.025*canvas.width;
    let rectY = 0.5*canvas.height - 0.5*rectHeight;
    leftPaddle = new Rectangle( 3*rectX, rectY,
        rectVx, rectVy, rectWidth, rectHeight, cpuLeftPaddle );
    paddles.push(leftPaddle);
    rightPaddle = new Rectangle( canvas.width - rectWidth - 3*rectX, rectY,
        rectVx, rectVy, rectWidth, rectHeight, false );
    paddles.push(rightPaddle);
    objects = balls.concat(paddles);
    state = STATE_PLAY;
    togglePaused();
    spawnRequestTimestamp = Date.now();
    document.getElementById("instructions").innerHTML = cpuLeftPaddle
        ? "Press <b>p</b> to play/pause, <b>up/down</b> arrows for right paddle, left paddle computer-controlled."+
            " Refresh the page to restart."
        : "Press <b>p</b> to play/pause, <b>up/down</b> arrows for right paddle, <b>w/s</b> for left paddle."+
            " Refresh the page to restart."
    buttons = [];
}

function spawnBall() {
    if(!paused) {
        // x-position of rectangle is at the leftmost edge, but x-position of circle is at the center.
        const radius = 0.03*canvas.height;
        const angle = Math.random()*0.5*Math.PI - 0.25*Math.PI;
        const newBall = new Circle(
            0.5*canvas.width,
            Math.random()*(canvas.height - 2*radius) + radius,
            ballSpeed*Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1),
            ballSpeed*Math.sin(angle),
            radius);
        balls.push(newBall);
        objects.push(newBall);
		spawnRequestTimestamp = -1;
    }
}

function render() {
    ctx.fillStyle = darkMode ? "#000000" : "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if(state == STATE_START) {
        for(const button of buttons) {
            button.render();
        }
    }else {
        for(const obj of objects) {
            obj.render();
        }
        ctx.font = "50px Arial";
        ctx.fillStyle = darkMode ? "#ffffff" : "#000000";
        ctx.fillText(leftScore.toString(),0.25*canvas.width,50);
        ctx.fillText(rightScore.toString(),0.75*canvas.width,50);
        if(paused) {
            ctx.font = "36px Arial";
            ctx.fillStyle = darkMode ? "#ffffff" : "#000000";
            ctx.fillText("Paused, press p to continue.", 0.1*canvas.height, 0.9*canvas.height);
        }
    }
}

const msPerSec = 1000;
let thenMs;

function start() {
    requestAnimationFrame(update);
    thenMs = Date.now();
}

function deleteBall(ballIdx) {
	const index = objects.indexOf(balls[ballIdx]);
	if(index > -1) {
		objects.splice(index, 1);
	}
	balls.splice(ballIdx, 1);
	spawnRequestTimestamp = Date.now();
}

function update() {
    requestAnimationFrame(update);
    const nowMs = Date.now();
    const frameTimeSecCap = 0.05; // arbitrary value, avoids huge frametime when user clicks off the window
    const elapsedSec = ((nowMs - thenMs)/msPerSec) % frameTimeSecCap;
    thenMs = nowMs;
	
	if(spawnRequestTimestamp > 0 && nowMs - spawnRequestTimestamp >= 1000) {
		spawnBall();
	}

    for(let i = 0; i < balls.length; i++) {
        // collisions between balls
        for(let j = i + 1; j < balls.length; j++) {
            const x1 = balls[i].x;
            const y1 = balls[i].y;
            const x2 = balls[j].x;
            const y2 = balls[j].y;
            const r2 = (x2-x1)**2 + (y2-y1)**2;
            if(r2 <= (balls[i].radius + balls[j].radius)**2) {
                const v1xi = balls[i].vx;
                const v1yi = balls[i].vy;
                const v2xi = balls[j].vx;
                const v2yi = balls[j].vy;
                const m1 = balls[i].mass;
                const m2 = balls[j].mass;
                // https://en.wikipedia.org/wiki/Elastic_collision#Two-dimensional_collision_with_two_moving_objects
                // Assumes no friction or rotation.
                const dotProductOverR2 = ((v1xi-v2xi)*(x1-x2) + (v1yi-v2yi)*(y1-y2))/r2;
                balls[i].vx = v1xi - (2*m2/(m1+m2))*dotProductOverR2*(x1-x2);
                balls[i].vy = v1yi - (2*m2/(m1+m2))*dotProductOverR2*(y1-y2);
                balls[j].vx = v2xi - (2*m1/(m1+m2))*dotProductOverR2*(x2-x1);
                balls[j].vy = v2yi - (2*m1/(m1+m2))*dotProductOverR2*(y2-y1);

                // Move the first object so they are no longer colliding.
                // Need this because if the distance travelled in the next frame is not enough to move the
                // spheres outside of each other then the collision code will run again in the next frame
                // and reverse their directions again which leads to spheres appearing to get
                // hooked on each other at the boundaries.
                const r = Math.sqrt(r2);
                const distance = balls[i].radius + balls[j].radius - r;
                const v = Math.sqrt((balls[i].vx)**2 + (balls[i].vy)**2);
                balls[i].x += distance * balls[i].vx / v;
                balls[i].y += distance * balls[i].vy / v;
            }
        }
        if(balls[i].x < 0) {
            rightScore++;
            deleteBall(i);
        }else if(balls[i].x > canvas.width) {
            leftScore++;
            deleteBall(i);
        }
    }

    for(const obj of objects) {
        obj.update(elapsedSec);
    }

    for(const button of buttons) {
        button.handleMouseOver(mouse.x, mouse.y);
    }

    render();
}

start();
