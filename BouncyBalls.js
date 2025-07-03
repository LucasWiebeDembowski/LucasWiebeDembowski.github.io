const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

let gravity = 2000; // pixels per second per second
let gravitySlider = document.getElementById("gravitySlider");
let gravityLabel = document.getElementById("gravityLabel");
gravityLabel.innerHTML = "Gravity [px/s&sup2;]: "+gravitySlider.value;
gravitySlider.oninput = function() {
    gravityLabel.innerHTML = "Gravity [px/s&sup2;]: "+this.value;
    gravity = this.value;
    for(obj of objects) {
        if(paused) {
            obj.ayCached = gravity;
        }else {
            obj.ay = gravity;
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
        this.vxCached = vx;
        this.vyCached = vy;
        this.ay = gravity;
        this.ayCached = gravity;
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
        // prevent going off edge
        if(this.x -this. radius < 0) {
            this.x = this.radius;
            this.vx = -this.vx;
        }
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx = -this.vx;
        }

        this.vy += this.ay * elapsedSec;
        // Bounce off the ground.
        if(this.vy > 0 && (this.y + elapsedSec * this.vy + this.radius > canvas.height)) {
            // vy is only accelerating until it bounces, after which it is decelerating.
            const distanceAboveGround = canvas.height - (this.y + this.radius);
            let vground = Math.sqrt(this.vy*this.vy + 2*this.ay*distanceAboveGround);
            // TODO allow 0 gravity without dividing by 0
            let trise = elapsedSec - (vground - this.vy) / this.ay;
            this.vy = -vground + this.ay*trise;
            this.y = canvas.height - this.radius - (vground*trise - 0.5*this.ay*trise*trise);
        }else {
            // Falling normally
            this.y += elapsedSec * this.vy;
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
    }
}

let paused = false;
let objects = []
objects.push(new Circle(0.5*canvas.width, 0.5*canvas.height, 100, 0, 40))
objects.push(new Circle(0.25*canvas.width, 0.25*canvas.height, 100, 0, 60))
function togglePaused() {
    paused = !paused;
    document.getElementById('pauseButtonName').innerHTML = paused ? "play_arrow" : "pause";
    document.getElementById('pauseButtonText').innerHTML = paused ? "<u>P</u>lay" : "<u>P</u>ause";
    if(paused) {
        for(obj of objects) {
            obj.pause();
        }
    }else {
        for(obj of objects) {
            obj.resume();
        }
    }
}

document.addEventListener('keyup', (event) => {
    switch(event.key) {
        case 'p':
            togglePaused();
            break;
        default: break;
    }
});

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(obj of objects) {
        obj.render();
    }
}

const msPerSec = 1000;

function start() {
    requestAnimationFrame(update);
    thenMs = Date.now();
}

function update(timestampMs) {
    requestAnimationFrame(update);
    nowMs = Date.now();
    const frameTimeSecCap = 0.05; // arbitrary value, avoids huge frametime when user clicks off the window
    elapsedSec = ((nowMs - thenMs)/msPerSec) % frameTimeSecCap;
    thenMs = nowMs;

    for(const obj of objects) {
        obj.update(elapsedSec);
    }
    
    render();
}

gravitySlider.value=2000;
gravitySlider.oninput();

start();
