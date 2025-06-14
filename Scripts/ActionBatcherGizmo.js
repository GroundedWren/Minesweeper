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

		#Listeners = new Map();
		
		IntervalMs = 0; // Action delay in milliseconds
		RequireLull = true; // Whether batches wait an interval of no new actions to flush
		#FlushTimer = null;
		#IsBlocked = false;

		/**
		 * Creates an ActionBatcher
		 * @param {String} name The batcher's identifier
		 * @param {Number} intervalMs Action delay in milliseconds
		 * @param {Boolean} requireLull Whether batches wait an interval of no new actions to flush (default true)
		 */
		constructor(name, intervalMs, requireLull) {
			ActionBatcher.#InstanceCount++;
			this.Name = `ActionBatcher-${ActionBatcher.#InstanceCount}-${name || ""}`;
			this.IntervalMs = intervalMs || 0;
			if(requireLull !== undefined) {
				this.RequireLull = requireLull;
			}
		}

		/**
		 * Stages an action and attempts to flush actions after a timer
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

		#startFlushTimer() {
			if(this.#FlushTimer) {
				if(this.RequireLull) {
					clearTimeout(this.#FlushTimer);
					this.#FlushTimer = null;
					this.#log(`Restarting ${this.IntervalMs}ms flush timer`);
				}
				else {
					this.#log(`Deferring for running timer`);
					return;
				}
			}
			else {
				this.#log(`Starting ${this.IntervalMs}ms flush timer`);
			}

			this.#FlushTimer = setTimeout(() => {
				this.#FlushTimer = null;
				if(this.#IsBlocked) {
					this.#log(`Flush timer complete, but was blocked`);
				}
				else {
					this.#log(`Flush timer complete, not blocked`);
					this.#flushBatch();
				}
			}, this.IntervalMs);
		}

		#flushBatch() {
			this.#log(`Flushing batch of ${this.#StagedActions.size} actions`);
			this.#StagedActions.forEach((action, key) => {
				this.#log(`Executing "${key}"`);
				action();
			});
			this.#StagedActions.clear();

			this.#Listeners.forEach((delegate, key) => {
				this.#log(`Invoking listener: "${key}"`);
				delegate();
			});

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
		 * Adds a listener to be invoked when a batch is flushed
		 * @param {String} key A unique identifier
		 * @param {Function} delegate A callback function
		 */
		addListener(key, delegate) {
			this.#Listeners.set(key, delegate);
			this.#log(`Added a listener: "${key}"`);
		}

		/**
		 * Deletes a listener
		 * @param {String} key A unique identifier
		 */
		removeListener(key) {
			this.#Listeners.delete(key);
			this.#log(`Removed a listener: "${key}"`);
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