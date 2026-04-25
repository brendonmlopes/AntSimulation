class Pheromone {
  constructor(pos, strength) {
    this.pos = pos.copy();
    this.strength = strength;
    this.id = 'pheromone';
  }

  fade(amount) {
    this.strength = max(0, this.strength - amount);
    return this;
  }

  show() {
    push();
    fill(200, 100, 100, this.strength * 8);
    stroke(255, 255, 255, this.strength * 5);
    ellipse(this.pos.x, this.pos.y, this.strength);
    pop();
  }
}
