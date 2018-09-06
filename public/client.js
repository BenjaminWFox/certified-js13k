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
                console.log('Ground game!');
            }
        })

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
        groundGame();
    }

    window.addEventListener("load", init, false);

    function lineGame() {
        const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'white'];
        const textBlock = document.createElement('div');
        const answerLimit = 2000;
        let hasChallenge = false;
        let answer = undefined;
        let spawnedAt = undefined;

        textBlock.classList.add('textblock');
        game.appendChild(textBlock);

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
            const doSpawn = Math.floor(Math.random() * 50) + 1;
            if(doSpawn === 25 && !hasChallenge) {
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
            setTimeout(spawnChallenge, 25);
        }
    }

    function groundGame() {
        const personImg = document.createElement('img');
        const birdImg = document.createElement('img');
        const surge = document.createElement('div');
        surge.id = 'surge'

        personImg.src = 'person.png';
        birdImg.src = 'bird.png';
        birdImg.draggable = false;

        minigame.style.backgroundImage = 'url(/lines.png)';
        minigame.style.cursor = 'crosshair';

        minigame.appendChild(personImg);
        minigame.appendChild(surge);

        // game vars
        let bird = undefined;
        let surgeSpawned = false;
        let surgeSpawnedAt = undefined;
        
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
                reversed ? this.reverse() : '';
                this.setStyles();
                this.append();
                this.flyingAway = false;
                this.hitTarget = false;
                this.away = false;

                this.element.addEventListener('click', (e) => {
                    console.log('bird clicked!');
                    this.flyingAway = true;
                });
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
                this.targetX = 45;
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

        function spawnBird() {
            
        }

        spawnChallenge();

        function spawnChallenge() {
            const doSpawnBird = Math.floor(Math.random() * 50) + 1;
            const doSpawnSurge = Math.floor(Math.random() * 50) + 1;
            // the challenge!
            if(bird && bird.away) {
                bird = undefined;
            }
            if(!bird && doSpawnBird === 25) {
                bird = new Bird(birdImg, minigame, Math.round(Math.random()));
            } else if (bird) {
                bird.move();
            }
            setTimeout(spawnChallenge, 25);
        }
    }

})();