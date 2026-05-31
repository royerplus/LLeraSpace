const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// UI Elements
const scoreEl = document.getElementById('scoreEl');
const roundEl = document.getElementById('roundEl');
const gameOverModal = document.getElementById('gameOverModal');
const gameOverTitle = document.getElementById('gameOverTitle');
const finalScoreEl = document.getElementById('finalScore');
const finalRoundEl = document.getElementById('finalRound');
const restartBtn = document.getElementById('restartBtn');
const healthFill = document.getElementById('healthFill');
const shieldCooldownBar = document.getElementById('shieldCooldown');
const teleportCooldownBar = document.getElementById('teleportCooldown');

// Preload images
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

// Game state
let animationId;
let score = 0;
let round = 1;
let isGameOver = false;
let isPaused = false;
let bossSpawned = false;
let frames = 0;
const MAX_PARTICLES = 300;
const MAX_ENEMY_PROJECTILES = 200; // OPTIMIZATION: Limitar proyectiles
let scorePopups = [];
let enemyKills = 0;
let bossKills = 0;

// Object pools para mejor rendimiento
const projectilePool = [];
const enemyProjectilePool = [];
const particlePool = [];

// Enhanced Stars background
const stars = [];
const nebulae = [];

function initStars() {
    stars.length = 0;
    for(let i=0; i<150; i++){
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2,
            speed: Math.random() * 0.5 + 0.1,
            opacity: Math.random() * 0.5 + 0.3,
            twinkleSpeed: Math.random() * 0.02 + 0.01
        });
    }
    
    nebulae.length = 0;
    for(let i=0; i<2; i++){
        nebulae.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 200 + 150,
            opacity: Math.random() * 0.05 + 0.02,
            color: ['#ff00ff', '#00ffff'][i],
        });
    }
}

function drawStars() {
    nebulae.forEach(nebula => {
        const gradient = ctx.createRadialGradient(nebula.x, nebula.y, 50, nebula.x, nebula.y, nebula.radius);
        const color = nebula.color === '#ff00ff' ? [255, 0, 255] : [0, 255, 255];
        gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${nebula.opacity})`);
        gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(nebula.x - nebula.radius, nebula.y - nebula.radius, nebula.radius * 2, nebula.radius * 2);
    });
    
    stars.forEach(star => {
        star.opacity += (Math.random() - 0.5) * star.twinkleSpeed;
        star.opacity = Math.max(0.15, Math.min(0.85, star.opacity));
        
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
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

initStars();

// Player
class Player {
    constructor() {
        this.width = 60;
        this.height = 60;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        this.color = '#00ffff';
        this.speed = 7;
        this.dx = 0;
        this.dy = 0;
        this.health = 3;
        this.maxHealth = 3;
        this.invulnerableFrames = 0;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldAngle = 0;
        this.shieldCooldown = 0;
        this.teleportCooldown = 0;
        this.blueAuraActive = false;
        this.engineTrail = [];
    }

    draw() {
        this.engineTrail.forEach((trail, i) => {
            ctx.fillStyle = `rgba(255, 150, 0, ${0.5 * (1 - i / this.engineTrail.length)})`;
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, trail.r, 0, Math.PI * 2);
            ctx.fill();
        });
        this.engineTrail = this.engineTrail.slice(-10);
        
        if (this.invulnerableFrames > 0 && frames % 10 < 5) return;
        
        if (playerImg.complete) {
            ctx.drawImage(playerImg, this.x, this.y, this.width, this.height);
        } else {
            ctx.save();
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            
            ctx.beginPath();
            ctx.moveTo(0, -this.height/2);
            ctx.lineTo(this.width/2, this.height/2);
            ctx.lineTo(-this.width/2, this.height/2);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(-10, this.height/2);
            ctx.lineTo(10, this.height/2);
            ctx.lineTo(0, this.height/2 + 10 + Math.random()*5);
            ctx.fillStyle = '#ff9900';
            ctx.fill();
            
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    update() {
        if (this.invulnerableFrames > 0) this.invulnerableFrames--;
        
        if (this.shieldActive) {
            this.shieldTimer--;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                this.shieldCooldown = 180;
            }
        } else if (this.shieldCooldown > 0) {
            this.shieldCooldown--;
        }
        shieldCooldownBar.style.width = ((this.shieldCooldown / 180) * 100) + '%';
        
        if (this.teleportCooldown > 0) this.teleportCooldown--;
        teleportCooldownBar.style.width = ((this.teleportCooldown / 30) * 100) + '%';

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

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > canvas.height) this.y = canvas.height - this.height;

        if (this.dx !== 0 || this.dy !== 0) {
            this.engineTrail.push({
                x: this.x + this.width/2 + (Math.random() - 0.5) * 20,
                y: this.y + this.height - 5,
                r: Math.random() * 5 + 3
            });
        }

        this.draw();
        
        if (this.shieldActive) {
            this.shieldAngle = Math.atan2(mouseY - (this.y + this.height / 2), mouseX - (this.x + this.width / 2));
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width, this.shieldAngle - Math.PI / 4, this.shieldAngle + Math.PI / 4);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 5;
            ctx.shadowBlur = 15;
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
        
        healthFill.style.width = Math.max(0, (this.health / this.maxHealth) * 100) + '%';
    }
}

// Projectile
class Projectile {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.color = '#00ffff';
        this.velocity = 15;
        this.trail = [];
        
        const angle = Math.atan2(targetY - y, targetX - x);
        this.dx = Math.cos(angle) * this.velocity;
        this.dy = Math.sin(angle) * this.velocity;
    }

    draw() {
        this.trail.forEach((p, i) => {
            ctx.fillStyle = `rgba(0, 255, 255, ${0.3 * (1 - i / this.trail.length)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    update() {
        this.trail.push({ x: this.x, y: this.y, r: this.radius * 0.6 });
        if (this.trail.length > 5) this.trail.shift();
        
        this.x += this.dx;
        this.y += this.dy;
        this.draw();
    }

    isOffScreen() {
        return this.y + this.radius < 0 || this.y - this.radius > canvas.height || 
               this.x + this.radius < 0 || this.x - this.radius > canvas.width;
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
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = Math.random() * 0.1 - 0.05;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (this.img && this.img.complete) {
            ctx.drawImage(this.img, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
            if (this.isRed) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
                ctx.globalCompositeOperation = 'source-over';
            }
        } else {
            ctx.fillStyle = this.isRed ? '#ff0000' : '#ffffff';
            ctx.fill();
        }

        ctx.restore();
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.isRed ? '#ff0000' : '#00ffff';
        ctx.lineWidth = 2;
        if (this.isRed) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff0000';
        } else {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ffff';
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    update() {
        this.rotation += this.rotationSpeed;
        this.x += this.dx;
        this.y += this.dy;
        this.draw();
    }

    isOffScreen() {
        return this.y - this.radius > canvas.height || this.y + this.radius < 0 || 
               this.x - this.radius > canvas.width || this.x + this.radius < 0;
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
        this.color = '#00ffff';
        this.velocity = isBoss ? 2 : (Math.random() * 2 + 2);
        this.dx = (Math.random() - 0.5) * 4;
        this.dy = Math.random() > 0.5 ? this.velocity : -this.velocity;
        this.maxHealth = isBoss ? (50 + round * 10) : (1 + Math.floor(round / 3));
        this.health = this.maxHealth;
        this.isDead = false;
        this.hitFlash = 0;
        
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
    }

    draw() {
        const img = this.isBoss ? bossImg : enemyImg;
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        const angle = Math.atan2((player.y + player.height / 2) - (this.y + this.height / 2), (player.x + player.width / 2) - (this.x + this.width / 2));
        ctx.rotate(angle - Math.PI / 2);

        if (img.complete) {
            ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
            if (this.hitFlash > 0) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * (this.hitFlash / 10)})`;
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.globalCompositeOperation = 'source-over';
            }
            if (!this.isBoss && this.health > 1) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.globalCompositeOperation = 'source-over';
            }
        } else {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.fillStyle = (!this.isBoss && this.health > 1) ? '#ff0000' : this.color;
            
            ctx.beginPath();
            ctx.moveTo(0, this.height/2);
            ctx.lineTo(this.width/2, -this.height/2);
            ctx.lineTo(-this.width/2, -this.height/2);
            ctx.closePath();
            ctx.fill();
        }

        if (!this.isBoss && this.attackType === 2) {
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.ellipse(0, -this.height / 2 + 5, this.width / 2 + 5, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, -this.height / 2 + 5, 15, Math.PI, 0);
            ctx.fill();

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

            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00ffcc';
            ctx.fillStyle = '#00ffcc';
            ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
            ctx.shadowBlur = 0;

            ctx.strokeStyle = '#00ffff';
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
        if (this.hitFlash > 0) this.hitFlash--;
        
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
                for(let i=0; i<30; i++) {
                    if (particles.length < MAX_PARTICLES) particles.push(new Particle(ex, ey, '#ff0000'));
                }
                for(let i=0; i<8; i++) {
                    const exAngle = (Math.PI * 2 / 8) * i;
                    enemyProjectiles.push(new EnemyProjectile(ex, ey, false, Math.cos(exAngle)*4, Math.sin(exAngle)*4, 1, true));
                }
                const eIndex = enemies.indexOf(this);
                if (eIndex > -1) {
                    enemies.splice(eIndex, 1);
                    enemyKills++;
                }
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

        // OPTIMIZATION: Reducir frecuencia de disparo, pero mantener patrón
        const shootChance = this.isBoss ? 0.03 : 0.005; // Reducido de 0.05
        if (Math.random() < shootChance && enemyProjectiles.length < MAX_ENEMY_PROJECTILES) {
            const px = player.x + player.width / 2;
            const py = player.y + player.height / 2;
            const ex = this.x + this.width / 2;
            const ey = this.y + this.height / 2;
            const angle = Math.atan2(py - ey, px - ex);
            const speed = this.isBoss ? 5 : 4;

            if (this.attackType === 2 || this.isBoss) {
                const damage = (!this.isBoss && this.attackType === 2) ? 2 : 1;
                const isRed = (!this.isBoss && this.attackType === 2);
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                const cos02 = Math.cos(angle - 0.2);
                const sin02 = Math.sin(angle - 0.2);
                const cos12 = Math.cos(angle + 0.2);
                const sin12 = Math.sin(angle + 0.2);
                
                enemyProjectiles.push(getEnemyProjectile(ex, ey, this.isBoss, cos02 * speed, sin02 * speed, damage, isRed));
                enemyProjectiles.push(getEnemyProjectile(ex, ey, this.isBoss, cosA * speed, sinA * speed, damage, isRed));
                enemyProjectiles.push(getEnemyProjectile(ex, ey, this.isBoss, cos12 * speed, sin12 * speed, damage, isRed));
            } else if (this.attackType === 3) {
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                const cos01 = Math.cos(angle - 0.1);
                const sin01 = Math.sin(angle - 0.1);
                const cos11 = Math.cos(angle + 0.1);
                const sin11 = Math.sin(angle + 0.1);
                
                enemyProjectiles.push(getEnemyProjectile(ex, ey, this.isBoss, cos01 * speed, sin01 * speed, 1, false));
                enemyProjectiles.push(getEnemyProjectile(ex, ey, this.isBoss, cos11 * speed, sin11 * speed, 1, false));
                // Solo hacer delay si Boss ha disparado recientemente
                if (!this.lastDelayedShot || frames - this.lastDelayedShot > 50) {
                    this.lastDelayedShot = frames;
                    setTimeout(() => {
                        if (!this.isDead && enemyProjectiles.length < MAX_ENEMY_PROJECTILES) {
                            const nex = this.x + this.width / 2;
                            const ney = this.y + this.height / 2;
                            const currPx = player.x + player.width / 2;
                            const currPy = player.y + player.height / 2;
                            const nAngle = Math.atan2(currPy - ney, currPx - nex);
                            const nCosA = Math.cos(nAngle);
                            const nSinA = Math.sin(nAngle);
                            const nCos01 = Math.cos(nAngle - 0.1);
                            const nSin01 = Math.sin(nAngle - 0.1);
                            const nCos11 = Math.cos(nAngle + 0.1);
                            const nSin11 = Math.sin(nAngle + 0.1);
                            
                            enemyProjectiles.push(getEnemyProjectile(nex, ney, this.isBoss, nCos01 * speed, nSin01 * speed, 1, false));
                            enemyProjectiles.push(getEnemyProjectile(nex, ney, this.isBoss, nCos11 * speed, nSin11 * speed, 1, false));
                        }
                    }, 300);
                }
            } else if (this.attackType === 1) {
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                enemyProjectiles.push(getEnemyProjectile(ex, ey, this.isBoss, cosA * (speed * 1.5), sinA * (speed * 1.5), 1, false));
            } else {
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                enemyProjectiles.push(getEnemyProjectile(ex, ey, this.isBoss, cosA * speed, sinA * speed, 1, false));
            }
        }
    }
}

// Particle for explosions
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 4 + 1;
        this.color = color;
        this.velocity = {
            x: (Math.random() - 0.5) * 8,
            y: (Math.random() - 0.5) * 8
        };
        this.alpha = 1;
        this.friction = 0.96;
        this.gravity = 0.1;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.velocity.y += this.gravity;
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
        this.rotation = 0;
        this.rotationSpeed = 0.1;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (playerImg.complete) {
            ctx.drawImage(playerImg, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
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
        this.rotation += this.rotationSpeed;
        this.y += this.velocity;
        this.draw();
    }
}

// OPTIMIZATION: Helpers para object pooling
function getEnemyProjectile(x, y, isBoss, dx, dy, damage, isRed) {
    if (enemyProjectilePool.length > 0) {
        const ep = enemyProjectilePool.pop();
        ep.x = x;
        ep.y = y;
        ep.isBoss = isBoss;
        ep.radius = isBoss ? 15 : 10;
        ep.dx = dx;
        ep.dy = dy !== null ? dy : (isBoss ? 5 : 3);
        ep.damage = damage;
        ep.isRed = isRed;
        ep.rotation = Math.random() * Math.PI * 2;
        return ep;
    }
    return new EnemyProjectile(x, y, isBoss, dx, dy, damage, isRed);
}

function recycleEnemyProjectile(ep) {
    enemyProjectilePool.push(ep);
}

function getParticle(x, y, color) {
    if (particlePool.length > 0) {
        const p = particlePool.pop();
        p.x = x;
        p.y = y;
        p.color = color;
        p.alpha = 1;
        p.radius = Math.random() * 4 + 1;
        p.velocity.x = (Math.random() - 0.5) * 8;
        p.velocity.y = (Math.random() - 0.5) * 8;
        return p;
    }
    return new Particle(x, y, color);
}

function recycleParticle(p) {
    if (particlePool.length < MAX_PARTICLES) {
        particlePool.push(p);
    }
}

let player = new Player();
let projectiles = [];
let enemyProjectiles = [];
let healthDrops = [];
let enemies = [];
let particles = [];

let mouseX = canvas.width / 2;
let mouseY = 0;

function init() {
    player = new Player();
    projectiles = [];
    enemyProjectiles = [];
    healthDrops = [];
    enemies = [];
    particles = [];
    scorePopups = [];
    score = 0;
    scoreEl.innerHTML = score;
    round = 1;
    roundEl.innerHTML = round;
    isGameOver = false;
    isPaused = false;
    bossSpawned = false;
    frames = 0;
    enemyKills = 0;
    bossKills = 0;
    gameOverModal.style.display = 'none';
    gameOverTitle.innerText = 'GAME OVER';
    restartBtn.innerText = 'RESTART GAME';
    document.title = 'Space Shooter - Elite Edition';
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
    
    ctx.fillStyle = 'rgba(10, 14, 39, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawStars();
    
    player.update();

    // FIXED: Usar ciclo invertido para evitar problemas con splice
    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        } else {
            particles[i].update();
        }
    }
    
    if (particles.length > MAX_PARTICLES) {
        particles.splice(0, particles.length - MAX_PARTICLES);
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update();

        if (projectiles[i].isOffScreen()) {
            projectiles.splice(i, 1);
        }
    }

    // FIXED: Mejor manejo de ciclos
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const ep = enemyProjectiles[i];
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
                enemyProjectiles.splice(i, 1);
                for(let j=0; j<15; j++) {
                    if (particles.length < MAX_PARTICLES) particles.push(new Particle(ep.x, ep.y, '#00ffff'));
                }
                continue;
            }
        }

        if (!blocked && distance < player.width / 2 + ep.radius - 10) {
            enemyProjectiles.splice(i, 1);
            if (player.invulnerableFrames <= 0) {
                if (player.blueAuraActive) {
                    player.blueAuraActive = false;
                    player.invulnerableFrames = 60;
                    for(let j=0; j<20; j++) {
                        if (particles.length < MAX_PARTICLES) particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#0000ff'));
                    }
                } else {
                    player.health -= ep.damage || 1;
                    player.invulnerableFrames = 60;
                    
                    for(let j=0; j<20; j++) {
                        if (particles.length < MAX_PARTICLES) particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#ff0000'));
                    }

                    if (player.health <= 0) {
                        endGame();
                    }
                }
            }
        } else if (ep.isOffScreen()) {
            enemyProjectiles.splice(i, 1);
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.update();

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
                    for(let j=0; j<20; j++) {
                        if (particles.length < MAX_PARTICLES) particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#0000ff'));
                    }
                } else {
                    player.health -= 1;
                    player.invulnerableFrames = 60;
                    
                    for(let j=0; j<20; j++) {
                        if (particles.length < MAX_PARTICLES) particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#ff0000'));
                    }

                    if (player.health <= 0) {
                        endGame();
                    }
                }
            }
        }
    }

    // Projectile hits Enemy - FIXED: mejor handling de colisiones
    for (let pIndex = projectiles.length - 1; pIndex >= 0; pIndex--) {
        const projectile = projectiles[pIndex];
        let hit = false;
        
        for (let eIndex = enemies.length - 1; eIndex >= 0; eIndex--) {
            const enemy = enemies[eIndex];
            const distX = projectile.x - (enemy.x + enemy.width / 2);
            const distY = projectile.y - (enemy.y + enemy.height / 2);
            const distance = Math.hypot(distX, distY);

            if (distance < enemy.width / 2 + projectile.radius) {
                enemy.health -= 1;
                enemy.hitFlash = 10;
                hit = true;
                
                if (enemy.health <= 0 && !enemy.isDead) {
                    enemy.isDead = true;
                    const explosionColor = enemy.isBoss ? '#ffff00' : enemy.color;
                    const explosionCount = enemy.isBoss ? 60 : 20;
                    for(let j=0; j < explosionCount; j++) {
                        if (particles.length < MAX_PARTICLES) particles.push(new Particle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, explosionColor));
                    }
                    if (Math.random() < 0.2 && !enemy.isBoss) {
                        healthDrops.push(new HealthDrop(enemy.x + enemy.width/2, enemy.y + enemy.height/2));
                    }

                    enemies.splice(eIndex, 1);
                    const scoreGain = enemy.isBoss ? 500 : 10;
                    score += scoreGain;
                    scoreEl.innerHTML = score;
                    
                    if (enemy.isBoss) {
                        bossKills++;
                    } else {
                        enemyKills++;
                    }
                    
                    // MEJORA: Floating score popup
                    scorePopups.push({
                        x: enemy.x + enemy.width/2,
                        y: enemy.y + enemy.height/2,
                        value: scoreGain,
                        life: 60,
                        maxLife: 60
                    });
                }
                break;
            }
        }
        
        if (hit) projectiles.splice(pIndex, 1);
    }

    for (let i = healthDrops.length - 1; i >= 0; i--) {
        const drop = healthDrops[i];
        drop.update();
        const distX = drop.x - (player.x + player.width / 2);
        const distY = drop.y - (player.y + player.height / 2);
        const distance = Math.hypot(distX, distY);

        if (distance < player.width / 2 + drop.radius) {
            if (player.health === player.maxHealth) {
                player.blueAuraActive = true;
            } else {
                player.health = Math.min(player.maxHealth, player.health + 1);
            }
            healthDrops.splice(i, 1);
            
            for(let j=0; j<20; j++) {
                if (particles.length < MAX_PARTICLES) particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#00ff00'));
            }
        } else if (drop.y > canvas.height) {
            healthDrops.splice(i, 1);
        }
    }
    
    // MEJORA: Draw floating score popups
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const popup = scorePopups[i];
        const alpha = popup.life / popup.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 20px Orbitron';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffff00';
        ctx.fillText('+' + popup.value, popup.x, popup.y);
        ctx.restore();
        
        popup.y -= 1.5;
        popup.life--;
        
        if (popup.life <= 0) {
            scorePopups.splice(i, 1);
        }
    }

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
        for(let i=0; i<40; i++) {
            particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#ffffff'));
        }
    }
    
    ctx.fillStyle = 'rgba(10, 14, 39, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!isWin) {
        particles.forEach(p => p.draw());
    } else {
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 60px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffcc';
        ctx.fillText('MISSION COMPLETE!', canvas.width / 2, canvas.height / 2 - 60);
        ctx.shadowBlur = 0;
    }

    finalScoreEl.innerHTML = score;
    finalRoundEl.innerHTML = round;
    gameOverTitle.innerText = isWin ? '✓ VICTORY' : '✗ GAME OVER';
    gameOverModal.style.display = 'block';
}

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
    
    // MEJORA: Prevenir scroll con teclas de movimiento
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
    
    if (e.key === ' ' && !player.shieldActive && player.shieldCooldown <= 0 && !isGameOver) {
        player.shieldActive = true;
        player.shieldTimer = 4.5 * 60;
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
        
        // FIXED: Validar límites tras teletransporte
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
        if (player.y < 0) player.y = 0;
        if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
        
        player.teleportCooldown = 30;

        for(let i=0; i<25; i++) {
            if (particles.length < MAX_PARTICLES) particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#ff9900'));
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
    // MEJORA: Pausa automática cuando pierde el foco
    if (!isGameOver) {
        isGameOver = true;
        gameOverTitle.innerText = '⏸ PAUSED';
        finalScoreEl.innerHTML = score;
        finalRoundEl.innerHTML = round;
        gameOverModal.style.display = 'block';
        restartBtn.innerText = 'RESUME';
    }
});

// MEJORA: Reanudar cuando vuelve el foco
window.addEventListener('focus', () => {
    if (gameOverTitle && gameOverTitle.innerText === '⏸ PAUSED') {
        isGameOver = false;
        gameOverModal.style.display = 'none';
        restartBtn.innerText = 'RESTART GAME';
        animate();
    }
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
});

restartBtn.addEventListener('click', () => {
    init();
});

init();
