"use strict";

/**
 * User sessions
 * @param {Array} users
 */
const users = [];

		/**
		 * Convert (milli)seconds to time string (hh:mm:ss[:mss]).
		 *
		 * @param Boolean isSec
		 *
		 * @return String
		 */
		Number.prototype.toTime = function(isSec) {
		    var ms = isSec ? this * 1e3 : this,
		        lm = ~(4 * !!isSec),  /* limit fraction */
		        fmt = new Date(ms).toISOString().slice(11, lm).split(/:/g);
        fmt.shift();
		    var ssmm = fmt.pop().split('.');
		    ssmm[1] = ssmm[1] >= 100 ? ssmm[1] / 10 : ssmm[1] / 10 + '0';
				fmt.push(ssmm[0]);
				fmt.push(ssmm[1]);
		    return fmt.join(':');
		};

/**
 * Find opponent for a user
 * @param {User} user
 */
function findOpponent(user) {
	for (let i = 0; i < users.length; i++) {
		if (
			user !== users[i] &&
			users[i].opponent === null
		) {
			new Game(user, users[i]).start();
		}
	}
}

/**
 * Remove user session
 * @param {User} user
 */
function removeUser(user) {
	users.splice(users.indexOf(user), 1);
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
		this.startTime = Date.now();
		this.clockTotal = 120000;
		this.remainingTime = this.clockTotal;
		this.tickRate = 50;
		this.ticker = undefined;
	}

	/**
	 * Start new game
	 */
	start() {
		this.user1.start(this, this.user2);
		this.user2.start(this, this.user1);
		console.log('Start:', this.tickRate, this.clockTotal);
		this.ticker = setInterval(this.tick.bind(this), this.tickRate);
	}

	tick() {
		// console.log(this.tickRate, this.clockTotal);
		this.clockTotal -= this.tickRate;
		this.remainingTime = (this.clockTotal).toTime();
		console.log(this.remainingTime);
		// this.socket.emit("tick", this.remainingTime);

	}

	/**
	 * Is game ended
	 * @return {boolean}
	 */
	ended() {
		return this.user1.guess !== GUESS_NO && this.user2.guess !== GUESS_NO;
	}

	/**
	 * Final score
	 */
	score() {
		if (
			this.user1.guess === GUESS_ROCK && this.user2.guess === GUESS_SCISSORS ||
			this.user1.guess === GUESS_PAPER && this.user2.guess === GUESS_ROCK ||
			this.user1.guess === GUESS_SCISSORS && this.user2.guess === GUESS_PAPER
		) {
			this.user1.win();
			this.user2.lose();
		} else if (
			this.user2.guess === GUESS_ROCK && this.user1.guess === GUESS_SCISSORS ||
			this.user2.guess === GUESS_PAPER && this.user1.guess === GUESS_ROCK ||
			this.user2.guess === GUESS_SCISSORS && this.user1.guess === GUESS_PAPER
		) {
			this.user2.win();
			this.user1.lose();
		} else {
			this.user1.draw();
			this.user2.draw();
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
		this.opponent = null;
		this.guess = GUESS_NO;
	}

	/**
	 * Set guess value
	 * @param {number} guess
	 */
	setGuess(guess) {
		if (
			!this.opponent ||
			guess <= GUESS_NO ||
			guess > GUESS_SCISSORS
		) {
			return false;
		}
		this.guess = guess;
		return true;
	}

	/**
	 * Start new game
	 * @param {Game} game
	 * @param {User} opponent
	 */
	start(game, opponent) {
		this.game = game;
		this.opponent = opponent;
		this.guess = GUESS_NO;
		this.socket.emit("start");
	}

	/**
	 * Terminate game
	 */
	end() {
		this.game = null;
		this.opponent = null;
		this.guess = GUESS_NO;
		this.socket.emit("end");
	}

	/**
	 * Trigger win event
	 */
	win() {
		this.socket.emit("win", this.opponent.guess);
	}

	/**
	 * Trigger lose event
	 */
	lose() {
		this.socket.emit("lose", this.opponent.guess);
	}

	/**
	 * Trigger draw event
	 */
	draw() {
		this.socket.emit("draw", this.opponent.guess);
	}

}

/**
 * Socket.IO on connect event
 * @param {Socket} socket
 */
module.exports = {

	io: (socket) => {
		const user = new User(socket);
		users.push(user);
		findOpponent(user);

		socket.on("disconnect", () => {
			console.log("Disconnected: " + socket.id);
			removeUser(user);
			if (user.opponent) {
				user.opponent.end();
				findOpponent(user.opponent);
			}
		});

		socket.on("guess", (guess) => {
			console.log("Guess: " + socket.id);
			if (user.setGuess(guess) && user.game.ended()) {
				user.game.score();
				user.game.start();
				storage.get('games', 0).then(games => {
					storage.set('games', games + 1);
				});
			}
		});

		console.log("Connected: " + socket.id);
	},

	stat: (req, res) => {
		storage.get('games', 0).then(games => {
			res.send(`<h1>Games played: ${games}</h1>`);
		});
	}
};