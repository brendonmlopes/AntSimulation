class Ant{
  constructor(iniPos,type,energy,FOV){
    this.pos = iniPos
    this.vel = createVector(random()-1/2,random()-1/2)
    this.acc = createVector(0,0)
    this.type = type
    this.energy = energy
    this.FOV = FOV
    this.direction = this.vel.copy().normalize()
    this.range = 300
    this.color = 100
    this.rotationOffset = 100*(random()-1/2)
    this.life = true
    this.carrying = false
    this.pheromones = []
    this.id = 'ant'
  }
  
  show(){
    push()
    colorMode(HSB)
    translate(this.pos.x,this.pos.y)
    rotate(atan2(this.direction.y,this.direction.x))
    if(this.type=='worker'){
      fill(this.color,50,this.energy)
      rotate(90)
      // ellipse(0,0,10)
      image(img,0,0,50,50)
    }
    else if(this.type == 'queen'){
      ellipse(this.pos.x,this.pos.y,50)
    }
    pop()
  }
  
  showFOV(){
    push()
    translate(this.pos.x,this.pos.y)
    rotate(atan2(this.direction.y,this.direction.x))
    fill(255,0,0,40)
    rotate(this.FOV/2)
    line(this.range,0,0,0)
    rotate(-this.FOV)
    line(this.range,0,0,0)
    arc(0,0,this.range*2,this.range*2,0,this.FOV)
    pop()
  }
  
  showPheromones(){
    for(let p of this.pheromones){
      p.show()
    }
  }
  
  pheromoneFade(){
    this.pheromones.shift()
  }
  
  update(){
    if(this.energy<=0){
      this.life=false
    }
    if(this.life){
      this.pos.add(this.vel.copy().mult(dt))
      this.vel.add(this.acc.copy().mult(dt))
      this.vel.rotate(rotation*(noise(frameCount/20+this.rotationOffset)-1/2))
      this.direction = this.vel.copy().normalize()
      this.vel.limit(1)
      this.acc.mult(0)

      if(this.carrying && this.pheromones.length<200 && frameCount%15==0){
        this.color=1
        this.putPheromone()
      }
      if(this.pheromones.length==maxPheromones){
        this.pheromoneFade()
      }
      
      this.energy-=this.vel.copy().mag()/10
    }
  }
  
  putPheromone(){
    this.pheromones.push(new Pheromone(this.pos,10))
  }
  
  applyForce(force){
    this.acc.add(force)
  }
  
  checkFOV(object){
    var objectPos = object.pos.copy()
    var distance = objectPos.sub(this.pos)
    if((distance.mag()>this.range)){
      return false;
    }
    else{
      this.color = 100;
      var angleBetween = acos(distance.dot(this.direction)/(this.direction.mag()*distance.mag()))
      
      fill(255)
      
      if(angleBetween>this.FOV/2){
        return false;
      }
      else{
        if(object.id=='food'){
          this.color = 200
          if(distance.mag()<object.size){
            this.eat(object)
            this.carrying = true
          }
        else if(object.id=='pheromone'){
            this.color=300
          }
        }
        return true;
      }
    }
  }
  
  eat(food){
    this.energy+=food.energy/10
    
    this.vel.mult(-1)
  }
}