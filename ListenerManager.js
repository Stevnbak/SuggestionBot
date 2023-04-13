const ListenerManager = function (client) {
    this.callbacks = {};

    this.client = client;

    this.on = (event, callback) => {
        const id = event.toLowerCase();
        if (!this.callbacks[id]) {
            this.callbacks[id] = {
                once: [],
                on: [],
            };
            this.client.on(event, (...args) => {
                for (const cb of this.callbacks[id].on) cb.apply(null, args);
                while (this.callbacks[id].once.length > 0) {
                    this.callbacks[id].once[0].apply(null, args);
                    this.callbacks[id].once.splice(0, 1);
                }
            });
        }
        this.callbacks[id].on.push(callback);
    };

    this.once = (event, callback) => {
        const id = event.toLowerCase();
        if (!this.callbacks[id]) {
            this.callbacks[id] = {
                once: [],
                on: [],
            };
            this.client.on(event, (...args) => {
                for (const cb of this.callbacks[id].on) cb.apply(null, args);
                while (this.callbacks[id].once.length > 0) {
                    this.callbacks[id].once[0].apply(null, args);
                    this.callbacks[id].once.splice(0, 1);
                }
            });
        }
        this.callbacks[id].once.push(callback);
    };
};

module.exports = ListenerManager;
