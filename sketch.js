const config = {
  antCount: 200,
  startingEnergy: 100,
  carryAmount: 25,
  deliveryEnergyMultiplier: 1.5,
  maxAntEnergy: 160,
  energyDrainRate: 0.1,
  foodEnergy: 3000,
  foodSize: 50,
  homeSize: 100,
  maxAnts: 250,
  maxPheromones: 300,
  pheromoneStrength: 15,
  pheromoneDropInterval: 1,
  pheromoneFadeRate: 0.2,
  pheromoneCellSize: 160,
  renderAntSprites: false,
  rotation: 5,
  timeStep: 1,
  spawnCooldownFrames: 10,
};

let ants = [];
let food = [];
let pheromones = [];
let deliveryPopups = [];
let home;
let img;
let antSprite;
let paused = false;
let showDebug = false;
let soundEnabled = false;
let foodDepositMode = false;
let lastSpawnFrame = 0;
let pheromoneGrid = new Map();
let resizeTimeoutId = null;
let audioContext = null;
let toastTimeoutId = null;
let lastSoundFrame = {};
let controls = {};
let stats = {};
let totalFoodDelivered = 0;
let configPanelOpen = false;

const configControls = [
  { key: 'antCount', label: 'Starting ants', min: 1, max: 200, step: 1, help: 'Applied when simulation resets.' },
  { key: 'maxAnts', label: 'Max ants', min: 10, max: 800, step: 10, help: 'Caps click-spawned ants.' },
  { key: 'startingEnergy', label: 'Starting lifetime', min: 20, max: 300, step: 5, help: 'Initial ant energy on reset/spawn.' },
  { key: 'maxAntEnergy', label: 'Max lifetime', min: 50, max: 400, step: 5, help: 'Upper bound after food delivery.' },
  { key: 'energyDrainRate', label: 'Lifetime drain', min: 0.01, max: 0.5, step: 0.01, help: 'Energy cost per movement tick.' },
  { key: 'carryAmount', label: 'Carry amount', min: 1, max: 100, step: 1, help: 'Food units each ant can carry.' },
  { key: 'deliveryEnergyMultiplier', label: 'Delivery lifetime gain', min: 0, max: 5, step: 0.1, help: 'Lifetime gained per delivered food unit.' },
  { key: 'foodEnergy', label: 'Food deposit size', min: 25, max: 1000, step: 25, help: 'Food units in each new deposit.' },
  { key: 'foodSize', label: 'Food radius', min: 10, max: 120, step: 1, help: 'Visual and pickup radius for new food.' },
  { key: 'maxPheromones', label: 'Max pheromones', min: 20, max: 1000, step: 10, help: 'Trail memory limit.' },
  { key: 'pheromoneStrength', label: 'Pheromone strength', min: 2, max: 40, step: 1, help: 'Starting size of each trail marker.' },
  { key: 'pheromoneDropInterval', label: 'Pheromone timeout rate', min: 1, max: 90, step: 1, help: 'Frames between trail drops. Higher means fewer trails.' },
  { key: 'pheromoneFadeRate', label: 'Pheromone fade', min: 0.01, max: 2, step: 0.01, help: 'Strength lost per frame. Higher timeout decay.' },
  { key: 'rotation', label: 'Wander rotation', min: 0, max: 20, step: 0.5, help: 'Random movement turn strength.' },
  { key: 'timeStep', label: 'Simulation speed', min: 0.2, max: 3, step: 0.1, help: 'Movement multiplier.' },
];

function preload() {
  img = loadImage('ant.png');
}

function setup() {
  pixelDensity(1);
  imageMode(CENTER);
  createCanvas(windowWidth, windowHeight);
  noSmooth();
  rectMode(CENTER);
  angleMode(DEGREES);
  textFont('monospace');
  antSprite = createGraphics(50, 50);
  antSprite.pixelDensity(1);
  antSprite.imageMode(CENTER);
  antSprite.noSmooth();
  antSprite.image(img, 25, 25, 50, 50);

  setupInterface();
  resetSimulation();
}

function resetSimulation() {
  ants = [];
  food = [];
  pheromones = [];
  deliveryPopups = [];
  totalFoodDelivered = 0;
  pheromoneGrid = new Map();
  home = new Home(createVector(0, 0), config.homeSize);

  food.push(new Food(randomWorldPosition(), config.foodSize, config.foodEnergy));
  food.push(new Food(createVector(100, 100), config.foodSize, config.foodEnergy));

  for (let i = 0; i < config.antCount; i++) {
    const ant = new Ant(home.pos.copy(), 'worker', config.startingEnergy, random(30, 50));
    ants.push(ant);
  }
}

function randomWorldPosition() {
  return createVector(width / 2 - random(width), height / 2 - random(height));
}

function draw() {
  background(66, 48, 27);
  translate(width / 2, height / 2);
  drawWorldBackdrop();

  if (!paused) {
    updateSimulation();
  }

  drawSimulation();
  updateStats();
}

function updateSimulation() {
  const mousePos = createVector(mouseX - width / 2, mouseY - height / 2);
  if (!foodDepositMode && mouseIsPressed && isCanvasInteraction() && ants.length < config.maxAnts && frameCount - lastSpawnFrame >= config.spawnCooldownFrames) {
    ants.push(new Ant(mousePos, 'worker', config.startingEnergy, 100));
    lastSpawnFrame = frameCount;
    playSound('spawn');
  }

  updatePheromones();
  updateDeliveryPopups();

  for (const ant of ants) {
    if (ant.carrying) {
      const deliveredAmount = ant.returnHome(home);
      if (deliveredAmount > 0) {
        totalFoodDelivered += deliveredAmount;
        addDeliveryPopup(deliveredAmount);
        playSound('home');
      }
    } else {
      const nearbyPheromones = getNearbyPheromones(ant.pos);
      for (const pheromone of nearbyPheromones) {
        if (ant.canSee(pheromone)) {
          ant.applySteeringToward(pheromone.pos, 0.3);
        }
      }

      for (const f of food) {
        if (ant.canSee(f)) {
          if (ant.tryEat(f)) {
            playSound('food');
            continue;
          }
          ant.applySteeringToward(f.pos, 0.1);
        }
      }
    }

    ant.update();
    if (ant.shouldDropPheromone(frameCount, config.pheromoneDropInterval)) {
      pheromones.push(ant.putPheromone(config.pheromoneStrength));
      if (pheromones.length > config.maxPheromones) {
        pheromones.shift();
      }
    }
  }
}

function updateDeliveryPopups() {
  deliveryPopups = deliveryPopups.filter((popup) => frameCount - popup.createdFrame <= 60);
}

function addDeliveryPopup(amount) {
  deliveryPopups.push({
    amount,
    createdFrame: frameCount,
    x: home.pos.x + random(-24, 24),
    y: home.pos.y - home.size / 2,
  });
}

function drawWorldBackdrop() {
  push();
  noFill();
  stroke(255, 255, 255, 10);
  strokeWeight(1);
  const pulse = 18 + sin(frameCount * 1.4) * 8;
  ellipse(home.pos.x, home.pos.y, home.size + pulse);
  stroke(114, 213, 155, 18);
  ellipse(0, 0, min(width, height) * 0.72);
  pop();
}

function updatePheromones() {
  pheromoneGrid.clear();

  for (let i = pheromones.length - 1; i >= 0; i--) {
    const pheromone = pheromones[i];
    pheromone.fade(config.pheromoneFadeRate);
    if (pheromone.strength <= 0) {
      pheromones.splice(i, 1);
    } else {
      addPheromoneToGrid(pheromone);
    }
  }
}

function addPheromoneToGrid(pheromone) {
  const cellX = floor(pheromone.pos.x / config.pheromoneCellSize);
  const cellY = floor(pheromone.pos.y / config.pheromoneCellSize);
  const key = `${cellX},${cellY}`;
  let cell = pheromoneGrid.get(key);
  if (!cell) {
    cell = [];
    pheromoneGrid.set(key, cell);
  }
  cell.push(pheromone);
}

function getNearbyPheromones(pos) {
  const cellX = floor(pos.x / config.pheromoneCellSize);
  const cellY = floor(pos.y / config.pheromoneCellSize);
  const nearby = [];

  for (let x = cellX - 1; x <= cellX + 1; x++) {
    for (let y = cellY - 1; y <= cellY + 1; y++) {
      const cell = pheromoneGrid.get(`${x},${y}`);
      if (cell) {
        nearby.push(...cell);
      }
    }
  }

  return nearby;
}

function drawSimulation() {
  drawPheromones();

  for (const ant of ants) {
    ant.show();
    if (showDebug) {
      ant.showFOV();
    }
  }

  for (const f of food) {
    f.show();
  }
  home.show();
  drawColonyTotal();
  drawDeliveryPopups();
}

function drawPheromones() {
  noStroke();
  fill(200, 100, 100, 70);
  for (const pheromone of pheromones) {
    ellipse(pheromone.pos.x, pheromone.pos.y, pheromone.strength);
  }
}

function drawColonyTotal() {
  push();
  textAlign(CENTER, CENTER);
  textSize(17);
  textStyle(BOLD);
  stroke(30, 20, 15);
  strokeWeight(3);
  fill(247, 241, 223);
  text(round(totalFoodDelivered), home.pos.x, home.pos.y);
  pop();
}

function drawDeliveryPopups() {
  push();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  for (const popup of deliveryPopups) {
    const age = frameCount - popup.createdFrame;
    const progress = constrain(age / 60, 0, 1);
    const y = popup.y - progress * 34;
    const alpha = 255 * (1 - progress);
    textSize(18 + progress * 4);
    stroke(30, 20, 15, alpha);
    strokeWeight(3);
    fill(114, 213, 155, alpha);
    text(`+${round(popup.amount)}`, popup.x, y);
  }
  pop();
}

function setupInterface() {
  controls = {
    pause: document.querySelector('[data-action="pause"]'),
    reset: document.querySelector('[data-action="reset"]'),
    food: document.querySelector('[data-action="food"]'),
    debug: document.querySelector('[data-action="debug"]'),
    sound: document.querySelector('[data-action="sound"]'),
    sprites: document.querySelector('[data-action="sprites"]'),
    config: document.querySelector('[data-action="config"]'),
    configClose: document.querySelector('[data-action="config-close"]'),
    configPanel: document.querySelector('#config-panel'),
    configFields: document.querySelector('#config-fields'),
    toast: document.querySelector('#status-toast'),
  };
  stats = {
    ants: document.querySelector('#stat-ants'),
    food: document.querySelector('#stat-food'),
    pheromones: document.querySelector('#stat-pheromones'),
    fps: document.querySelector('#stat-fps'),
  };

  for (const [action, button] of Object.entries(controls)) {
    if (!button || action === 'toast' || action === 'configPanel' || action === 'configFields') {
      continue;
    }
    button.addEventListener('click', () => handleControl(action));
  }
  buildConfigPanel();
  window.addEventListener('pointerdown', handleWorldPointerDown);

  updateControlState();
  updateStats(true);
}

function handleControl(action) {
  if (action === 'pause') {
    togglePause();
  } else if (action === 'reset') {
    resetSimulation();
    playSound('reset');
    showToast('Simulation reset');
  } else if (action === 'food') {
    foodDepositMode = !foodDepositMode;
    playSound('toggle');
    showToast(foodDepositMode ? 'Food deposit mode on' : 'Food deposit mode off');
  } else if (action === 'debug') {
    showDebug = !showDebug;
    playSound('toggle');
  } else if (action === 'sound') {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      ensureAudio();
      playSound('toggle', true);
      showToast('Sound on');
    } else {
      showToast('Sound off');
    }
  } else if (action === 'sprites') {
    config.renderAntSprites = !config.renderAntSprites;
    playSound('toggle');
  } else if (action === 'config') {
    configPanelOpen = !configPanelOpen;
    playSound('toggle');
  } else if (action === 'configClose') {
    configPanelOpen = false;
    playSound('toggle');
  }
  updateControlState();
}

function updateControlState() {
  if (!controls.pause) {
    return;
  }
  controls.pause.setAttribute('aria-pressed', paused ? 'true' : 'false');
  controls.pause.title = paused ? 'Resume' : 'Pause';
  controls.pause.querySelector('span').textContent = paused ? 'Resume' : 'Pause';
  controls.pause.querySelector('svg').innerHTML = paused ? '<path d="m8 5 11 7-11 7V5Z" />' : '<path d="M8 5v14M16 5v14" />';
  controls.debug.setAttribute('aria-pressed', showDebug ? 'true' : 'false');
  controls.food.setAttribute('aria-pressed', foodDepositMode ? 'true' : 'false');
  controls.food.title = foodDepositMode ? 'Exit food deposit mode' : 'Food deposit mode';
  controls.sound.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
  controls.sprites.setAttribute('aria-pressed', config.renderAntSprites ? 'true' : 'false');
  controls.config.setAttribute('aria-expanded', configPanelOpen ? 'true' : 'false');
  controls.configPanel.setAttribute('aria-hidden', configPanelOpen ? 'false' : 'true');
  controls.configPanel.dataset.open = configPanelOpen ? 'true' : 'false';
  document.body.classList.toggle('food-deposit-mode', foodDepositMode);
}

function buildConfigPanel() {
  if (!controls.configFields) {
    return;
  }

  controls.configFields.innerHTML = '';
  for (const item of configControls) {
    const field = document.createElement('div');
    field.className = 'config-field';

    const label = document.createElement('label');
    label.htmlFor = `config-${item.key}`;
    label.textContent = item.label;

    const output = document.createElement('output');
    output.value = formatConfigValue(config[item.key], item.step);
    output.textContent = output.value;
    label.append(output);

    const input = document.createElement('input');
    input.id = `config-${item.key}`;
    input.type = 'range';
    input.min = item.min;
    input.max = item.max;
    input.step = item.step;
    input.value = config[item.key];
    input.addEventListener('input', () => {
      config[item.key] = Number(input.value);
      output.value = formatConfigValue(config[item.key], item.step);
      output.textContent = output.value;
    });

    const help = document.createElement('small');
    help.textContent = item.help;

    field.append(label, input, help);
    controls.configFields.append(field);
  }
}

function formatConfigValue(value, step) {
  return step < 1 ? value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : String(round(value));
}

function updateStats(force = false) {
  if (!force && frameCount % 10 !== 0) {
    return;
  }
  if (!stats.ants) {
    return;
  }
  stats.ants.textContent = liveAntCount();
  stats.food.textContent = round(totalFoodEnergy());
  stats.pheromones.textContent = pheromones.length;
  stats.fps.textContent = round(frameRate());
}

function togglePause() {
  paused = !paused;
  playSound('toggle');
  showToast(paused ? 'Paused' : 'Running');
}

function addFoodAtCursor() {
  addFoodAtScreenPoint(mouseX, mouseY);
}

function addFoodAtScreenPoint(screenX, screenY) {
  const worldX = constrain(screenX, 0, width) - width / 2;
  const worldY = constrain(screenY, 0, height) - height / 2;
  food.push(new Food(createVector(worldX, worldY), config.foodSize, config.foodEnergy));
}

function isCanvasInteraction() {
  const target = document.elementFromPoint(mouseX, mouseY);
  return !isHudTarget(target);
}

function isHudTarget(target) {
  return Boolean(target && target.closest('.topbar, .stats-bar, .config-panel, #status-toast'));
}

function handleWorldPointerDown(event) {
  if (!foodDepositMode || isHudTarget(event.target)) {
    return;
  }

  addFoodAtScreenPoint(event.clientX, event.clientY);
  playSound('food');
  showToast('Food added');
}

function liveAntCount() {
  return ants.reduce((total, ant) => total + (ant.life ? 1 : 0), 0);
}

function totalFoodEnergy() {
  return food.reduce((total, item) => total + item.energy, 0);
}

function keyPressed() {
  if (key === ' ') {
    togglePause();
  } else if (key === 'r' || key === 'R') {
    resetSimulation();
    playSound('reset');
    showToast('Simulation reset');
  } else if (key === 'f' || key === 'F') {
    foodDepositMode = !foodDepositMode;
    playSound('toggle');
    showToast(foodDepositMode ? 'Food deposit mode on' : 'Food deposit mode off');
  } else if (key === 'd' || key === 'D') {
    showDebug = !showDebug;
    playSound('toggle');
  }
  updateControlState();
}

function windowResized() {
  clearTimeout(resizeTimeoutId);
  resizeTimeoutId = setTimeout(() => {
    resizeCanvas(windowWidth, windowHeight);
  }, 100);
}

function showToast(message) {
  if (!controls.toast) {
    return;
  }
  controls.toast.textContent = message;
  controls.toast.dataset.visible = 'true';
  clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    controls.toast.dataset.visible = 'false';
  }, 1300);
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function playSound(type, force = false) {
  if (!soundEnabled && !force) {
    return;
  }
  if (!force && lastSoundFrame[type] && frameCount - lastSoundFrame[type] < 8) {
    return;
  }
  lastSoundFrame[type] = frameCount;
  ensureAudio();

  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  gain.connect(audioContext.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

  const oscillator = audioContext.createOscillator();
  oscillator.type = type === 'home' ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(soundFrequency(type), now);
  oscillator.frequency.exponentialRampToValueAtTime(soundFrequency(type) * 1.35, now + 0.08);
  oscillator.connect(gain);
  oscillator.start(now);
  oscillator.stop(now + 0.18);
}

function soundFrequency(type) {
  if (type === 'food') {
    return 440;
  }
  if (type === 'home') {
    return 660;
  }
  if (type === 'reset') {
    return 220;
  }
  if (type === 'spawn') {
    return 330;
  }
  return 520;
}
