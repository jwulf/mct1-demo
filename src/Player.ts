import * as Bar from './Bar';
import Utils from './Utils';
import { getState, setState } from './State';
import Events from './Events';

// Read the file, and pass it to your callback

const magik = magikcraft.io;
const log = magik.dixit;

const player = magik.getSender();

import FoodList from './FoodList';
const Food:any = {};
FoodList.forEach(item => Food[item.type] = item);

// TODO:
// * Use XP bar for lightning
// * BGL going down due to insulin = get health
// * See in dark when in range
// * high GI go top top of queue, digest faster, effect BGL positively, even if insulin in system
// * low GI, digest slower, BGL still goes down in Insulin in system

const Player = {
	init(isUSA = false) {
		this.destroyBars();
		this._init(isUSA);
		player.setFoodLevel(4);
	},

	doCountdown(countdown = 10) {
		magik.setTimeout(() => {
			countdown--;
			if (countdown > 0) {
				log('' + countdown);
				this.doCountdown(countdown);
			}
			else {
				this.lightningStruck(); // !!!!!
			}
		}, 1000);
	},

	lightningStruck(distance = 10) {
		magik.setTimeout(() => {
			const loc = player.getLocation();
			const locations = [
				`${loc.getX()+distance} ${loc.getY()} ${loc.getZ()+distance}`,
                `${loc.getX()-distance} ${loc.getY()} ${loc.getZ()+distance}`,
                `${loc.getX()+distance} ${loc.getY()} ${loc.getZ()-distance}`,
                `${loc.getX()-distance} ${loc.getY()} ${loc.getZ()-distance}`,
                `${loc.getX()+distance} ${loc.getY()} ${loc.getZ()}`,
                `${loc.getX()-distance} ${loc.getY()} ${loc.getZ()}`,
                `${loc.getX()} ${loc.getY()} ${loc.getZ()+distance}`,
                `${loc.getX()} ${loc.getY()} ${loc.getZ()-distance}`,
			];
			locations.forEach(location => {
				const server = magik.getPlugin().getServer();
				const cmd = `execute ${player.getName()} ~ ~ ~ summon LIGHTNING_BOLT ${location}`;
				server.dispatchCommand(server.getConsoleSender(), cmd);
			});

			if (distance > 0) {
				distance--;
				this.lightningStruck(distance) // !!!!
			}
			else {
				this.init();
				log('warping in 10 secs...');
				magik.setTimeout(() => {
					log('Welcome to the MCT1 Training Facitiy!');
					// const server = magik.getPlugin().getServer();
					// const cmd = `execute ${player.getName()} ~ ~ ~ warp training`;
					player['performCommand']('warp training');
				}, 10000);
			}
		}, (100));
	},

	graduationFireworks(times = 10) {
		magik.setTimeout(() => {
			const coords = [
				{ x: 840, y: 132, z: 1092 },
				{ x: 855, y: 132, z: 1056 },
				{ x: 881, y: 132, z: 1061 },
				{ x: 896, y: 132, z: 1073 },
				{ x: 906, y: 132, z: 1093 },
				{ x: 895, y: 132, z: 1115 },
				{ x: 874, y: 132, z: 1125 },
				{ x: 854, y: 132, z: 1118 },
			];

			coords.forEach(coord => {
				const location = `${coord.x} ${coord.y} ${coord.z}`;
				const server = magik.getPlugin().getServer();
				const cmd = `execute ${player.getName()} ~ ~ ~ summon minecraft:fireworks_rocket ${location} {LifeTime:20,FireworksItem:{id:fireworks,Count:1,tag:{Fireworks:{Explosions:[{Type:2,Flicker:1,Trail:0,Colors:[16719647],FadeColors:[9437112]},{Type:0,Flicker:1,Trail:1,Colors:[15335199],FadeColors:[4472319]},{Type:3,Flicker:1,Trail:0,Colors:[5046064],FadeColors:[16764879]},{Type:4,Flicker:0,Trail:1,Colors:[3342591],FadeColors:[16777105]}]}}}}`;
				server.dispatchCommand(server.getConsoleSender(), cmd);
			});
			times--;
			if (times > 0) {
				this.graduationFireworks(times);
			}
		}, (1000));
	},

	_init(isUSA = false) {
		let state = getState();
		state.isUSA = isUSA;
		setState(state);

		// Start digestion if not already started.
		if (!state.digesting) {
			this.doDigestion();
			state.digesting = true;
			setState(state);
			// log('digesting!');
		}

		// Start listening if not already started.
		if (!state.listening) {
			// log('listening!');
			this.enableEventListeners();
			state.listening = true;
			setState(state);
		}

		this.cancelNegativeEffects();
		this.cancelSuperPowers();
		this.refreshInventory();
		this.renderBars();
	},

	enableEventListeners() {
		let state = getState();
		Events.registerAll();
		
		// ProjectileHitEvent
		let projectileHitCounter = 0;
		Events.on('ProjectileHitEvent', (event) => { 
			projectileHitCounter++;
			
			let state = getState();	
			// Identify shooter. Skip if not player.
			const shooter = event.getEntity().getShooter();
			if (!shooter || shooter.getName() !== player.getName()) {
				return;
			}
			// Get loc
			let loc:any = null;
			if (event.getHitEntity()) {
				loc = event.getHitEntity().getLocation();
			} else if (event.getHitBlock()) {
				loc = event.getHitBlock().getLocation();
			}
			// Skip if could not find loc.
			if (!loc) return;
			// Summon lightning_bolt at location.
			const location = `${loc.getX()} ${loc.getY()+1} ${loc.getZ()}`;
			const server = magik.getPlugin().getServer();
			// const cmd = `execute ${player.getName()} ~ ~ ~ summon CHICKEN ${location}`;
			const cmd = `execute ${player.getName()} ~ ~ ~ summon LIGHTNING_BOLT ${location}`;
			server.dispatchCommand(server.getConsoleSender(), cmd);

			// Food or Health cost...
			if (projectileHitCounter % 5 === 0) { // Every 3 hits...
				if (player.getFoodLevel() > 0) {
					player.setFoodLevel(Math.max(player.getFoodLevel()-1, 0));
				}
			}
		});

		// PlayerItemConsumeEvent
		Events.on('PlayerItemConsumeEvent', (event) => { 
			let state = getState();
			// Identify consumer. Skip if not player.
			const consumer = event.getPlayer();
			if (consumer.getName() != player.getName()) {
				return;
			}

			let coords:any = [];
			const Material = Java.type("org.bukkit.Material");
			const Location = Java.type('org.bukkit.Location');

			// Act on know FOOD eat...
			const type = event.getItem().getType();
			if (Food[type]) {
				log(`You ate a ${type}!`);
				const item = {
					timestamp: Utils.makeTimestamp(),
					food: Food[type],
					carbsDigested: 0,
				};
				state.digestionQueue.push(item);
				setState(state);
				this.renderBars();

				// ########
				if (state.inRegion == 'training-1') {
					
					log('Great, now move on to the next training chamber!');

					coords = [
						// front door
						{ x: 926, y: 95, z: 1116 },
						{ x: 926, y: 95, z: 1115 },
						{ x: 926, y: 95, z: 1114 },
						{ x: 926, y: 96, z: 1116 },
						{ x: 926, y: 96, z: 1115 },
						{ x: 926, y: 96, z: 1114 },
						{ x: 926, y: 97, z: 1116 },
						{ x: 926, y: 97, z: 1115 },
						{ x: 926, y: 97, z: 1114 },
					];
					coords.forEach(coord => {
						const loc = new Location(player.getWorld(), coord.x, coord.y, coord.z);
						loc.getBlock().setType(Material.AIR);
					});
				}
				// ########
			}
			// Act on POTION drink... (insulin)
			else if (type == 'POTION') { // important! use double arrow (not triple)
				log(`You drank an INSULIN POTION!`);
				state.insulin += 2;
				setState(state);
				this.renderBars();

				// ########
				if (state.inRegion == 'training-2') {
					
					log('Great, now move on to the next training chamber!');

					coords = [
						// forward door
						{ x: 940, y: 94, z: 1116 },
						{ x: 940, y: 94, z: 1117 },
						{ x: 940, y: 94, z: 1118 },
						{ x: 940, y: 95, z: 1116 },
						{ x: 940, y: 95, z: 1117 },
						{ x: 940, y: 95, z: 1118 },
						{ x: 940, y: 96, z: 1116 },
						{ x: 940, y: 96, z: 1117 },
						{ x: 940, y: 96, z: 1118 },
					];
					coords.forEach(coord => {
						const loc = new Location(player.getWorld(), coord.x, coord.y, coord.z);
						loc.getBlock().setType(Material.AIR);
					});
				}
				// ########
			}
		});

		// PlayerDeathEvent
		Events.on('PlayerDeathEvent', (event) => {
			// Skip if not this player.
			log('PlayerDeathEvent');
			if (event.getEntity().getName() != player.getName()) {
				return;
			}

			const server = magik.getPlugin().getServer();
			const cmd = `execute ${player.getName()} ~ ~ ~ spawnpoint ${player.getName()}`;
			server.dispatchCommand(server.getConsoleSender(), cmd);

			let state = getState();
			state.dead = true;
			setState(state);
		});

		// PlayerRespawnEvent
		Events.on('PlayerRespawnEvent', (event) => {
			// Skip if not this player.
			if (event.getPlayer().getName() != player.getName()) {
				return;
			}
			// log('PlayerRespawnEvent: ' + event.getRespawnLocation())
			let state = getState();
			state.dead = false;
			setState(state);
			
			// Re-init
			this._init();
		});

		// EntityDamageEvent
		Events.on('EntityDamageEvent', (event) => {
			// Cancel lightning and fire damage for player.
			const entityType = event.getEntityType();
			const cause = event.getCause();

			if (entityType == 'PLAYER') {
				// Skip if not this player.
				if (event.getEntity().getName() != player.getName()) {
					return;
				}
				// LIGHTNING, FIRE, FIRE_TICK 
				if (cause == 'LIGHTNING' || cause == 'FIRE' || cause == 'FIRE_TICK') {
					// magik.dixit('set LIGHTNING damage to 0 for ' + event.getEntity().getName());
					event.setDamage(0);
					event.setCancelled(true);
				}
				// STARVATION
				if (cause == 'STARVATION') {
					magik.dixit('You are starving! Eat food now!');
				}
				// FALL, ENTITY_ATTACK
			}
			if (entityType == 'WITHER' && cause == 'PROJECTILE') {
				event.setDamage(10);
			}
		});
		
		// PlayerQuitEvent
		Events.on('PlayerQuitEvent', (event) => {
			// Skip if not this player.
			if (event.getPlayer().getName() != player.getName()) {
				return;
			}		
			player.setFoodLevel(15);
			player['setHealth'](20);
			this.cancelNegativeEffects();
			this.cancelSuperPowers();
			setState({})
			Events.unregisterAll();
		});
		
		// RegionEnterEvent
		Events.on('RegionEnterEvent', (event) => {
			if (event.getPlayer().getName() != player.getName()) {
				return;
			}

			const regionName = event.getRegion().getId();
			const world = event.getPlayer().getWorld();

			let state = getState();
			state.inRegion = regionName;
			setState(state);

			let coords:any = [];
			const Material = Java.type("org.bukkit.Material");
			const Location = Java.type('org.bukkit.Location');

			switch (regionName) {
				case 'training-1':
					// Set food and BGL

					state.bgl = 6;
					setState(state);
					player.setFoodLevel(1);

					coords = [
						// front door
						{ x: 926, y: 95, z: 1116 },
						{ x: 926, y: 95, z: 1115 },
						{ x: 926, y: 95, z: 1114 },
						{ x: 926, y: 96, z: 1116 },
						{ x: 926, y: 96, z: 1115 },
						{ x: 926, y: 96, z: 1114 },
						{ x: 926, y: 97, z: 1116 },
						{ x: 926, y: 97, z: 1115 },
						{ x: 926, y: 97, z: 1114 },
						// behind door
						{ x: 910, y: 95, z: 1113 },
						{ x: 910, y: 95, z: 1114 },
						{ x: 910, y: 95, z: 1115 },
						{ x: 910, y: 96, z: 1113 },
						{ x: 910, y: 96, z: 1114 },
						{ x: 910, y: 96, z: 1115 },
						{ x: 910, y: 97, z: 1113 },
						{ x: 910, y: 97, z: 1114 },
						{ x: 910, y: 97, z: 1115 },
					];
					coords.forEach(coord => {
						const loc = new Location(player.getWorld(), coord.x, coord.y, coord.z);
						loc.getBlock().setType(Material.GLASS);
					});
					break;
				case 'training-2':
					// Set Insulin
					// state.insulin = 4;
					// setState(state);

					coords = [
						// forward door
						{ x: 940, y: 94, z: 1116 },
						{ x: 940, y: 94, z: 1117 },
						{ x: 940, y: 94, z: 1118 },
						{ x: 940, y: 95, z: 1116 },
						{ x: 940, y: 95, z: 1117 },
						{ x: 940, y: 95, z: 1118 },
						{ x: 940, y: 96, z: 1116 },
						{ x: 940, y: 96, z: 1117 },
						{ x: 940, y: 96, z: 1118 },
						// behind door
						{ x: 926, y: 95, z: 1116 },
						{ x: 926, y: 95, z: 1115 },
						{ x: 926, y: 95, z: 1114 },
						{ x: 926, y: 96, z: 1116 },
						{ x: 926, y: 96, z: 1115 },
						{ x: 926, y: 96, z: 1114 },
						{ x: 926, y: 97, z: 1116 },
						{ x: 926, y: 97, z: 1115 },
						{ x: 926, y: 97, z: 1114 },
					];
					coords.forEach(coord => {
						const loc = new Location(player.getWorld(), coord.x, coord.y, coord.z);
						loc.getBlock().setType(Material.GLASS);
					});
					break;
				case 'tower-top':
					// fireworks coords.
					this.graduationFireworks();
					break;
			}
		});

		// RegionLeaveEvent
		Events.on('RegionLeaveEvent', (event) => {
			if (event.getPlayer().getName() != player.getName()) {
				return;
			}

			let coords:any = [];
			const Material = Java.type("org.bukkit.Material");
			const Location = Java.type('org.bukkit.Location');
			const regionName = event.getRegion().getId();
			const world = event.getPlayer().getWorld();

			let state = getState();
			state.inRegion = null;
			setState(state);
			
			switch (regionName) {
				case 'training-1':
					coords = [
						// front door
						{ x: 926, y: 95, z: 1116 },
						{ x: 926, y: 95, z: 1115 },
						{ x: 926, y: 95, z: 1114 },
						{ x: 926, y: 96, z: 1116 },
						{ x: 926, y: 96, z: 1115 },
						{ x: 926, y: 96, z: 1114 },
						{ x: 926, y: 97, z: 1116 },
						{ x: 926, y: 97, z: 1115 },
						{ x: 926, y: 97, z: 1114 },
						// behind door
						{ x: 910, y: 95, z: 1113 },
						{ x: 910, y: 95, z: 1114 },
						{ x: 910, y: 95, z: 1115 },
						{ x: 910, y: 96, z: 1113 },
						{ x: 910, y: 96, z: 1114 },
						{ x: 910, y: 96, z: 1115 },
						{ x: 910, y: 97, z: 1113 },
						{ x: 910, y: 97, z: 1114 },
						{ x: 910, y: 97, z: 1115 },
					];
					coords.forEach(coord => {
						const loc = new Location(player.getWorld(), coord.x, coord.y, coord.z);
						loc.getBlock().setType(Material.AIR);
					});
					break;
				case 'training-2':
					coords = [
						// forward door
						{ x: 940, y: 94, z: 1116 },
						{ x: 940, y: 94, z: 1117 },
						{ x: 940, y: 94, z: 1118 },
						{ x: 940, y: 95, z: 1116 },
						{ x: 940, y: 95, z: 1117 },
						{ x: 940, y: 95, z: 1118 },
						{ x: 940, y: 96, z: 1116 },
						{ x: 940, y: 96, z: 1117 },
						{ x: 940, y: 96, z: 1118 },
						// behind door
						{ x: 926, y: 95, z: 1116 },
						{ x: 926, y: 95, z: 1115 },
						{ x: 926, y: 95, z: 1114 },
						{ x: 926, y: 96, z: 1116 },
						{ x: 926, y: 96, z: 1115 },
						{ x: 926, y: 96, z: 1114 },
						{ x: 926, y: 97, z: 1116 },
						{ x: 926, y: 97, z: 1115 },
						{ x: 926, y: 97, z: 1114 },
					];
					coords.forEach(coord => {
						const loc = new Location(player.getWorld(), coord.x, coord.y, coord.z);
						loc.getBlock().setType(Material.AIR);
					});
					break;
			}
		});
	},

	destroyBars() {
		let state = getState();
		if (state.bglBar) state.bglBar.destroy();
		if (state.insulinBar) state.insulinBar.destroy();
		if (state.digestionBar0) state.digestionBar0.destroy();
		if (state.digestionBar1) state.digestionBar1.destroy();
		state.bglBar = null;
		state.insulinBar = null;
		state.digestionBar0 = null;
		state.digestionBar1 = null;
		setState(state);
	},

	renderBars() {
		// First, clear all bars.... 
		this.destroyBars();

		let state = getState();
		// Minecraft supports upto 4 bars onscreen at once.

		// bglBar color
		let color  = 'GREEN';
		if (state.bgl >= 4 && state.bgl <= 8) {
			color = 'GREEN';
		} else if ((state.bgl < 4 && state.bgl >= 2) || (state.bgl > 8 && state.bgl <= 12)) {
			color = 'YELLOW';
		} else {
			color = 'RED';
		}
		// bglBar
		let bgl = Math.round(state.bgl*10)/10;
		if (state.isUSA) bgl = Math.round(bgl*18);
		state.bglBar = Bar.bar()
			.text(`BGL: ${bgl}`) // round to 1 decimal
			.color(Bar.color[color])
			.style(Bar.style.NOTCHED_20)
			.progress((state.bgl/20)*100)
			.show();

		// insulinBar
		state.insulinBar = Bar.bar()
			.text(`Insulin: ${Math.round(state.insulin*10)/10}`) // round to 1 decimal
			.color(Bar.color.BLUE)
			.style(Bar.style.NOTCHED_20)
			.progress((state.insulin/20)*100) // insulin as percentage, rounded to 1 decimal
			.show();

		// digestionBar(s)
		state.digestionQueue.slice(0, 2).map((item, i) => {
			// const food = Food[item.type];
			const percentDigested = (item.carbsDigested / item.food.carbs) * 100;
			
			state[`digestionBar${i}`] = Bar.bar()
				.text(`Digesting: ${item.food.type} (${item.food.carbs} carbs) (${item.food.GI} GI)`)
				.color((item.food.GI === 'high') ? Bar.color.PINK : Bar.color.PURPLE)
				.style(Bar.style.NOTCHED_20)
				.progress(100 - percentDigested)
				.show();
		});

		// SetState
		setState(state);
	},

	doDigestion(tickCount = 0) {
		let state = getState();
		const that = this;
		magik.setTimeout(function() {
			// Skip if dead!
			if (state.dead) {
				// log('skip digestion coz dead!');
				that.doDigestion(tickCount);
				return;
			}
			
			

			// Every 10 ticks...
			if (tickCount % 10 === 0) {
				// Refresh Inventory
				that.refreshInventory();

				// bgl rises slowly, even if not digesting...
				state.bgl += 0.1;
				
				// If player has food in digestionQueue, up foodlevel
				if (state.digestionQueue && state.digestionQueue.length > 0) {
					player.setFoodLevel(Math.max((player.getFoodLevel()+1), 0));
				}
				// No food in digestionQueue, reduce food level.
				else {
					player.setFoodLevel(Math.max((player.getFoodLevel()-1), 0));
				}
			}

			// handle insulin in system
			if (state.insulin > 0) {
				state.insulin -= 0.1;
				state.bgl -= 0.15;
			}

			// handle digestionQueue
			if (state.digestionQueue[0]) {
				if (state.digestionQueue[0].food.GI === 'high') {
					// high GI, digest faster...
					state.digestionQueue[0].carbsDigested += 1;
					state.bgl += 0.2;	
				} else { 
					// low GI, digest slower...
					state.digestionQueue[0].carbsDigested += 0.5;
					state.bgl += 0.1;
				}
				
				if (state.insulin > 0) { // if insulin in system, boost health!
					if (player['getHealth']() < 20) {
						player['setHealth'](Math.min((player['getHealth']()+0.5), 20))
					}
				}
				if (state.digestionQueue[0].carbsDigested >= state.digestionQueue[0].food.carbs) {
					// finished digesting... remove from queue...
					state.digestionQueue.splice(0,1);
				}
			}

			// bgl should never go below 2!
			if (state.bgl < 2) {
				state.bgl = 2;
			}
			// bgl should never go above 20!
			if (state.bgl > 20) {
				state.bgl = 20;
			}

			setState(state);
			that.renderBars();
			that.doEffects();

			// Never allow player to be full!
			if (player.getFoodLevel() >= 20) {
				player.setFoodLevel(19.5);
			}
			
			// Spawn Items...
			if (tickCount % 5 === 0) {
				if (tickCount % 50 === 0) {
					// Cleanup dropped items.
					const server = magik.getPlugin().getServer();
					const cmd = `execute ${player.getName()} ~ ~ ~ minecraft:kill @e[type=Item,r=50]`;
					server.dispatchCommand(server.getConsoleSender(), cmd);
				}
				const worldName = player.getWorld()['getName']();
				if (worldName == 'mct1-main') {
					const Material = Java.type("org.bukkit.Material");
					const ItemStack = Java.type("org.bukkit.inventory.ItemStack");
					const Location = Java.type('org.bukkit.Location');
					let loc;

					// Spawn Apples!
					loc = new Location(player.getWorld(), 920, 97, 1115);
					player.getWorld()['dropItem'](loc, new ItemStack(Material.APPLE, 1));

					// Spawn Potions!
					loc = new Location(player.getWorld(), 933, 96, 1117);
					player.getWorld()['dropItem'](loc, new ItemStack(Material.POTION, 1));
				}			
			}

			// repeat ongoingly!
			tickCount++;
			that.doDigestion(tickCount);
		}, 1000);
	},

	doEffects() {
		let state = getState();

		if ((state.bgl >= 4 && state.bgl <= 8)) {
			this.cancelNegativeEffects();
			// Super powers!
			this.giveSuperPowers();
		}
		else { // Out of range...

			// Cancel super powers...
			this.cancelSuperPowers();
			
			// Confusion!
			if ((state.bgl < 4 && state.bgl >= 3) || (state.bgl > 8 && state.bgl <= 12)) {
				this._makeEffect('CONFUSION', 3500);
			}
			// More Confusion!
			else if (state.bgl < 3 || state.bgl > 16) {
				this._makeEffect('CONFUSION', 6000);
			}
			// Layer additional effects.
			if (state.bgl <= 2 || state.bgl >= 16) {
				this._makeEffect('BLINDNESS', 5000);
				this._makeEffect('POISON', 5000);
			}
		}
	},

	cancelNegativeEffects() {
		this._cancelEffect('CONFUSION');
		this._cancelEffect('BLINDNESS');
		this._cancelEffect('POISON');
	},

	giveSuperPowers() {
		this._makeEffect('SPEED', 10000000, 'WHITE', 2);
		this._makeEffect('JUMP', 10000000, 'WHITE', 2);
		this._makeEffect('GLOWING', 10000000, 'WHITE');
		this._makeEffect('NIGHT_VISION', 10000000, 'WHITE');
	},

	cancelSuperPowers() {
		this._cancelEffect('SPEED');
		this._cancelEffect('JUMP');
		this._cancelEffect('GLOWING');
		this._cancelEffect('NIGHT_VISION');
	},

	_makeEffect(type, milliseconds, color = 'GREEN', amplifier = 1) {
		const PotionEffectType = magik.type("potion.PotionEffectType");
		if (player['hasPotionEffect'](PotionEffectType[type]) == true) {
			// Skip if effect already active!
			return;
		}
		const PotionEffect = magik.type("potion.PotionEffect");
		const Color = magik.type("Color");
		const duration = milliseconds/1000*40; // 20 tick. 1 tick = 0.05 seconds
		const c = Color[color];
		const l = PotionEffectType[type];
		const effect = new PotionEffect(l, duration, amplifier, true, true, c);
		player.addPotionEffect(effect);
	},

	_cancelEffect(type) {
		const PotionEffectType = magik.type("potion.PotionEffectType");
		if (player['hasPotionEffect'](PotionEffectType[type]) == true) {
			player['removePotionEffect'](PotionEffectType[type]);
		}
	},

	clearInventory() {
		player.getInventory()['clear']();
	},

	getInventory() {
        const inventory = player.getInventory(); //Contents of player inventory
        for (let i = 0; i <= 35; i++) {
            const item = inventory['getItem'](i);
            if (item) {
                const type = item.getType();
                const amount = item.getAmount();
                log('i: ' + i);
                log('type: ' + type);
                log('amount: ' + amount);
            }
        }
	},

	refreshInventory() {
		
		const InventoryList = [
			{
				"type": "SNOWBALL",
				"quantity": 64,
				"refresh": true,
				"slot": 0
			},
			{
				"type": "APPLE",
				"quantity": 64,
				"refresh": true,
				"slot": 1
			},
			{
				"type": "BREAD",
				"quantity": 64,
				"refresh": true,
				"slot": 2
			},
			{
				"type": "COOKED_FISH",
				"quantity": 64,
				"refresh": true,
				"slot": 3
			},
			{
				"type": "COOKIE",
				"quantity": 64,
				"refresh": true,
				"slot": 4
			},
			{
				"type": "POTION",
				"quantity": 64,
				"refresh": true,
				"slot": 5
			},
		];

		const server = magik.getPlugin().getServer();
		InventoryList.map(item => {
			const slot = (item.slot <= 8) ? `slot.hotbar.${item.slot}` : `slot.inventory.${item.slot - 8}`
			const cmd = `replaceitem entity ${player.getName()} ${slot} ${item.type} ${item.quantity}`;
			// log(cmd);
			server.dispatchCommand(server.getConsoleSender(), cmd);
		});
	},
}

export default Player;