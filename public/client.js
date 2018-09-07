"use strict";

(function () {

    let socket, //Socket.IO client
        buttons, //Button elements
        message, //Message element
        timer, //Timer element
        score, //Score element
        playerId,
        minigame,
        playerJob,
        points = { //Game points
            draw: 0,
            win: 0,
            lose: 0
        };

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

    /**
     * Set score text
     * @param {string} text
     */
    function displayScore(text) {
        score.innerHTML = [
            "<h2>" + text + "</h2>",
            "Won: " + points.win,
            "Lost: " + points.lose,
            "Draw: " + points.draw
        ].join("<br>");
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

        socket.on("win", () => {
            points.win++;
            displayScore("You win!");
        });

        socket.on("lose", () => {
            points.lose++;
            displayScore("You lose!");
        });

        socket.on("draw", () => {
            points.draw++;
            displayScore("Draw!");
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
            console.log('tick');
            setTimer(time);
        });

        socket.on("gameon", () => {
            if(playerJob.type === 'line') {
                lineGame();
            } else if (playerJob.type === 'ground') {
                groundGame();
            }
        });

        socket.on("hazard", (payload) => {
            setMessage(`Careful, a ${payload.type.name}`);
        })

        socket.on("avoided", (payload) => {
            setMessage(`Nice, hazard avoided!`);
        })

        socket.on("msg", (payload) => {
            setMessage(`I received a ${payload.type} from my partner that says "${payload.message}."`);
        })

        socket.on("users", (usersStatus) => {
            let id = 1;
            console.log('Got user info', usersStatus);
            usersStatus.forEach(status => {
                document.getElementById(`user${id}`).innerHTML = `Player${id} ${id === playerId ? `(you) ${playerJob.type.toUpperCase()}` : ''} is ${status ? 'ready' : 'not ready'}`;
                ++id;
            });
        });

        for (let i = 0; i < buttons.length; i++) {
            ((button, guess) => {
                button.addEventListener("click", function (e) {
                    console.log('Client button cliecked:', button.dataset.action);
                    socket.emit('action', button.dataset.action);
                }, false);
            })(buttons[i], i + 1);
        }
    }

    /**
     * Client module init
     */
    function init() {
        socket = io({ upgrade: false, transports: ["websocket"] });
        buttons = document.getElementsByTagName("button");
        message = document.getElementById("message");
        timer = document.getElementById("timer");
        score = document.getElementById("score");
        minigame = document.getElementById("game");
        disableButtons();
        bind();
        lineGame();
    }

    window.addEventListener("load", init, false);

    function lineGame() {
        const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'white'];
        const trainNoiseEl = document.createElement('div');
        const arc1 = document.createElement('div');
        const arc2 = document.createElement('div');
        const arc3 = document.createElement('div');
        const textBlock = document.createElement('div');
        const answerLimit = 2000;
        let hasChallenge = false;
        let train = undefined;
        let answer = undefined;
        let spawnedAt = undefined;

        textBlock.classList.add('textblock');
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
            if(hasChallenge) {
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

                this.append();
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
                        this.arcs[i].style.opacity = Number(this.arcs[i].style.opacity) + .02;
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
            console.log('FAILED THIS CHALLENGE');
            textBlock.style.backgroundColor = 'red';
        }

        function spawnChallenge() {
            const doSpawnText = Math.floor(Math.random() * 50) + 1;
            const doSpawnTrain = Math.floor(Math.random() * 100) + 1;
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
            if(!train && doSpawnTrain === 50) {
                console.log('Make train!');
                train = new Train(trainNoiseEl, minigame);
            } else if (train) {
                train.move();
                if(train.finished) {
                    console.log('OH NOT TRAIN IS HERE!', train);
                    train.delete();
                    train = undefined;
                }
            }
            setTimeout(spawnChallenge, 25);
        }
    }

    function groundGame() {
        const personImg = document.createElement('img');
        const birdImg = document.createElement('img');
        const surgeEl = document.createElement('div');
        surgeEl.id = 'surge'

        personImg.src = 'person-sprite.png';
        personImg.id = 'person';
        personImg.draggable = false;
        
        birdImg.src = 'bird.png';
        birdImg.draggable = false;

        minigame.style.backgroundImage = 'url(/lines.png)';
        minigame.style.cursor = 'crosshair';

        minigame.appendChild(personImg);
        // minigame.appendChild(surge);

        // game vars
        let bird = undefined;
        let surge = undefined;

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
                this.left = -32;
                this.leftLimit = 160;
                this.speed = 2;
                this.hitPlayer = false;
                this.append();
            }

            delete() {
                this.parent.removeChild(this.element);
            }

            append() {
                this.parent.appendChild(this.element);
            }

            move() {
                console.log(this.left, this.leftLimit);
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
            const doSpawnSurge = Math.floor(Math.random() * 100) + 1;
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

            if(surge && surge.hitPlayer) {
                console.log('PLAYER IS DEAD!')
                surge.delete();
                surge = undefined;
            }

            if(!surge && doSpawnSurge === 25) {
                surge = new Surge(surgeEl, minigame);
            } else if (surge) {
                surge.move();
            }

            setTimeout(spawnChallenge, 25);
        }
    }

})();