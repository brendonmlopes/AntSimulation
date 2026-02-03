class Food{
  constructor(pos,size,energy){
    this.pos = pos
    this.size = size
    this.energy = energy
    this.id = 'food'
  }
  
  show(){
    push()
    fill('red')
    ellipse(this.pos.x,this.pos.y,this.size,this.size)
    pop()
  }
  
}