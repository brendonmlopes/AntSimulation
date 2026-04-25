class Ant {
  constructor(iniPos, type, energy, FOV) {
    this.pos = iniPos.copy();
    this.vel = createVector(random() - 1 / 2, random() - 1 / 2);
    this.acc = createVector(0, 0);
    this.type = type;
    this.energy = energy;
    this.FOV = FOV;
    this.fovCos = cos(FOV / 2);
    this.direction = this.vel.copy().normalize();
    this.range = 300;
    this.rangeSq = this.range * this.range;
    this.color = 100;
    this.rotationOffset = 100 * (random() - 1 / 2);
    this.life = true;
    this.carrying = false;
    this.carryAmount = 0;
    this.id = 'ant';
  }

  show() {
    if (!this.life) {
      return;
    }

    push();
    translate(this.pos.x, this.pos.y);
    rotate(atan2(this.direction.y, this.direction.x));
    if (this.type === 'worker') {
      if (config.renderAntSprites) {
        rotate(90);
        image(antSprite, 0, 0);
      } else {
        noStroke();
        fill(this.carrying ? 245 : 25, this.carrying ? 180 : 25, 35);
        triangle(14, 0, -10, -7, -10, 7);
      }
    } else if (this.type === 'queen') {
      ellipse(0, 0, 50);
    }
    pop();
  }

  showFOV() {
    if (!this.life) {
      return;
    }

    push();
    translate(this.pos.x, this.pos.y);
    rotate(atan2(this.direction.y, this.direction.x));
    fill(255, 0, 0, 40);
    rotate(this.FOV / 2);
    line(this.range, 0, 0, 0);
    rotate(-this.FOV);
    line(this.range, 0, 0, 0);
    arc(0, 0, this.range * 2, this.range * 2, 0, this.FOV);
    pop();
  }

  update() {
    if (this.energy <= 0) {
      this.life = false;
    }

    if (!this.life) {
      return;
    }

    this.pos.x += this.vel.x * config.timeStep;
    this.pos.y += this.vel.y * config.timeStep;
    this.vel.x += this.acc.x * config.timeStep;
    this.vel.y += this.acc.y * config.timeStep;
    this.vel.rotate(config.rotation * (noise(frameCount / 20 + this.rotationOffset) - 1 / 2));
    const speedSq = this.vel.x * this.vel.x + this.vel.y * this.vel.y;
    if (speedSq > 1) {
      const inverseSpeed = 1 / sqrt(speedSq);
      this.vel.x *= inverseSpeed;
      this.vel.y *= inverseSpeed;
    }
    const directionSpeedSq = this.vel.x * this.vel.x + this.vel.y * this.vel.y;
    if (directionSpeedSq > 0) {
      const inverseDirectionSpeed = 1 / sqrt(directionSpeedSq);
      this.direction.x = this.vel.x * inverseDirectionSpeed;
      this.direction.y = this.vel.y * inverseDirectionSpeed;
    }
    this.acc.x = 0;
    this.acc.y = 0;
    this.energy -= sqrt(directionSpeedSq) * config.energyDrainRate;
  }

  shouldDropPheromone(currentFrame, interval) {
    return this.life && this.carrying && currentFrame % interval === 0;
  }

  returnHome(home) {
    const dx = home.pos.x - this.pos.x;
    const dy = home.pos.y - this.pos.y;
    const distanceSq = dx * dx + dy * dy;
    const homeRadius = home.size / 2;
    if (distanceSq < homeRadius * homeRadius) {
      const deliveredAmount = this.carryAmount;
      this.carrying = false;
      this.carryAmount = 0;
      this.energy = min(this.energy + deliveredAmount * config.deliveryEnergyMultiplier, config.maxAntEnergy);
      this.vel.mult(-1);
      return deliveredAmount;
    }

    this.applySteeringToward(home.pos, 0.1);
    return 0;
  }

  putPheromone(strength) {
    this.color = 1;
    return new Pheromone(this.pos, strength);
  }

  applyForce(force) {
    if (this.life) {
      this.acc.add(force);
    }
  }

  applySteeringToward(pos, forceMagnitude) {
    const dx = pos.x - this.pos.x;
    const dy = pos.y - this.pos.y;
    const distance = sqrt(dx * dx + dy * dy);
    if (!this.life || distance === 0) {
      return;
    }

    this.acc.x += (dx / distance) * forceMagnitude;
    this.acc.y += (dy / distance) * forceMagnitude;
  }

  canSee(object) {
    if (!this.life || !object || !object.pos) {
      return false;
    }

    const dx = object.pos.x - this.pos.x;
    const dy = object.pos.y - this.pos.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq === 0 || distanceSq > this.rangeSq || this.direction.magSq() === 0) {
      return false;
    }

    this.color = 100;
    const inverseDistance = 1 / sqrt(distanceSq);
    const cosAngle = (dx * this.direction.x + dy * this.direction.y) * inverseDistance;
    if (cosAngle < this.fovCos) {
      return false;
    }

    if (object.id === 'food') {
      this.color = 200;
      return object.energy > 0;
    }

    if (object.id === 'pheromone') {
      this.color = 300;
      return true;
    }

    if (object.id === 'home') {
      return true;
    }

    return false;
  }

  tryEat(food) {
    if (this.carrying || food.energy <= 0) {
      return false;
    }

    const dx = food.pos.x - this.pos.x;
    const dy = food.pos.y - this.pos.y;
    const foodRadius = food.size / 2;
    if (dx * dx + dy * dy >= foodRadius * foodRadius) {
      return false;
    }

    this.eat(food);
    this.carrying = true;
    return true;
  }

  eat(food) {
    if (food.energy <= 0) {
      return;
    }

    const biteEnergy = min(config.carryAmount, food.energy);
    this.carryAmount = biteEnergy;
    food.energy -= biteEnergy;
    food.size = food.initialSize * (food.energy / food.initialEnergy);
    if (food.energy <= 0) {
      food.size = 0;
      food.energy = 0;
    }
    this.vel.mult(-1);
  }
}
