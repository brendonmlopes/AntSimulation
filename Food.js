class Food {
  constructor(pos, size, energy) {
    this.pos = pos.copy();
    this.size = size;
    this.initialSize = size;
    this.energy = energy;
    this.initialEnergy = energy;
    this.id = 'food';
  }

  show() {
    if (this.energy <= 0) {
      return;
    }

    push();
    noStroke();
    fill(246, 87, 67, 60);
    ellipse(this.pos.x, this.pos.y, this.size + sin(frameCount * 2) * 4 + 12);
    fill(246, 87, 67);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
    pop();
  }
}
