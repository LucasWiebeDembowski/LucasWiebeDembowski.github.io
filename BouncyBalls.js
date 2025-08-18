const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

let paused = false;
let objects = []

canvas.height = window.innerHeight * 0.8;
canvas.width = window.innerWidth * 0.95;

let gravityPxPerSecSq;
let gravitySlider = document.getElementById("gravitySlider");
let gravityLabel = document.getElementById("gravityLabel");
let fireButton = document.getElementById("btnCannon");
gravitySlider.oninput = function() {
    gravityLabel.innerHTML = "<span style = 'font-size: 20px'>Gravity: "+this.value+"%</span>";
    const magicNumber = 10;
    // slider value is a percentage of the max value.
    gravityPxPerSecSq = magicNumber * canvas.height * this.value * 0.01;
    for(obj of objects) {
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
        if(this.x -this.radius < 0) {
            this.x = this.radius;
            this.vx = -this.vx;
        }
        if (this.x + this.radius > canvas.width) {
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
        ctx.fillStyle = "#777777";
        ctx.fill();
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

var rectHeight = 0.15*canvas.height;
var rectWidth = 0.10*canvas.height;
var rectX = -0.5*rectWidth;
var rectY = canvas.height - rectHeight;
const rectRotation = Math.PI/6.0; // clockwise
function fireCannon() {
    if(!paused) {
        // x-position of rectangle is at the leftmost edge, but x-position of circle is at the center.
        objects.push(new Circle(
            rectX + 0.5*rectWidth + rectHeight*Math.sin(rectRotation), // rotated rectangle's height becomes hypotenuse
            rectY + rectHeight - rectHeight*Math.cos(rectRotation),
            10*rectHeight*Math.sin(rectRotation),
            -10*rectHeight*Math.cos(rectRotation),
            0.05*canvas.height))
    }
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(obj of objects) {
        obj.render();
    }
    
    ctx.save(); // (https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations)
    ctx.translate(0, canvas.height); // translate to bottom left
    ctx.rotate(rectRotation);
    ctx.translate(-0, -canvas.height);
    ctx.fillStyle = "#90A0B0";
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
    ctx.restore();
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

    // Handle collisions
    for(let i = 0; i < objects.length; i++) {
        for(let j = i + 1; j < objects.length; j++) {
            const x1 = objects[i].x;
            const y1 = objects[i].y;
            const x2 = objects[j].x;
            const y2 = objects[j].y;
            const r2 = (x2-x1)**2 + (y2-y1)**2;
            if(r2 <= (objects[i].radius + objects[j].radius)**2) {
                const v1xi = objects[i].vx;
                const v1yi = objects[i].vy;
                const v2xi = objects[j].vx;
                const v2yi = objects[j].vy;
                const m1 = objects[i].mass;
                const m2 = objects[j].mass;
                // https://en.wikipedia.org/wiki/Elastic_collision#Two-dimensional_collision_with_two_moving_objects
                // Assumes no friction or rotation.
                const dotProductOverR2 = ((v1xi-v2xi)*(x1-x2) + (v1yi-v2yi)*(y1-y2))/r2;
                objects[i].vx = v1xi - (2*m2/(m1+m2))*dotProductOverR2*(x1-x2);
                objects[i].vy = v1yi - (2*m2/(m1+m2))*dotProductOverR2*(y1-y2);
                objects[j].vx = v2xi - (2*m1/(m1+m2))*dotProductOverR2*(x2-x1);
                objects[j].vy = v2yi - (2*m1/(m1+m2))*dotProductOverR2*(y2-y1);

                // Move the first object so they are no longer colliding.
                // Need this because if the distance travelled in the next frame is not enough to move the
                // spheres outside of each other then the collision code will run again in the next frame
                // and reverse their directions again which leads to spheres appearing to get
                // hooked on each other at the boundaries.
                const r = Math.sqrt(r2);
                const distance = objects[i].radius + objects[j].radius - r;
                const v = Math.sqrt((objects[i].vx)**2 + (objects[i].vy)**2);
                objects[i].x += distance * objects[i].vx / v;
                objects[i].y += distance * objects[i].vy / v;
            }
        }
    }
    for(const obj of objects) {
        obj.update(elapsedSec);
    }
    
    render();
}

gravitySlider.value=50; // percent
gravitySlider.oninput();

start();
