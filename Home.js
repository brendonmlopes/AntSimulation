class Home {
  constructor(pos, size) {
    this.pos = pos.copy();
    this.size = size;
    this.id = 'home';
  }

  show() {
    push();
    noStroke();
    fill(114, 213, 155, 38);
    ellipse(this.pos.x, this.pos.y, this.size + sin(frameCount * 1.8) * 8 + 18);
    fill(60, 45, 35);
    stroke(30, 20, 15);
    ellipse(this.pos.x, this.pos.y, this.size);
    pop();
  }
}
