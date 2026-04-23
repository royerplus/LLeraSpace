const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const scoreEl = document.getElementById('scoreEl');
const roundEl = document.getElementById('roundEl');
const gameOverModal = document.getElementById('gameOverModal');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

const playerImg = new Image();
playerImg.src = 'imagenesxd/Luisxd.jpg';

const enemyImg = new Image();
enemyImg.src = 'imagenesxd/llera.jpg';

const bossImg = new Image();
bossImg.src = 'imagenesxd/lleraHD.png';

const attackImg1 = new Image(); attackImg1.src = 'imagenesxd/ataques/Robot.png';
const attackImg2 = new Image(); attackImg2.src = 'imagenesxd/ataques/chatgpt.png';
const attackImg3 = new Image(); attackImg3.src = 'imagenesxd/ataques/gemini.png';
const attackImages = [attackImg1, attackImg2, attackImg3];

let animationId;
let score = 0;
let round = 1;
let isGameOver = false;
let bossSpawned = false;

// Stars background
const stars = [];
for(let i=0; i<100; i++){
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        speed: Math.random() * 0.5 + 0.1
    });
}

function drawStars() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        star.y += star.speed;
        if(star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

// Player
class Player {
    constructor() {
        this.width = 60;
        this.height = 60;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        this.color = '#ffffff';
        this.speed = 7;
        this.dx = 0;
        this.dy = 0;
        this.health = 3;
        this.invulnerableFrames = 0;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldAngle = 0;
        this.shieldCooldown = 0;
        this.teleportCooldown = 0;
        this.blueAuraActive = false;
    }

    draw() {
        if (this.invulnerableFrames > 0 && frames % 10 < 5) return;
        if (playerImg.complete) {
            ctx.drawImage(playerImg, this.x, this.y, this.width, this.height);
        } else {
            // Draw a cool triangle for now
            ctx.save();
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            
            ctx.beginPath();
            ctx.moveTo(0, -this.height/2);
            ctx.lineTo(this.width/2, this.height/2);
            ctx.lineTo(-this.width/2, this.height/2);
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
            
            // Thruster
            ctx.beginPath();
            ctx.moveTo(-10, this.height/2);
            ctx.lineTo(10, this.height/2);
            ctx.lineTo(0, this.height/2 + 10 + Math.random()*5);
            ctx.fillStyle = '#ff9900';
            ctx.fill();

            ctx.restore();
        }
    }

    update() {
        if (this.invulnerableFrames > 0) this.invulnerableFrames--;
        if (this.shieldActive) {
            this.shieldTimer--;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                this.shieldCooldown = 180; // 3 seconds cooldown
            }
        } else if (this.shieldCooldown > 0) {
            this.shieldCooldown--;
        }
        
        if (this.teleportCooldown > 0) this.teleportCooldown--;

        if (keys.a.pressed || keys.ArrowLeft.pressed) {
            this.dx = -this.speed;
        } else if (keys.d.pressed || keys.ArrowRight.pressed) {
            this.dx = this.speed;
        } else {
            this.dx = 0;
        }

        if (keys.w.pressed || keys.ArrowUp.pressed) {
            this.dy = -this.speed;
        } else if (keys.s.pressed || keys.ArrowDown.pressed) {
            this.dy = this.speed;
        } else {
            this.dy = 0;
        }

        this.x += this.dx;
        this.y += this.dy;

        // Boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > canvas.height) this.y = canvas.height - this.height;

        this.draw();
        
        if (this.shieldActive) {
            this.shieldAngle = Math.atan2(mouseY - (this.y + this.height / 2), mouseX - (this.x + this.width / 2));
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width, this.shieldAngle - Math.PI / 4, this.shieldAngle + Math.PI / 4);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 5;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ffff';
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        if (this.blueAuraActive) {
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width - 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 50, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#0000ff';
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
}

// Projectile
class Projectile {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.color = '#ffffff';
        this.velocity = 15;
        
        const angle = Math.atan2(targetY - y, targetX - x);
        this.dx = Math.cos(angle) * this.velocity;
        this.dy = Math.sin(angle) * this.velocity;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.draw();
    }
}

class EnemyProjectile {
    constructor(x, y, isBoss, dx = 0, dy = null, damage = 1, isRed = false) {
        this.x = x;
        this.y = y;
        this.radius = isBoss ? 15 : 10;
        this.dx = dx;
        this.dy = dy !== null ? dy : (isBoss ? 5 : 3);
        this.img = isBoss ? bossImg : attackImages[Math.floor(Math.random() * attackImages.length)];
        this.damage = damage;
        this.isRed = isRed;
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (this.img && this.img.complete) {
            ctx.drawImage(this.img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
            if (this.isRed) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                ctx.globalCompositeOperation = 'source-over';
            }
        } else {
            ctx.fillStyle = this.isRed ? '#ff0000' : '#ffffff';
            ctx.fill();
        }

        ctx.restore();
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.isRed ? '#ff0000' : '#ffffff';
        ctx.lineWidth = 2;
        if (this.isRed) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.draw();
    }
}

// Enemy
class Enemy {
    constructor(x, y, isBoss = false) {
        this.isBoss = isBoss;
        this.width = isBoss ? 150 : 50;
        this.height = isBoss ? 150 : 50;
        this.x = x;
        this.y = y;
        this.color = '#ffffff';
        this.velocity = isBoss ? 2 : (Math.random() * 2 + 2);
        this.dx = (Math.random() - 0.5) * 4;
        this.dy = Math.random() > 0.5 ? this.velocity : -this.velocity;
        this.maxHealth = isBoss ? (50 + round * 10) : (1 + Math.floor(round / 3)); 
        this.health = this.maxHealth;
        this.isDead = false;
        
        if (Math.random() < 0.07 && !isBoss) {
            this.attackType = 4;
        } else if (round % 5 === 0 && !isBoss) {
            this.attackType = Math.random() < 0.5 ? 2 : (Math.random() < 0.5 ? 3 : Math.floor(Math.random() * 2));
        } else {
            const rand = Math.random();
            if (rand < 0.3) this.attackType = 3;
            else if (rand < 0.6) this.attackType = 1;
            else this.attackType = 0;
        }
        
        this.timeOffset = Math.random() * 1000;
    }

    draw() {
        const img = this.isBoss ? bossImg : enemyImg;
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        const angle = Math.atan2((player.y + player.height / 2) - (this.y + this.height / 2), (player.x + player.width / 2) - (this.x + this.width / 2));
        ctx.rotate(angle - Math.PI / 2);

        if (img.complete) {
            ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
            if (!this.isBoss && this.health > 1) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.globalCompositeOperation = 'source-over';
            }
        } else {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;

            ctx.beginPath();
            ctx.moveTo(0, this.height/2);
            ctx.lineTo(this.width/2, -this.height/2);
            ctx.lineTo(-this.width/2, -this.height/2);
            ctx.closePath();
            ctx.fillStyle = (!this.isBoss && this.health > 1) ? '#ff0000' : this.color;
            ctx.fill();
        }

        if (!this.isBoss && this.attackType === 2) {
            // Sombrerito
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.ellipse(0, -this.height / 2 + 5, this.width / 2 + 5, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, -this.height / 2 + 5, 15, Math.PI, 0);
            ctx.fill();

            // Escopeta (much brighter to be visible over black background)
            ctx.fillStyle = '#cccccc'; 
            ctx.fillRect(this.width / 2 - 2, 0, 8, 35); 
            ctx.strokeStyle = '#000000';
            ctx.strokeRect(this.width / 2 - 2, 0, 8, 35);
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.width / 2 - 2, -15, 8, 15);
            ctx.strokeRect(this.width / 2 - 2, -15, 8, 15);
        }
        
        if (this.attackType === 4 && frames % 20 < 10) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();

        if (this.isBoss) {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            const healthRatio = this.health / this.maxHealth;
            const barWidth = 140;
            const barHeight = 12;
            const barX = -barWidth / 2;
            const barY = -this.height / 2 - 40;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ffcc';
            ctx.fillStyle = '#00ffcc';
            ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
            ctx.shadowBlur = 0;

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barWidth, barHeight);

            if (attackImg2.complete) {
                const indicatorX = barX + (barWidth * healthRatio);
                ctx.drawImage(attackImg2, indicatorX - 15, barY - 12, 30, 30);
            }
            ctx.restore();
        }
    }

    update() {
        if (this.attackType === 4 && !this.isDead) {
            const px = player.x + player.width / 2;
            const py = player.y + player.height / 2;
            const ex = this.x + this.width / 2;
            const ey = this.y + this.height / 2;
            const angle = Math.atan2(py - ey, px - ex);
            const dist = Math.hypot(px - ex, py - ey);

            if (dist > 150) {
                this.x += Math.cos(angle) * this.velocity * 1.5;
                this.y += Math.sin(angle) * this.velocity * 1.5;
            } else {
                this.isDead = true;
                // Explode
                for(let i=0; i<30; i++) {
                    particles.push(new Particle(ex, ey, '#ff0000'));
                }
                for(let i=0; i<8; i++) {
                    const exAngle = (Math.PI * 2 / 8) * i;
                    enemyProjectiles.push(new EnemyProjectile(ex, ey, false, Math.cos(exAngle)*4, Math.sin(exAngle)*4, 1, true));
                }
                setTimeout(() => {
                    const eIndex = enemies.indexOf(this);
                    if (eIndex > -1) enemies.splice(eIndex, 1);
                }, 0);
            }
            this.draw();
            return;
        }

        this.x += this.dx;
        this.y += this.dy;
        
        if (this.x < 0 || this.x + this.width > canvas.width) {
            this.dx = -this.dx;
            this.x = this.x < 0 ? 0 : canvas.width - this.width;
        }

        if (this.y < 0 || this.y + this.height > canvas.height * 0.6) {
            this.dy = -this.dy;
            this.y = this.y < 0 ? 0 : canvas.height * 0.6 - this.height;
        }

        this.draw();

        if (Math.random() < (this.isBoss ? 0.05 : 0.005)) {
            const px = player.x + player.width / 2;
            const py = player.y + player.height / 2;
            const ex = this.x + this.width / 2;
            const ey = this.y + this.height / 2;
            const angle = Math.atan2(py - ey, px - ex);
            const speed = this.isBoss ? 5 : 4;

            if (this.attackType === 2 || this.isBoss) {
                const damage = (!this.isBoss && this.attackType === 2) ? 2 : 1;
                const isRed = (!this.isBoss && this.attackType === 2);
                enemyProjectiles.push(new EnemyProjectile(ex, ey, this.isBoss, Math.cos(angle - 0.2) * speed, Math.sin(angle - 0.2) * speed, damage, isRed));
                enemyProjectiles.push(new EnemyProjectile(ex, ey, this.isBoss, Math.cos(angle) * speed, Math.sin(angle) * speed, damage, isRed));
                enemyProjectiles.push(new EnemyProjectile(ex, ey, this.isBoss, Math.cos(angle + 0.2) * speed, Math.sin(angle + 0.2) * speed, damage, isRed));
            } else if (this.attackType === 3) {
                // Doble bolita
                enemyProjectiles.push(new EnemyProjectile(ex, ey, this.isBoss, Math.cos(angle - 0.1) * speed, Math.sin(angle - 0.1) * speed));
                enemyProjectiles.push(new EnemyProjectile(ex, ey, this.isBoss, Math.cos(angle + 0.1) * speed, Math.sin(angle + 0.1) * speed));
                // Y dos veces (segunda iteración)
                setTimeout(() => {
                    if (!this.isDead) {
                        const nex = this.x + this.width / 2;
                        const ney = this.y + this.height / 2;
                        const currPx = player.x + player.width / 2;
                        const currPy = player.y + player.height / 2;
                        const nAngle = Math.atan2(currPy - ney, currPx - nex);
                        enemyProjectiles.push(new EnemyProjectile(nex, ney, this.isBoss, Math.cos(nAngle - 0.1) * speed, Math.sin(nAngle - 0.1) * speed));
                        enemyProjectiles.push(new EnemyProjectile(nex, ney, this.isBoss, Math.cos(nAngle + 0.1) * speed, Math.sin(nAngle + 0.1) * speed));
                    }
                }, 300);
            } else if (this.attackType === 1) {
                enemyProjectiles.push(new EnemyProjectile(ex, ey, this.isBoss, Math.cos(angle) * (speed * 1.5), Math.sin(angle) * (speed * 1.5)));
            } else {
                enemyProjectiles.push(new EnemyProjectile(ex, ey, this.isBoss, Math.cos(angle) * speed, Math.sin(angle) * speed));
            }
        }
    }
}

// Particle for explosions
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 3;
        this.color = color;
        this.velocity = {
            x: (Math.random() - 0.5) * (Math.random() * 6),
            y: (Math.random() - 0.5) * (Math.random() * 6)
        };
        this.alpha = 1;
        this.friction = 0.98;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.02;
        this.draw();
    }
}

class HealthDrop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.velocity = 2;
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (playerImg.complete) {
            ctx.drawImage(playerImg, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
            ctx.fillStyle = '#00ff00';
            ctx.fill();
        }

        ctx.restore();
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ff00';
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    update() {
        this.y += this.velocity;
        this.draw();
    }
}

let player = new Player();
let projectiles = [];
let enemyProjectiles = [];
let healthDrops = [];
let enemies = [];
let particles = [];
let frames = 0;

let mouseX = canvas.width / 2;
let mouseY = 0;
let isShooting = false;
let lastShotTime = 0;

function init() {
    player = new Player();
    projectiles = [];
    enemyProjectiles = [];
    healthDrops = [];
    enemies = [];
    particles = [];
    score = 0;
    scoreEl.innerHTML = score;
    round = 1;
    isGameOver = false;
    bossSpawned = false;
    frames = 0;
    gameOverModal.style.display = 'none';
    startRound();
    animate();
}

function startRound() {
    roundEl.innerHTML = round;
    
    const numEnemies = 3 + round * 2;
    for(let i=0; i<numEnemies; i++) {
        const x = Math.random() * (canvas.width - 50);
        const y = Math.random() * (canvas.height * 0.3);
        enemies.push(new Enemy(x, y, false));
    }

    if (round % 5 === 0) {
        const x = canvas.width / 2 - 75;
        const y = 50;
        enemies.push(new Enemy(x, y, true));
    }
}

function animate() {
    if (isGameOver) return;
    animationId = requestAnimationFrame(animate);
    
    // Create motion blur effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawStars();
    
    player.update();

    // Particles
    particles.forEach((particle, index) => {
        if (particle.alpha <= 0) {
            particles.splice(index, 1);
        } else {
            particle.update();
        }
    });

    // Projectiles
    projectiles.forEach((projectile, index) => {
        projectile.update();

        // Remove from edges of screen
        if (projectile.y + projectile.radius < 0 || projectile.y - projectile.radius > canvas.height || projectile.x + projectile.radius < 0 || projectile.x - projectile.radius > canvas.width) {
            setTimeout(() => {
                projectiles.splice(index, 1);
            }, 0);
        }
    });

    // Enemy Projectiles
    enemyProjectiles.forEach((ep, index) => {
        ep.update();

        const distX = ep.x - (player.x + player.width / 2);
        const distY = ep.y - (player.y + player.height / 2);
        const distance = Math.hypot(distX, distY);
        
        let blocked = false;
        if (player.shieldActive && distance < player.width + ep.radius + 10) {
            const angleToProj = Math.atan2(distY, distX);
            let angleDiff = Math.abs(angleToProj - player.shieldAngle);
            while(angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            angleDiff = Math.abs(angleDiff);
            
            if (angleDiff <= Math.PI / 4) {
                blocked = true;
                setTimeout(() => { enemyProjectiles.splice(index, 1); }, 0);
                for(let i=0; i<10; i++) {
                    particles.push(new Particle(ep.x, ep.y, '#00ffff'));
                }
            }
        }

        if (!blocked && distance < player.width / 2 + ep.radius - 10) {
            setTimeout(() => { enemyProjectiles.splice(index, 1); }, 0);
            if (player.invulnerableFrames <= 0) {
                if (player.blueAuraActive) {
                    player.blueAuraActive = false;
                    player.invulnerableFrames = 60;
                    for(let i=0; i<15; i++) {
                        particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#0000ff'));
                    }
                } else {
                    player.health -= ep.damage || 1;
                    player.invulnerableFrames = 60;
                    
                    for(let i=0; i<15; i++) {
                        particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#ff0000'));
                    }

                    if (player.health <= 0) {
                        endGame();
                    }
                }
            }
        } else if (ep.y - ep.radius > canvas.height || ep.y + ep.radius < 0 || ep.x - ep.radius > canvas.width || ep.x + ep.radius < 0) {
            setTimeout(() => {
                enemyProjectiles.splice(index, 1);
            }, 0);
        }
    });

    // Enemies
    enemies.forEach((enemy, index) => {
        enemy.update();

        // Collision with player
        // Simple bounding box collision
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            if (player.invulnerableFrames <= 0) {
                if (player.blueAuraActive) {
                    player.blueAuraActive = false;
                    player.invulnerableFrames = 60;
                    for(let i=0; i<15; i++) {
                        particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#0000ff'));
                    }
                } else {
                    player.health -= 1;
                    player.invulnerableFrames = 60;
                    
                    for(let i=0; i<15; i++) {
                        particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#ff0000'));
                    }

                    if (player.health <= 0) {
                        endGame();
                    }
                }
            }
        }

        // No longer remove off screen since they bounce
    });

    // Projectile hits Enemy
    projectiles.forEach((projectile, pIndex) => {
        enemies.forEach((enemy, eIndex) => {
            // Simple distance based collision or AABB
            const distX = projectile.x - (enemy.x + enemy.width / 2);
            const distY = projectile.y - (enemy.y + enemy.height / 2);
            const distance = Math.hypot(distX, distY);

            if (distance < enemy.width / 2 + projectile.radius) {
                enemy.health -= 1;
                
                setTimeout(() => {
                    projectiles.splice(pIndex, 1);
                }, 0);

                if (enemy.health <= 0 && !enemy.isDead) {
                    enemy.isDead = true;
                    // Create explosions
                    for(let i=0; i< (enemy.isBoss ? 50 : 15); i++) {
                        particles.push(new Particle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color));
                    }
                    if (Math.random() < 0.2 && !enemy.isBoss) {
                        healthDrops.push(new HealthDrop(enemy.x + enemy.width/2, enemy.y + enemy.height/2));
                    }

                    setTimeout(() => {
                        enemies.splice(eIndex, 1);
                        score += enemy.isBoss ? 100 : 10;
                        scoreEl.innerHTML = score;
                    }, 0);
                }
            }
        });
    });

    healthDrops.forEach((drop, index) => {
        drop.update();
        const distX = drop.x - (player.x + player.width / 2);
        const distY = drop.y - (player.y + player.height / 2);
        const distance = Math.hypot(distX, distY);

        if (distance < player.width / 2 + drop.radius) {
            if (player.health === 3) {
                player.blueAuraActive = true;
            } else {
                player.health = Math.min(3, player.health + 1);
            }
            setTimeout(() => { healthDrops.splice(index, 1); }, 0);
            
            for(let i=0; i<15; i++) {
                particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#00ff00'));
            }
        } else if (drop.y > canvas.height) {
            setTimeout(() => { healthDrops.splice(index, 1); }, 0);
        }
    });

    if (enemies.length === 0 && !isGameOver) {
        if (round % 5 === 0) {
            endGame(true);
        } else {
            round++;
            startRound();
        }
    }
    frames++;
}

function endGame(isWin = false) {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    
    if (!isWin) {
        // Explosion on player
        for(let i=0; i<30; i++) {
            particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#ffffff'));
        }
    }
    
    // Draw one last frame to show particles
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!isWin) {
        particles.forEach(p => p.draw());
    } else {
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('¡JUEGO COMPLETADO!', canvas.width / 2, canvas.height / 2 - 60);
    }

    finalScoreEl.innerHTML = score;
    gameOverModal.style.display = 'block';
}

// Controls
const keys = {
    w: { pressed: false },
    a: { pressed: false },
    s: { pressed: false },
    d: { pressed: false },
    ArrowUp: { pressed: false },
    ArrowLeft: { pressed: false },
    ArrowDown: { pressed: false },
    ArrowRight: { pressed: false }
};

window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if(keys[k] !== undefined) {
        keys[k].pressed = true;
    }
    
    if (e.key === ' ' && !player.shieldActive && player.shieldCooldown <= 0 && !isGameOver) {
        player.shieldActive = true;
        player.shieldTimer = 4.5 * 60; // 4.5 seconds
    }

    if (e.key === 'Shift' && player.teleportCooldown <= 0 && !isGameOver) {
        let dashX = player.dx !== 0 ? Math.sign(player.dx) : 0;
        let dashY = player.dy !== 0 ? Math.sign(player.dy) : 0;
        
        if (dashX === 0 && dashY === 0) {
            const angle = Math.atan2(mouseY - (player.y + player.height/2), mouseX - (player.x + player.width/2));
            dashX = Math.cos(angle);
            dashY = Math.sin(angle);
        }

        const distance = 150;
        player.x += dashX * distance;
        player.y += dashY * distance;
        player.teleportCooldown = 30;

        for(let i=0; i<20; i++) {
            particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#ffffff'));
        }
    }
});

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

window.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !isGameOver) {
        projectiles.push(new Projectile(player.x + player.width / 2, player.y + player.height / 2, e.clientX, e.clientY));
    }
});

window.addEventListener('keyup', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if(keys[k] !== undefined) {
        keys[k].pressed = false;
    }
});

window.addEventListener('blur', () => {
    for (let key in keys) {
        keys[key].pressed = false;
    }
});

// Resize handler
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

restartBtn.addEventListener('click', () => {
    init();
});

// Start game
init();
