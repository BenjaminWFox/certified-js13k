"use strict";

(function () {

    let socket, //Socket.IO client
        buttons, //Button elements
        message, //Message element
        timer, //Timer element
        playerId,
        minigame,
        playerJob,
        reactMethod,
        hazardPresent,
        hazardResponse,
        messageResponse,
        avoidedResponse,
        gameOverResponse;
    const readyButton = document.getElementById('readybtn');
    const warnButton = document.getElementById('warnbtn');
    const reactButton = document.getElementById('reactbtn');

    /**
     * Disable all button
     */
    function disableButtons() {
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].setAttribute("disabled", "disabled");
        }
    }

    /**
     * Enable all button
     */
    function enableButtons() {
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].removeAttribute("disabled");
        }
    }

    /**
     * Set message text
     * @param {string} text
     */
    function setMessage(text) {
        message.innerHTML = text;
    }

    function setTimer(text) {
        timer.innerHTML = text;
    }

    function clearGameboard() {
        timer.innerHTML = '';

        while (minigame.firstChild) {
            console.log('Clearing', minigame.firstChild);
            minigame.removeChild(minigame.firstChild);
        }
    }

    /**
     * Binde Socket.IO and button events
     */
    function bind() {

        socket.on("start", (playerInfo) => {
            enableButtons();
            playerId = playerInfo.id;
            playerJob = playerInfo.job;
            console.log('start', playerId, playerJob.title);
            setMessage("Waiting for players to ready up.");
        });

        socket.on("end", () => {
            disableButtons();
            setMessage("Waiting for opponent...");
        });

        socket.on("connect", () => {
            disableButtons();
            setMessage("Waiting for opponent...");
        });

        socket.on("disconnect", () => {
            disableButtons();
            setMessage("Connection lost!");
        });

        socket.on("error", () => {
            disableButtons();
            setMessage("Connection error!");
        });

        socket.on("tick", (time) => {
            setTimer(time);
        });

        socket.on("gameon", () => {
            if(playerJob.type === 'line') {
                lineGame();
            } else if (playerJob.type === 'ground') {
                groundGame();
            }
        });

        socket.on("users", (usersStatus) => {
            let id = 1;
            console.log('Got user info', usersStatus);
            usersStatus.forEach(status => {
                document.getElementById(`user${id}`).innerHTML = `Player${id} ${id === playerId ? `(you) ${playerJob.type.toUpperCase()}` : ''} is ${status ? 'ready' : 'not ready'}`;
                ++id;
            });
        });

        socket.on("hazard", (payload) => {
            console.log('HAZARD');
            hazardResponse(payload);
        })

        socket.on("msg", (payload) => {
            console.log('On message', messageResponse);
            messageResponse(payload);
        })

        socket.on("avoided", (payload) => {
            avoidedResponse(payload);
        })

        socket.on("gameover", () => {
            gameOverResponse();
        })

        readyButton.addEventListener("click", function (e) {
            console.log('Client button cliecked:', readyButton.dataset.action);
            socket.emit('action', readyButton.dataset.action);
        }, false);

        warnButton.addEventListener("click", function (e) {
            console.log('Client button cliecked:', warnButton.dataset.action);
            socket.emit('action', warnButton.dataset.action);
        }, false);

        reactButton.addEventListener("click", function (e) {
            console.log('reactButton clicked')
            socket.emit('action', reactButton.dataset.action);
            reactMethod();
        }, false);
    }

    /**
     * Client module init
     */
    function init() {
        console.log('INIT & BIND');
        socket = socket || io({ upgrade: false, transports: ["websocket"] });
        buttons = document.getElementsByTagName("button");
        message = document.getElementById("message");
        timer = document.getElementById("timer");
        minigame = document.getElementById("game");
        disableButtons();
        console.log('socket.on', socket);
        bind();
        console.log('socket.on', socket);
    }

    window.addEventListener("load", init, false);

    function lineGame() {
        const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'white'];
        const trainNoiseEl = document.createElement('div');
        const messageFromGround = document.createElement('div');
        const arc1 = document.createElement('div');
        const arc2 = document.createElement('div');
        const arc3 = document.createElement('div');
        const textBlock = document.createElement('div');
        const answerLimit = 1500;
        let hasChallenge = false;
        let train = undefined;
        let answer = undefined;
        let spawnedAt = undefined;
        let minigameEnabled = true;

        textBlock.classList.add('textblock');
        messageFromGround.classList.add('groundmessage');
        game.appendChild(textBlock);

        trainNoiseEl.classList.add('trainwarning');
        arc1.classList.add('arc', 'arc1');
        arc2.classList.add('arc', 'arc2');
        arc3.classList.add('arc', 'arc3');
        arc1.innerHTML = '&#9697;';
        arc2.innerHTML = '&#9697;';
        arc3.innerHTML = '&#9697;';
        trainNoiseEl.appendChild(arc1);
        trainNoiseEl.appendChild(arc2);
        trainNoiseEl.appendChild(arc3);

        window.onkeydown = function(e) {
            const kc = e.keyCode;
            console.log('kc', kc);
            if(hasChallenge && minigameEnabled) {
                if(answer === 'r' && kc === 82 || 
                    answer === 'o' && kc === 79 ||
                    answer === 'y' && kc === 89 ||
                    answer === 'g' && kc === 71 ||
                    answer === 'b' && kc === 66 ||
                    answer === 'w' && kc === 87
                ) {
                    passChallenge();
                    resetChallenge();
                } else {
                    failChallenge();
                    resetChallenge();
                }
            }
        }

        class LineAnimations {
            constructor(element, parent) {
                this.element = element;
                this.parent = parent;
                this.append();
            }

            append() {
                this.parent.appendChild(this.element);
            }

            disableMinigame() {
                minigameEnabled = false;
                textBlock.style.opacity = .25;
                setTimeout(this.enableMinigame.bind(this), 2000);
            }

            enableMinigame() {
                minigameEnabled = true;
                textBlock.style.opacity = 1;
            }

            showWarning() {
                this.element.innerHTML = 'Watch Out! Surge Incoming!!';
                this.element.style.visibility = 'visible';

                setTimeout(this.hideMessage.bind(this), 2000);
            }

            showThanks() {
                this.element.innerHTML = 'Close call on that train, thanks!';
                this.element.style.visibility = 'visible';

                setTimeout(this.hideMessage.bind(this), 2000);
            }

            hideMessage() {
                this.element.style.visibility = 'hidden';
            }
        }

        class Train {
            constructor(element, parent) {
                this.element = element;
                this.element.style.visibility = 'visible';
                this.parent = parent;
                this.spawnedAt = Date.now();
                this.a1 = this.element.childNodes[0]
                this.a2 = this.element.childNodes[1]
                this.a3 = this.element.childNodes[2]
                this.arcs = [this.a1, this.a2, this.a3];
                this.allVisible = false;
                this.finished = false;
                this.endPause = 1000;
                this.visible = false;

                console.log(this.element.childNodes);

                this.setStyles();
                this.append();
            }

            setStyles() {
                // this.element.style.visibility = 'hidden';
                for(let i=0;i<this.arcs.length;i++) {
                    this.arcs[i].style.opacity = 0;
                }
            }

            append() {
                this.parent.appendChild(this.element);
            }

            delete() {
                this.arcs.forEach(arc => {
                    arc.style.opacity = 0;
                })
                this.parent.removeChild(this.element);
            }

            move() {
                let processedArcs = 0
                for(let i=0;i<this.arcs.length;i++) {
                    if(this.arcs[i].style.opacity < 1) {
                        this.arcs[i].style.opacity = Number(this.arcs[i].style.opacity) + .025;
                        break;
                    }
                    ++processedArcs;
                }
                if(!this.allvisible && processedArcs === this.arcs.length) {
                    console.log('ALL VISIBLE');
                    this.allVisible = true;
                }
                if(this.allVisible) {
                    this.endPause -= 25;
                    if(this.visible) {
                        this.element.style.visibility = 'hidden';
                        this.visible = false;
                    } else {
                        this.element.style.visibility = 'visible';
                        this.visible = true;
                    }
                }
                if(this.endPause === 0) {
                    this.finished = true;
                }
            }

        }

        const lineAnimator = new LineAnimations(messageFromGround, minigame);
        let scTimeout = undefined;

        spawnChallenge();

        function resetChallenge() {
            textBlock.innerHTML = '';
            hasChallenge = false;
            answer = undefined;
            spawnedAt = undefined;
        }

        function passChallenge() {
            console.log('PASSED THIS CHALLENGE');
            textBlock.style.backgroundColor = 'green';
        }

        function failChallenge() {
            // Send message to server here, increment timer
            console.log('FAILED THIS CHALLENGE');
            textBlock.style.backgroundColor = 'red';
        }

        function spawnChallenge() {
            const doSpawnText = Math.floor(Math.random() * 75) + 1;
            // const doSpawnTrain = Math.floor(Math.random() * 100) + 1;
            
            if(doSpawnText === 25 && !hasChallenge) {
                const idxText = Math.floor(Math.random() * 6);
                let idxColor = idxText;

                hasChallenge = true;
                spawnedAt = Date.now();

                textBlock.style.backgroundColor = '#999';

                while(idxColor === idxText) {
                    idxColor = Math.floor(Math.random() * 6);
                }

                answer = colors[idxColor].charAt(0);

                textBlock.innerHTML = colors[idxText];
                textBlock.style.color = colors[idxColor];
            }
            if(hasChallenge && spawnedAt + answerLimit < Date.now()) {
                failChallenge();
                resetChallenge();
            }

            if (train) {
                train.move();
                // if(train.finished) {
                //     console.log('OH NOT TRAIN IS HERE!', train);
                //     train.delete();
                //     train = undefined;
                // }
            }
            scTimeout = setTimeout(spawnChallenge, 25);
        }

        console.log('BINDING HAZARD');

        hazardResponse = function(payload) {
            console.log(`Careful, a ${payload.type.name}`);

            if(payload.type.type === 'train') {
                train = new Train(trainNoiseEl, minigame);
            }
        }
        messageResponse = function(payload) {
            console.log(`I received a ${payload.type} from my partner that says "${payload.message}."`);
            if(payload.type === 'warning') {
                lineAnimator.showWarning();
            }
            if(payload.type === 'reaction') {
                lineAnimator.showThanks();
            }
        }
        avoidedResponse = function(payload) {
            setMessage(`Nice, hazard avoided!`);
            if(train) {
                clearTrain();
                lineAnimator.showThanks();
            } else {
                // Reaction already happened
            }
        }
        gameOverResponse = function() {
            setMessage(`Game Over! Too Bad!`);
            
            clearTimeout(scTimeout);

            train = undefined;

            clearGameboard();

        }

        reactMethod = function(e) {
            console.log('Client button cliecked:', reactButton.dataset.action);
            lineAnimator.disableMinigame();
        }

        function clearTrain() {
            train.delete();
            train = undefined;
        }

    }

    function groundGame() {
        const personImg = document.createElement('img');
        const birdImg = document.createElement('img');
        const surgeEl = document.createElement('div');
        const headTarget = document.createElement('div');
        const messageFromLine = document.createElement('div');
        messageFromLine.classList.add('linemessage');

        headTarget.addEventListener('click', function(){
            // Send message to server here, increment timer
            console.log('Ow! You shot me you miserable dingus!');
        });
        headTarget.id = 'headtarget';

        class GroundAnimations {
            constructor(element, messageEl, parent) {
                this.steppedDown = false;
                this.steppedDownAt = undefined;
                this.wavedAt = undefined;
                this.downTime = 2000;
                this.element = element;
                this.messageEl = messageEl;
                this.waving = false;
                this.parent = parent;
                this.append();
            }

            append() {
                this.parent.appendChild(this.messageEl);
            }

            stepDown() {
                minigame.style.top = '-100px';
                this.steppedDown = true;
                this.steppedDownAt = Date.now();
                setTimeout(this.stepUp.bind(this), this.downTime);
            }

            stepUp() {
                minigame.style.top = '0px';
                this.steppedDown = false;
                this.steppedDownAt = undefined;
            }

            wave() {
                self = this;
                this.element.style.left = '-100%';
                
                if(!this.waving) {
                    console.log('waving now');
                    this.wavedAt = Date.now();
                    this.waving = true;
                }

                setTimeout(()=>{
                    self.element.style.left = '0%';
                    if(self.wavedAt + self.downTime > Date.now()) {
                        setTimeout(self.wave.bind(self), 50);
                    } else {
                        self.unWave();
                    }
                }, 50)

            }

            unWave() {
                this.waving = false;
                this.element.style.left = '0%';
            }

            showThanks() {
                this.messageEl.innerHTML = 'Fixed it! Thanks!!';
                this.messageEl.style.visibility = 'visible';

                setTimeout(this.hideMessage.bind(this), 2000);
            }

            hideMessage() {
                this.messageEl.style.visibility = 'hidden';
            }
        }

        const groundAnimator = new GroundAnimations(personImg, messageFromLine, minigame);
        surgeEl.id = 'surge'

        personImg.src = 'person-sprite.png';
        personImg.id = 'person';
        personImg.draggable = false;
        
        birdImg.src = 'bird.png';
        birdImg.draggable = false;

        minigame.style.backgroundImage = 'url(/lines.png)';
        minigame.style.cursor = 'crosshair';

        minigame.appendChild(personImg);
        minigame.appendChild(headTarget);
        // minigame.appendChild(surge);

        // game vars
        let bird = undefined;
        let surge = undefined;
        let scTimeout = undefined;

        class Bird {
            constructor(element, parent, reversed) {
                this.element = element;
                this.parent = parent;
                this.left = 105;
                this.scale = 1;
                this.startTop = -13.5;
                this.top = -13.5;
                this.speed = -1;
                this.targetX = 54;
                this.targetTop = 20;
                this.flyingAway = false;
                this.hitTarget = false;
                this.away = false;

                reversed ? this.reverse() : '';
                this.setStyles();
                this.append();
                this.element.addEventListener('click', (e) => {
                    console.log('bird clicked!');
                    this.flyingAway = true;
                });
            }

            delete() {
                this.parent.removeChild(this.element);
            }

            append() {
                this.parent.appendChild(this.element);
            }

            move() {
                if(!this.flyingAway) {
                    if(this.scale === 1 && this.left > this.targetX ||
                       this.scale === -1 && this.left < this.targetX) {
                        this.left += this.speed;
                        this.setLeft();
                    }
                    if(this.top < this.targetTop) {
                        this.top += Math.abs(this.speed / 1.5);
                        this.setTop();
                    }
                    if(this.top >= this.targetTop &&
                       (this.scale === 1 && this.left <= this.targetX ||
                       this.scale === -1 && this.left >= this.targetX)
                    ) {
                        this.hitTarget = true;
                        this.flyingAway = true;
                        console.log('Hit the target!!');
                    }
                }
                if(this.flyingAway) {
                    console.log('flying away');
                    this.left += this.speed * 3;
                    this.top -= Math.abs(this.speed) * 3;
                    this.setLeft();
                    this.setTop();
                    if(this.top < this.startTop) {
                        console.log('BIRD AWAY');
                        this.away = true;
                    }
                }
            }

            reverse() {
                this.targetX = 46;
                this.top = -13;
                this.speed = 1;
                this.left = -5;
                this.scale = -1;
                this.setStyles();
            }

            setLeft() {
                this.element.style.left = `${this.left}%`;
            }

            setTop() {
                this.element.style.top = `${this.top}%`;
            }

            setStyles() {
                this.element.style.position = 'absolute';
                this.setTop();
                this.setLeft();
                this.element.style.transform = `translateX(-50%) scaleX(${this.scale})`;
            }
        }

        class Surge {
            constructor(element, parent) {
                this.element = element;
                this.parent = parent;
                this.spawnedAt = Date.now();
                this.initialLeft = -32;
                this.left = this.initialLeft;
                this.leftLimit = 160;
                this.speed = 1.3;
                this.hitPlayer = false;
                this.append();
            }

            delete() {
                this.element.style.left = `${this.initialLeft}px`;
                this.parent.removeChild(this.element);
            }

            append() {
                this.element.style.left = `${this.initialLeft}px`;
                this.parent.appendChild(this.element);
            }

            move() {
                if(this.left >= this.leftLimit) {
                    this.left = this.initialLeft;
                    this.hitPlayer = true;
                }
                this.left += this.speed;
                this.setLeft();
            }

            setLeft() {
                this.element.style.left = `${this.left}px`
            }
        }

        spawnChallenge();

        function spawnChallenge() {
            const doSpawnBird = Math.floor(Math.random() * 50) + 1;
            // const doSpawnSurge = Math.floor(Math.random() * 100) + 1;
            
            // the challenge!
            if(bird && bird.away) {
                bird.delete();
                bird = undefined;
            }
            if(!bird && doSpawnBird === 25) {
                bird = new Bird(birdImg, minigame, Math.round(Math.random()));
            } else if (bird) {
                bird.move();
            }

            if (surge) {
                surge.move();
            }

            scTimeout = setTimeout(spawnChallenge, 25);
        }

        hazardResponse = function(payload) {
            console.log(`Careful, a ${payload.type.name}`);

            if(payload.type.type === 'surge') {
                console.log('SPAWNING NEW SURGE');
                surge = new Surge(surgeEl, minigame);
            }
        }
        messageResponse = function(payload) {
            console.log(`I received a ${payload.type} from my partner that says "${payload.message}."`);
            if(payload.type === 'warning') {
                groundAnimator.wave();
            }
            if(payload.type === 'reaction') {
                groundAnimator.showThanks();
            }
        }
        avoidedResponse = function(payload) {
            setMessage(`Nice, hazard avoided!`);
            if(surge) {
                clearSurge();
                groundAnimator.showThanks();
            } else {
                // Reaction already happened
            }
        }
        gameOverResponse = function() {
            setMessage(`Game Over! Too Bad!`);
            
            clearTimeout(scTimeout);

            surge = undefined;

            clearGameboard();
        }

        reactMethod = function(e) {
            console.log('Client button cliecked:', reactButton.dataset.action);
            groundAnimator.stepDown();
        }

        function clearSurge() {
            surge.delete();
            surge = undefined;
        }

    }

})();