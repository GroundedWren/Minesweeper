/**
 * @file A gizmo to batch actions together
 * @author Vera Konigin vera@groundedwren.com
 * https://groundedwren.neocities.org
 */

window.GW = window.GW || {};
(function Gizmos(ns) {
	ns.ActionBatcher = class ActionBatcher {
		static #InstanceCount = 0;
		static #Logger = {};
		static { (function ActionBatcherLogger(ns) {
			const LogMessages = [];
			ns.LogLength = 50; // Maximum number of log messages retained at once

			/**
			 * Records a message in the log
			 * @param name Logger name
			 * @param message Logger message
			 */
			ns.log = function log(name, message) {
				LogMessages.unshift({
					Timestamp: new Date(),
					Name: name,
					Message: message
				});

				if(ActionBatcher.ConsoleLogging) {
					console.log(getMessageString(LogMessages[0]));
				}

				if(LogMessages.length > ns.LogLength) {
					LogMessages.pop();
				}
			}

			/**
			 * Writes the log to the console
			 * @param name Batcher to filter to (or none)
			 */
			ns.writeLog = function writeLog(name) {
				const pertinentMessages = name
					? LogMessages.filter(msgObj => msgObj.Name === name)
					: LogMessages;
				
				console.log(pertinentMessages.map(msgObj => getMessageString(msgObj)).join("\n"));
			};
			function getMessageString(msgObj) {
				const localeTimestamp = msgObj.Timestamp.toLocaleString(undefined, {
					hourCycle: "h23",
					year: "numeric",
					month: "numeric",
					day: "numeric",
					hour: "numeric",
					minute: "numeric",
					second: "numeric",
					fractionalSecondDigits: "3",
					timeZoneName: "short", 
				});
				return `${localeTimestamp} ; ${msgObj.Name} ; ${msgObj.Message}`;
			}
		})(ActionBatcher.#Logger); }

		/** Whether the logger immediately writes to the console */
		static ConsoleLogging = false;

		/**
		 * @param {number} value The number of log messages to keep
		 */
		static set LogLength(value) {
			this.#Logger.LogLength  = value;
		}

		/** Writes every ActionBatcher's log */
		static writeLog() {
			ActionBatcher.#Logger.writeLog();
		}

		Name; // The batcher's identifier

		#StagedActions = new Map();

		BatchPromise = Promise.resolve(); // A promsie which resolves when the staged actions run
		#BatchPromiseResolver = () => {};
		#FlushTimerRunning = false;

		#IsBlocked = false;

		/**
		 * Creates an ActionBatcher
		 * @param name The batcher's identifier
		 */
		constructor(name) {
			ActionBatcher.#InstanceCount++;
			this.Name = `ActionBatcher-${ActionBatcher.#InstanceCount}-${name || ""}`;
		}

		/**
		 * Stages an action but does not attempt to flush actions
		 * @param key Action identifier
		 * @param action Callback
		 */
		stage(key, action) {
			this.#log(`Action "${key}" ${this.#StagedActions.has(key) ? "re-" : ""}staged`);
			this.#StagedActions.set(key, action);
			this.BatchPromise = new Promise((resolve) => this.#BatchPromiseResolver = resolve);
		}

		/**
		 * Stages an action and attempts to flush actions after a 0ms timer
		 * @param key Action identifier
		 * @param action Callback
		 */
		run(key, action) {
			if(!key) {
				this.#log(`Argumentless run`);
				this.#startFlushTimer();
			}
			else {
				this.#log(`Run with action "${key}"`);
				this.stage(key, action);
				this.#startFlushTimer();
			}
		}

		#startFlushTimer() {
			if(!this.#StagedActions.size || this.#FlushTimerRunning) {
				return;
			}

			this.#log(`Starting flush timer`);
			this.#FlushTimerRunning = true;
			setTimeout(() => {
				this.#FlushTimerRunning = false;
				if(this.#IsBlocked) {
					this.#log(`Flush timer complete, but was blocked`);
				}
				else {
					this.#log(`Flush timer complete, not blocked`);
					this.#flushBatch();
				}
			}, 0);
		}

		#flushBatch() {
			this.#log(`Flushing batch of ${this.#StagedActions.size} actions`);
			this.#StagedActions.forEach((action, key) => {
				this.#log(`Executing "${key}"`);
				action();
			});
			this.#StagedActions.clear();

			this.#log(`Resolving batch promise with true`);
			this.#BatchPromiseResolver(true);
		}

		/**
		 * Blocks the batcher from executing (blocks do not stack)
		 * @param message Message for the log
		 */
		block(message) {
			this.#log(`Blocked (${this.#IsBlocked ? "was" : "was not"} blocked) ; ${message || "No message"}`);
			this.#IsBlocked = true;
		}

		/**
		 * Unblocks the batcher from executing (blocks do not stack) and attempts to flush the batch
		 * @param message Message for the log
		 */
		unblock(message) {
			this.#log(`Unblocked (${this.#IsBlocked ? "was" : "was not"} blocked) ; ${message || "No message"}`);
			this.#IsBlocked = false;

			this.#startFlushTimer();
		}

		/**
		 * Clears all staged actions without executing them
		 * @param message Message for the log
		 */
		clear(message) {
			this.#log(`Clearing batch of ${this.#StagedActions.size} actions ; ${message || "No message"}`);
			this.#StagedActions.clear();

			this.#log(`Resolving batch promise with false`);
			this.#BatchPromiseResolver();
		}

		#log(message) {
			ActionBatcher.#Logger.log(this.Name, message);
		}

		/** Writes the batcher's log to the console */
		writeLog() {
			ActionBatcher.#Logger.writeLog(this.Name);
		}
	}
}) (window.GW.Gizmos = window.GW.Gizmos || {});