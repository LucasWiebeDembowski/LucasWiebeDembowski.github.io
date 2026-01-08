"use strict";

const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

let paused = false;
let balls = [];
let paddles = [];
let objects = [];
let colours = ["#005500", "#AA0000", "#0000AA"];
let leftScore=0;

canvas.height = window.innerHeight * 0.8;
canvas.width = window.innerWidth * 0.95;

const GRAVITY_DEFAULT_PERCENT = 0
let gravityPxPerSecSq;
let gravitySlider = document.getElementById("gravitySlider");
let gravityLabel = document.getElementById("gravityLabel");
let fireButton = document.getElementById("btnBall");
gravitySlider.oninput = function() {
    gravityLabel.innerHTML = "<span style = 'font-size: 20px'>Gravity: "+this.value+"%</span>";
    const magicNumber = 10;
    // slider value is a percentage of the max value.
    gravityPxPerSecSq = magicNumber * canvas.height * this.value * 0.01;
    for(let obj of balls) {
        if(paused) {
            obj.ayCached = gravityPxPerSecSq;
        }else {
            obj.ay = gravityPxPerSecSq;
        }
    }
}

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
        this.ay = gravityPxPerSecSq;
        this.ayCached = gravityPxPerSecSq;
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
    update(elapsedSec) {
        this.x += elapsedSec * this.vx;
        // ball-paddle collisions
        for(const paddle of paddles) {
            if(this.vx < 0) {
                if(this.x - this.radius <= paddle.x + paddle.w
                    && this.y <= paddle.y + paddle.h + 0.75*this.radius
                    && this.y >= paddle.y - 0.75*this.radius
                ) {
                    this.x = this.radius + paddle.w;
                    this.vx = -this.vx;
                    const ballDistAlongPaddle = (this.y - (paddle.y + 0.5*paddle.h))/paddle.h;
                    this.vy = ballSpeedRoot2 * 2 * ballDistAlongPaddle
                    leftScore++
                }
            }
        }
        // prevent going off edge
        if (this.vx > 0 && this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx = -this.vx;
        }

        if(gravityPxPerSecSq == 0) {
            this.y += elapsedSec * this.vy;
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

const rectRotation = 0; // clockwise
class Rectangle {
    constructor(x,y,vx,vy,w,h) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.w = w;
        this.radius = w; // FIXME
        this.h = h;
        this.vxCached = vx;
        this.vyCached = vy;
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
        this.y += elapsedSec * this.vy;
        if(this.y < 0) {
            this.y = 0;
        }else if(this.y+this.h > canvas.height) {
            this.y = canvas.height-this.h
        }
    }
    render() {
        ctx.save(); // (https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations)
        ctx.translate(0, this.y);
        ctx.rotate(rectRotation);
        ctx.translate(-0, -this.y);
        ctx.fillStyle = "#90A0B0";
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.restore();
    }
}

function togglePaused() {
    paused = !paused;
    document.getElementById('pauseButtonName').innerHTML = paused ? "play_arrow" : "pause";
    document.getElementById('pauseButtonText').innerHTML = paused ? "<u>P</u>lay" : "<u>P</u>ause";
    fireButton.disabled = paused;
    fireButton.style.pointerEvents = paused ? "none" : "auto";
    fireButton.style.opacity = paused ? 0.5 : 1;
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

let rectHeight = 0.15*canvas.height;
let rectWidth = 0.025*canvas.width;
let rectVx = 0;
let rectVy = 0;
let rectX = 0;
let rectY = 0.5*canvas.height - 0.5*rectHeight;
let paddle = new Rectangle( rectX, rectY, rectVx, rectVy, rectWidth, rectHeight );
paddles.push(paddle);
objects = balls.concat(paddles);

document.addEventListener('keyup', (event) => {
    switch(event.key) {
        case 'p':
            togglePaused();
            break;
        case 'w':
            paddle.vy = 0;
            paddle.vyCached = 0;
            break;
        case 's':
            paddle.vy = 0;
            paddle.vyCached = 0;
            break;
    }
});

document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'w':
            if(!paused) paddle.vy = -5*rectHeight;
            break;
        case 's':
            if(!paused) paddle.vy = 5*rectHeight;
            break;
    }
});

const ballSpeedRoot2 = 5*rectHeight;
function spawnBall() {
    if(!paused) {
        // x-position of rectangle is at the leftmost edge, but x-position of circle is at the center.
        const radius = 0.03*canvas.height;
        const newBall = new Circle(
            0.5*canvas.width,
            0.5*canvas.height,
            ballSpeedRoot2,
            ballSpeedRoot2,
            radius);
        balls.push(newBall);
        objects.push(newBall);
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(const obj of objects) {
        obj.render();
    }
    ctx.font = "50px Arial";
    ctx.fillStyle = "#000000"
    ctx.fillText(leftScore.toString(),0.5*canvas.width,50);
}

const msPerSec = 1000;
let thenMs;

function start() {
    requestAnimationFrame(update);
    thenMs = Date.now();
}

function update(timestampMs) {
    requestAnimationFrame(update);
    let nowMs = Date.now();
    const frameTimeSecCap = 0.05; // arbitrary value, avoids huge frametime when user clicks off the window
    let elapsedSec = ((nowMs - thenMs)/msPerSec) % frameTimeSecCap;
    thenMs = nowMs;

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
        // balls that went past the left edge
        if(balls[i].x + balls[i].radius < 0) {
            const index = objects.indexOf(balls[i]);
            if(index > -1) {
                objects.splice(index, 1);
            }
            balls.splice(i, 1);
        }
    }

    for(const obj of objects) {
        obj.update(elapsedSec);
    }
    render();
}

gravitySlider.value=GRAVITY_DEFAULT_PERCENT;
gravitySlider.oninput();

start();
