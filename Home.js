class Home{
  constructor(pos, size){
    this.pos = pos
    this.size = size
    this.id = 'home'
  }

  show(){
    ellipse(this.pos.x,this.pos.y,this.size)
  } 
  
}
