class Pheromone{
  constructor(pos,strength){
    this.pos = pos.copy()
    this.strength = strength
  }
  
  show(){
    push()
    fill(200,100,100,80)
    stroke(255,255,255,50)
    ellipse(this.pos.x,this.pos.y,this.strength/3)
    pop()
  }
  
}