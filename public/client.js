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
        gameOverResponse,
        groundInstructions,
        lineInstructions,
        // These may be used to limit warnings/reactions
        // Not implemented
        canWarn = true,
        canReact = true,
        lineKeyDownFn,
        groundKeyDownFn,
        reactionMessage;
    const readyButton = document.getElementById('readybtn');
    const warnButton = document.getElementById('warnbtn');
    const reactButton = document.getElementById('reactbtn');
    const endMessage = document.getElementById('endmessage');
    const playerReactionMessage = document.getElementById('playeractionmessage'); 
    const userText = document.getElementsByClassName('userinfo');

    function disableButtons() {
        disableGameButtons();
        disableReadyButton();
    }

    /**
     * Disable game button
     */
    function disableGameButtons() {
        warnButton.setAttribute('disabled', 'disabled');
        reactButton.setAttribute('disabled', 'disabled');
    }

    /**
     * Enable game button
     */
    function enableGameButtons() {
        warnButton.removeAttribute('disabled', 'disabled');
        reactButton.removeAttribute('disabled', 'disabled');
    }

    function disableReadyButton() {
        readyButton.setAttribute('disabled', 'disabled');
    }

    function enableReadyButton() {
        readyButton.removeAttribute('disabled');
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
        console.log('CLEAR GAMEBOARD');
        timer.innerHTML = '';
        minigame.style.backgroundImage = '';
        while (minigame.firstChild) {
            minigame.removeChild(minigame.firstChild);
        }
    }

    function setEndMessage(msg) {
        endMessage.style.display = 'block';
        endMessage.innerHTML = msg;
        setTimeout(() => {
            clearEndMessage();
        }, 5000);
    }

    function clearEndMessage() {
        endMessage.style.display = 'none';
        endMessage.innerHTML = '';
    }

    function showInstructions() {
        console.log('Showing instructions!!');
        groundInstructions = document.getElementById('groundinstructions').cloneNode(true);
        lineInstructions = document.getElementById('lineinstructions').cloneNode(true);
        if(playerJob.type === 'line') {
            lineInstructions.style.display = 'block';
            groundInstructions.style.display = 'none';
            reactionMessage = 'You pause to re-route the power surge!';
            playerReactionMessage.innerHTML = reactionMessage;
            minigame.appendChild(lineInstructions);
        }
        if(playerJob.type === 'ground') {
            groundInstructions.style.display = 'block';
            lineInstructions.style.display = 'none';
            reactionMessage = 'You step down off the tracks to avoid the train!';
            playerReactionMessage.innerHTML = reactionMessage;
            minigame.appendChild(groundInstructions);
        }
    }

    /**
     * Binde Socket.IO and button events
     */
    function bind() {

        socket.on("start", (playerInfo) => {
            enableReadyButton();
            playerId = playerInfo.id;
            playerJob = playerInfo.job;
            clearGameboard();
            showInstructions();
            if (playerJob.type === 'ground') {
                warnButton.innerHTML = 'Send Warning (w)';
                reactButton.innerHTML = 'React to Warning (r)';
            }
            console.log('start', playerId, playerJob.title);
            setMessage("Waiting for players to ready up.");
        });

        socket.on("end", () => {
            console.log('END HAS HAPPENED');
            disableButtons();
            setMessage("Waiting for opponent...");
        });

        socket.on("connect", () => {
            disableButtons();
            clearGameboard();
            setMessage("Waiting for opponent...");
        });

        socket.on("disconnect", () => {
            disableButtons();
            clearGameboard()
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
            console.log('GAME ON!!');
            setMessage(`Ready, set go! Good luck!`);
            clearEndMessage();
            disableReadyButton();
            enableGameButtons();
            if(playerJob.type === 'line') {
                lineInstructions.style.display = 'none';
                lineGame();
            } else if (playerJob.type === 'ground') {
                groundInstructions.style.display = 'none';
                groundGame();
            }
        });

        function keySwitch(e) {
            if(playerJob.type === 'line') {
                try {
                    lineKeyDownFn(e);
                } catch (err) {
                    console.log('Key fn not yet initialized');
                }
            }
            if(playerJob.type === 'ground') {
                try {
                    groundKeyDownFn(e);
                } catch (err) {
                    console.log('Key fn not yet initialized');
                }
                
            }
        }

        window.addEventListener('keydown', keySwitch);

        socket.on("users", (usersStatus) => {
            let id = 1;
            // console.log('Got user info', usersStatus);
            usersStatus.forEach(status => {
                document.getElementById(`user${id}`).innerHTML = `Player${id} ${id === playerId ? `(you)` : ''} is ${status ? 'ready' : 'not ready'}`;
                console.log(id, playerId, status);
                if(id === playerId && status) {
                    console.log('Update button');
                    readyButton.style.backgroundColor = '#b5ffb4';
                    readyButton.innerHTML = 'Ready!';
                    disableReadyButton();
                } else if (id === playerId && !status) {
                    readyButton.style.backgroundColor = '#ffb4b4';
                    readyButton.innerHTML = 'Ready?';
                }
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

        socket.on("lose", (hazardinfo) => {
            console.log('We lost!!');
            disableGameButtons();
            gameOverResponse();
            setEndMessage(`Ouch, it's going to take some time to recover from that ${hazardinfo.type.name}.`)
        })

        socket.on("won", () => {
            console.log('We won!!');
            disableGameButtons();
            gameOverResponse();
            setEndMessage('Well done, you won! The line is repaired!');
        })

        readyButton.addEventListener("click", function (e) {
            console.log('Client button cliecked:', readyButton.dataset.action);
            socket.emit('action', readyButton.dataset.action);
        }, false);

        warnButton.addEventListener("click", function (e) {
            console.log('Client button cliecked:', warnButton.dataset.action);
            if(canWarn) {
                socket.emit('action', warnButton.dataset.action);
                // canWarn = false;
            }
        }, false);

        reactButton.addEventListener("click", function (e) {
            console.log('reactButton clicked')
            if(canReact) {
                socket.emit('action', reactButton.dataset.action);
                reactMethod();
                // canReact = false;
            }
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
        minigame.draggable = false;
        Array.from(userText).forEach(node => {
            node.innerHTML = 'Waiting...';
        });
        disableButtons();
        bind();
    }

    window.addEventListener("load", init, false);

    function lineGame() {
        const colors = ['red', 'yellow', 'green', 'blue', 'white'];
        const trainNoiseEl = document.createElement('div');
        const messageFromGround = document.createElement('div');
        const arc1 = document.createElement('div');
        const arc2 = document.createElement('div');
        const arc3 = document.createElement('div');
        const textBlock = document.createElement('div');
        const doh = document.getElementById('doh').cloneNode(true);
        const answerLimit = 1500;
        let hasChallenge = false;
        let train = undefined;
        let answer = undefined;
        let spawnedAt = undefined;
        let minigameEnabled = true;

        textBlock.classList.add('textblock');
        messageFromGround.classList.add('groundmessage');
        minigame.appendChild(textBlock);
        minigame.appendChild(doh);

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

        lineKeyDownFn = function(e) {
            const kc = e.keyCode;
            console.log('kc', kc);
            if(hasChallenge && minigameEnabled) {
                if(answer === 'r' && kc === 82 || 
                    // answer === 'o' && kc === 79 ||
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
                this.warningEl = element.cloneNode();
                this.warningEl.classList.add('groundwarning')
                this.warningEl.style.backgroundColor = 'red';
                this.warningEl.style.color = 'white';
                this.reactionEl = element.cloneNode();
                this.reactionEl.classList.add('groundreaction')
                this.parent = parent;
                this.append();
            }

            append() {
                this.parent.appendChild(this.warningEl);
                this.parent.appendChild(this.reactionEl);
            }

            disableMinigame() {
                playerReactionMessage.style.display = 'block';
                minigameEnabled = false;
                textBlock.style.opacity = .25;
                setTimeout(this.enableMinigame.bind(this), 2000);
            }

            enableMinigame() {
                playerReactionMessage.style.display = 'none';
                minigameEnabled = true;
                textBlock.style.opacity = 1;
            }

            showWarning() {
                this.warningEl.innerHTML = 'Watch Out! Surge Incoming!!';
                this.warningEl.style.visibility = 'visible';

                setTimeout(this.hideMessage.bind(this.warningEl), 2000);
            }

            showThanks() {
                this.reactionEl.innerHTML = 'Close call on that train, thanks!';
                this.reactionEl.style.visibility = 'visible';

                setTimeout(this.hideMessage.bind(this.reactionEl), 2000);
            }

            hideMessage() {
                this.style.visibility = 'hidden';
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
            // textBlock.innerHTML = '';
            hasChallenge = false;
            answer = undefined;
            spawnedAt = undefined;
        }

        function passChallenge() {
            // console.log('PASSED THIS CHALLENGE');
            // textBlock.style.backgroundColor = 'green';
            setMessage('Nice, correct color!');
            textBlock.innerHTML = '<span style="color:green;">&#x2714;</span>';
        }

        function failChallenge() {
            // Send message to server here, increment timer
            // console.log('FAILED THIS CHALLENGE');
            socket.emit('minifail');
            setMessage('Opps, not the right color!')
            doh.style.display = 'block';
            setTimeout(() => {
                doh.style.display = 'none';
            }, 250);
            // textBlock.style.backgroundColor = 'red';
            textBlock.innerHTML = '<span style="color:red;">X</span>';
        }

        function spawnChallenge() {
            const doSpawnText = Math.floor(Math.random() * 75) + 1;
            
            if(doSpawnText === 25 && !hasChallenge) {
                const idxText = Math.floor(Math.random() * colors.length);
                let idxColor = idxText;

                hasChallenge = true;
                spawnedAt = Date.now();

                textBlock.style.backgroundColor = '#999';

                while(idxColor === idxText) {
                    idxColor = Math.floor(Math.random() * colors.length);
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
            setMessage(`Game Over!`);
            
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
        const exclamations = document.getElementById('exclamations').cloneNode(true);
        const warnExclamations = exclamations.cloneNode(true);
        warnExclamations.id = 'warnexclamations';
        warnExclamations.draggable = false;
        exclamations.draggable = false;
        messageFromLine.classList.add('linemessage');

        headTarget.addEventListener('click', function(){
            // Send message to server here, increment timer
            groundMinifail();
            console.log('Ow! You shot me you miserable dingus!');
        });
        headTarget.id = 'headtarget';

        groundKeyDownFn = function(e) {
            const kc = e.keyCode;
            console.log('kc', kc);
            if(kc === 87) { // z
                if(!warnButton.disabled) {
                    socket.emit('action', warnButton.dataset.action);
                }
            }
            if(kc === 82) { // b
                if(!reactButton.disabled) {
                    socket.emit('action', reactButton.dataset.action);
                    reactMethod();
                }
            }
        }


        function groundMinifail() {
            exclamations.style.display = 'block';
            setTimeout(() => {
                exclamations.style.display = 'none';
            }, 250);
            socket.emit('minifail');
        }

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
                playerReactionMessage.style.display = 'block';
                minigame.style.top = '-100px';
                this.steppedDown = true;
                this.steppedDownAt = Date.now();
                setTimeout(this.stepUp.bind(this), this.downTime);
            }

            stepUp() {
                playerReactionMessage.style.display = 'none';                
                minigame.style.top = '0px';
                this.steppedDown = false;
                this.steppedDownAt = undefined;
            }

            wave() {
                self = this;
                this.element.style.left = '-100%';
                warnExclamations.style.display = 'block';

                if(!this.waving) {
                    console.log('waving now');
                    this.wavedAt = Date.now();
                    this.waving = true;
                }

                setTimeout(()=>{
                    self.element.style.left = '0%';
                    warnExclamations.style.display = 'none';
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
                this.messageEl.innerHTML = '&lt; Surge gone! Re-routed! &gt;';
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
        minigame.appendChild(exclamations);
        minigame.appendChild(warnExclamations);

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
                    setMessage('Got that bird, yah!');
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
                        setMessage('Ow, it has large talons!');
                        groundMinifail();
                        // console.log('Hit the target!!');
                    }
                }
                if(this.flyingAway) {
                    // console.log('flying away');
                    this.left += this.speed * 3;
                    this.top -= Math.abs(this.speed) * 3;
                    this.setLeft();
                    this.setTop();
                    if(this.top < this.startTop) {
                        // console.log('BIRD AWAY');
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