"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { IBar } from 'magikcraft-lore-ui-bar/dst';
// import * as log from './old/util/log';
var Bar = require("./Bar");
var Utils_1 = require("./Utils");
var Food_1 = require("./Food");
// import * as uuid from 'uuid';
var magik = magikcraft.io;
var log = magik.dixit;
var INSULIN_BAR_KEY = 'mct1.bar.insulin';
var BGL_BAR_KEY = 'mct1.bar.BGL';
var DIGESTION_BAR_KEY = 'mct1.bar.digestiom';
var Player = {
    name: magik.getSender().getName(),
    player: magik.getSender(),
    insulin: magik.playerMap.get('insulin') || 0,
    BGL: magik.playerMap.get('BGL') || 4,
    init: function () {
        this.clearInventory();
        this.setupInventory();
        this.setFood(10);
        this.doDigestion();
        this.renderBars();
        magik.Events.on('PlayerItemConsumeEvent', this._onConsume);
    },
    setFood: function (num) {
        this.player.setFoodLevel(num);
    },
    setHealth: function (num) {
        this.player.setHealth(num);
    },
    setInsulin: function (num) {
        if (num === void 0) { num = 0; }
        this.insulin = num;
        magik.playerMap.put('insulin', this.insulin);
    },
    setBGL: function (num) {
        if (num === void 0) { num = 0; }
        this.BGL = num;
        magik.playerMap.put('BGL', this.BGL);
    },
    renderBars: function () {
        // BGLBar
        var color = 'GREEN';
        if (this.BGL >= 4 && this.BGL <= 8) {
            color = 'GREEN';
        }
        else if ((this.BGL < 4 && this.BGL >= 2) || (this.BGL > 8 && this.BGL <= 10)) {
            color = 'ORANGE';
        }
        else {
            color = 'RED';
        }
        var BGLBar = Bar.bar()
            .text("BGL: " + this.insulin)
            .color(Bar.color[color])
            .style(Bar.style.NOTCHED_20)
            .progress((this.BGL / 20) * 100)
            .show();
        if (magik.playerMap.containsKey(BGL_BAR_KEY))
            magik.playerMap.get(BGL_BAR_KEY).destroy();
        magik.playerMap.put(BGL_BAR_KEY, BGLBar);
        // insulinBar
        var insulinBar = Bar.bar()
            .text("Insulin: " + this.insulin)
            .color(Bar.color.BLUE)
            .style(Bar.style.NOTCHED_20)
            .progress((this.BGL / 20) * 100)
            .show();
        if (magik.playerMap.containsKey(INSULIN_BAR_KEY))
            magik.playerMap.get(INSULIN_BAR_KEY).destroy();
        magik.playerMap.put(INSULIN_BAR_KEY, insulinBar);
        var digestionQueue = magik.playerMap.get('digestionQueue') || [];
        var digestionItems = digestionQueue.slice(0, 3);
        log('digestionItems.length: ' + digestionItems.length);
        digestionItems.map(function (item) {
            // digestionBar
            var digestionBar = Bar.bar()
                .text("Digesting: " + item.type)
                .color(Bar.color.RED)
                .style(Bar.style.NOTCHED_20)
                .progress(item.percentDigested)
                .show();
            var barKey = DIGESTION_BAR_KEY + "." + item.uuid;
            if (magik.playerMap.containsKey(barKey))
                magik.playerMap.get(barKey).destroy();
            magik.playerMap.put(barKey, digestionBar);
        });
    },
    doDigestion: function () {
        log('digesting...');
        var that = this;
        magik.setTimeout(function () {
            var digestionQueue = magik.playerMap.get('digestionQueue') || [];
            log('digestionQueue: ' + JSON.stringify(digestionQueue));
            if (digestionQueue[0]) {
                digestionQueue[0].percentDigested += 20;
                if (digestionQueue[0].percentDigested >= 100) {
                    // finished digesting, remove from queue...
                    digestionQueue.splice(0, 1);
                    magik.playerMap.put('digestionQueue', digestionQueue);
                }
                that.renderBars();
            }
            // repeat!
            log('repeat doDigestion');
            that.doDigestion();
        }, 3000);
    },
    _onConsume: function (event) {
        log('onConsume');
        var type = event.getItem().getType();
        // const amount = event.getItem().getAmount();
        if (Food_1.default[type]) {
            log("You consumed a " + type + "!");
            var digestionQueueItem = {
                uuid: Utils_1.default.makeTimestamp(),
                type: type,
                percentDigested: 0,
            };
            var digestionQueue = magik.playerMap.get('digestionQueue') || [];
            digestionQueue.push(digestionQueueItem);
            magik.playerMap.put('digestionQueue', digestionQueue);
            log('digestionQueue: (1) ' + JSON.stringify(digestionQueue));
            this.renderBars();
            // event.setCancelled(true);
        }
    },
    getInventory: function () {
        var inventory = this.player.getInventory(); //Contents of player inventory
        for (var i = 0; i <= 35; i++) {
            var item = inventory['getItem'](i);
            if (item) {
                var type = item.getType();
                var amount = item.getAmount();
                log('i: ' + i);
                log('type: ' + type);
                log('amount: ' + amount);
            }
        }
    },
    setupInventory: function () {
        var _this = this;
        var items = [
            { type: 'CAKE', amount: 2 },
            { type: 'APPLE', amount: 10 },
            { type: 'BREAD', amount: 5 },
            { type: 'COOKED_FISH', amount: 5 },
        ];
        var server = magik.getPlugin().getServer();
        items.map(function (item) {
            server.dispatchCommand(server.getConsoleSender(), "give " + _this.name + " " + item.type + " " + item.amount);
            magik.dixit("server.dispatchCommand(give " + _this.name + " " + item.type + " " + item.amount + ")");
        });
    },
    clearInventory: function () {
        this.player.getInventory().clear();
    },
};
// const playerName = magik.getSender().getName();
// const Player = new PlayerClass(playerName);
exports.default = Player;
