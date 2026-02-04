let ants = [];
let food = [];
let home;
const rotation = 5;
const numberOfAnts = 50;
const amountOfFood = 300;
const maxPheromones = 20;
const dt = 1;
let frames = [];
let positions = [];
const maxFrames = 100;
let img;
let i = 0;

function preload() {
  img = loadImage('ant.png');
}

function setup() {
  imageMode(CENTER);
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  angleMode(DEGREES);

  home = new Home(createVector(width*0.2-width/2,height*0.2 - height/2),100)

  foodPos = createVector(width / 2 - random(width), height / 2 - random(height));
  piece = new Food(foodPos, 50, amountOfFood);
  piece2 = new Food(createVector(100,100), 50, amountOfFood);
  food.push(piece);
  food.push(piece2)

  for (i = 0; i < numberOfAnts; i++) {
    iniPos = createVector(-100, -100);
    ant = new Ant(iniPos, 'worker', 100, random(30,50));
    ants.push(ant);
  }
}

function draw() {
  background('rgb(111,79,33)');
  mousePos = createVector(mouseX - width / 2, mouseY - height / 2);
  if (mouseIsPressed) {
    ants.push(new Ant(mousePos, 'worker', 100, 100));
  }
  translate(width / 2, height / 2);
  for (const ant of ants) {
    ant.show();
    ant.update();
    ant.showPheromones();
    // ant.showFOV();
    for (const other of ants) {
      if (other !== ant) {
        for (const p of other.pheromones) {
          if (ant.checkFOV(p) && frameCount % 1 === 0) {
            const distance = p.pos.copy().sub(ant.pos);
            distance.setMag(1);
            ant.applyForce(distance);
          }
        }
      }
    }
    for (const f of food) {
      if (ant.checkFOV(f)) {
        const distanceVector = f.pos.copy().sub(ant.pos);
        distanceVector.setMag(0.1);
        ant.applyForce(distanceVector);
      }
    }
    if(ant.checkFOV(home) && frameCount%10 == 0 ){
        const distanceVector = home.pos.copy().sub(ant.pos);
        distanceVector.setMag(0.1);
	ant.applyForce(distanceVector)
    }
  }
  for (const f of food) {
    f.show();
  }
  home.show();
}
