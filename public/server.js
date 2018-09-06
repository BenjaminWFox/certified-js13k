"use strict";

/**
 * User sessions
 * @param {Array} users
 */
const users = [];

/**
 * Games in progress
 * @param {Array} games
 */
const games = [];

/**
 * Job types
 * @param {Object} Jobs
 */
const Jobs = [
	{title: 'Line Worker', type: 'line', warning: 'Points frantically to the right!', reaction: 'jumping up'},
	{title: 'Ground Worker', type: 'ground', warning: 'Yells to watch out for the power surge!', reaction: 'stepping forward'},
];

/**
 * Hazard types
 * @param {Object} Hazards
 */
const Hazards = [
	{type: 'surge', name: 'power surge', impacts: 'line', observedBy: 'ground'},
	{type: 'train', name: 'freight train', impacts: 'ground', observedBy: 'line'},
];


/**
 * Convert milliseconds to time string (mm:ss:mss).
 *
 * @return String
 */
Number.prototype.toTime = function() {
    var ms = this,
        // lm = ~(4 * !!isSec),  /* limit fraction */ /* This will be -1 (isSec:true) or -5. */
        fmt = new Date(ms).toISOString().slice(11, -1).split(/:/g);
    fmt.shift();
    var ssmm = fmt.pop().split('.');
    ssmm[1] = ssmm[1] >= 100 ? ssmm[1] / 10 : ssmm[1] / 10 + '0';
		fmt.push(ssmm[0]);
		fmt.push(ssmm[1]);
    return fmt.join(':');
};

/**
 * Find partner for a user
 * @param {User} user
 */
function findPartner(user) {
	for (let i = 0; i < users.length; i++) {
		if (
			user !== users[i] &&
			users[i].partner === null
		) {
			games.push(new Game(user, users[i]).init());
		}
	}
}

/**
 * Remove user session & game instance
 * @param {User} user
 */
function removeUser(user) {
	user.game.end();
	games.splice(games.indexOf(user.game), 1);
	users.splice(users.indexOf(user), 1);
}

// function cancelGame(game) {
// 	game.end();
// }

class Hazard {
	constructor(hazard) {
		this.type = hazard;
		this.spawnedAt = Date.now();
		this.reactionCutoff = 5000;
		this.warnedAt = undefined;
		this.reactedAt = undefined;
	}
}

/**
 * Game class
 */
class Game {

	/**
	 * @param {User} user1
	 * @param {User} user2
	 */
	constructor(user1, user2) {
		this.user1 = user1;
		this.user2 = user2;
		this.users = [this.user1, this.user2];
		this.startTime = Date.now();
		this.clockTotal = 60000;
		this.remainingTime = this.clockTotal;
		this.tickRate = 50;
		this.ticker = undefined;
		this.activeHazard = null;
		console.log('Constructed a new game. ST:', this.startTime);
	}

	/**
	 * Start new game
	 */
	init() {
		this.user1.start(this, this.user2, 1);
		this.user2.start(this, this.user1, 2);
		this.updateUserStatus();
		return this;
	}

	start() {
		this.ticker = this.ticker ? this.ticker : setInterval(this.tick.bind(this), this.tickRate);
		this.updateClients('gameon');
	}

	tick() {
		this.clockTotal -= this.tickRate;

		if(this.clockTotal <= 0) {
			clearInterval(this.ticker);
			this.timeUp();
		} else {
			this.runHazardSpawner();
			this.checkForHazardDeath();
		}
		this.remainingTime = (this.clockTotal).toTime();
		this.updateClients('tick', this.remainingTime);
	}

	runHazardSpawner() {
		const doSpawn = Math.floor(Math.random() * 100) + 1;
		if(doSpawn === 50 && !this.activeHazard) {
			this.activeHazard = new Hazard(Hazards[Math.round(Math.random())]);
			console.log('Spawning a hazard!', this.activeHazard.type.observedBy, this.activeHazard.type.impacts);
			this.users.forEach(user => {
				if(user.job.type === this.activeHazard.type.observedBy) {
					this.updateClient(user, 'hazard', this.activeHazard);
				}
			});
		}
	}

	checkForHazardDeath() {
		if(this.activeHazard) {
			if(this.activeHazard.spawnedAt + this.activeHazard.reactionCutoff < Date.now() && !this.activeHazard.reactedAt ||
				this.activeHazard.reactedAt && this.activeHazard.spawnedAt + this.activeHazard.reactionCutoff < this.activeHazard.reactedAt) {
				console.log('GAME OVER');
			}
		}
	}

	updateUserStatus() {
		if(this.user1.isReady && this.user2.isReady) {
			this.start();
		}
		this.updateClients('users', [this.user1.isReady, this.user2.isReady]);
	}

	updateClient(user, event, payload) {
		user.socket.emit(event, payload);
	}

	updateClients(event, payload) {
		this.users.forEach(user => {
			user.socket.emit(event, payload);
		});
	}

	sendMessageFromTo(msg, user, partner) {
		if(this.activeHazard) {
			if(msg.type === 'warning') {
				if(this.activeHazard.type.observedBy === user.job.type) {
					this.activeHazard.warnedAt = Date.now();
				}
			}
			if(msg.type === 'reaction') {
				if(this.activeHazard.type.impacts === user.job.type) {
					this.activeHazard.reactedAt = Date.now();
					if(this.activeHazard.reactedAt < this.activeHazard.spawnedAt + this.activeHazard.reactionCutoff) {
						console.log('NICE YOU AVOIDED IT');
						this.updateClients('avoided', '');
						this.activeHazard = null;
					}
				}
			}
		}
		partner.socket.emit('msg', msg);
	}

	timeUp() {
		console.log('TIME IS UP');
		// This is the win condition. If time is 0 players were successful.
	}

	spawnHazard() {

	}

	end() {
		console.log('Ending game', this.startTime);
		clearInterval(this.ticker);
	}

	/**
	 * Is game ended
	 * @return {boolean}
	 */
	ended() {
		// return this.user1.guess !== GUESS_NO && this.user2.guess !== GUESS_NO;
	}

	/**
	 * Final score
	 */
	score() {
		if(this.user1.guess === SENT_WARNING) {
			this.user1.warn(this.user1.warning);
		}
		if(this.user2.guess === SENT_WARNING) {
			this.user2.warn(this.user2.warning);
		}
	}

}

/**
 * User session class
 */
class User {

	/**
	 * @param {Socket} socket
	 */
	constructor(socket) {
		this.socket = socket;
		this.game = null;
		this.partner = null;
		this.isReady = false;
		this.id = 0;
		this.guess = GUESS_NO;
		this.warningMsg = 'Oh no!';
		this.reactGerund = 'pondering life';
		this.job = undefined;
		console.log('User constructed');
	}

	takeAction(action) {
		console.log('Taking action!');
		if(action === PLAYER_READY) {
			this.isReady = true;
			console.log('notify ready');
			this.game.updateUserStatus();
		}
		if(action === SENT_WARNING) {
			console.log('Sending a warning');
			this.game.sendMessageFromTo(this.warning(), this, this.partner);
		}
		if(action === REACTED_TO_WARNING) {
			console.log('Sending my reaction');
			this.game.sendMessageFromTo(this.reaction(), this, this.partner);
		}
	}

	getJob() {
		if(this.partner.job) {
			this.job = Jobs[~(Jobs.indexOf(this.partner.job)) + 2];
		} else {
			this.job = Jobs[Math.round(Math.random())];
		}
	}

	/**
	 * Start new game
	 * @param {Game} game
	 * @param {User} partner
	 */
	start(game, partner, id) {
		this.id = id;
		this.game = game;
		this.partner = partner;
		this.guess = GUESS_NO;
		this.isReady = false;
		this.getJob();
		this.socket.emit("start", {id, job: this.job});
	}

	/**
	 * Terminate game
	 */
	end() {
		this.game = null;
		this.partner = null;
		this.guess = GUESS_NO;
		this.socket.emit("end");
	}

	warning() {
		return({type: 'warning', message: this.job.warning.toString()});
	}

	reaction() {
		return({type: 'reaction', message: `I\'ve reacted to the warning by ${this.job.reaction}!`});
	}

	/**
	 * Trigger win event
	 */
	win() {
		this.socket.emit("win", this.partner.guess);
	}

	/**
	 * Trigger lose event
	 */
	lose() {
		this.socket.emit("lose", this.partner.guess);
	}

	/**
	 * Trigger draw event
	 */
	draw() {
		this.socket.emit("draw", this.partner.guess);
	}

}

/**
 * Socket.IO on connect event
 * @param {Socket} socket
 */
module.exports = {

	io: (socket) => {
		let user;
		// if(users.length % 2 ===0) {
		// 	user = new LineWorker(socket);
		// } else {
		// 	user = new GroundWorker(socket);
		// }
		user = new User(socket);
		// console.log({title: user.jobTitle, type: user.jobType});
		// user.socket.emit('job', {title: user.jobTitle, type: user.jobType})
		users.push(user);

		findPartner(user);

		socket.on("disconnect", () => {
			console.log("Disconnected: " + socket.id);
			removeUser(user);
			if (user.partner) {
				user.partner.end();
				findPartner(user.partner);
			}
		});

		socket.on("action", (action) => {
			console.log("Button pressed: " + socket.id, action);
			user.takeAction(action);
			// user.game.update(user, action);
			// if (user.setAction(action) && user.game.ended()) {
			// 	storage.get('games', 0).then(games => {
			// 		storage.set('games', games + 1);
			// 	});
			// }
		});

		console.log("Connected: " + socket.id);
	},

	stat: (req, res) => {
		storage.get('games', 0).then(games => {
			res.send(`<h1>Games played: ${games}</h1>`);
		});
	}
};