var Accessory, Service, Characteristic;
var request = require('sync-request');

module.exports = function (homebridge) {
    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory('homebridge-http-ac', 'HttpAc', HttpAC);
}

class HttpAC {
    constructor(log, config) {
        this.log = log;

        /* config */
        this.name = config.name || 'AC';
        
        this.stateUrl = config.stateUrl;
        this.tempUrl = config.tempUrl;
        this.getTempUrl = config.getTempUrl;
        this.getStateUrl = config.getStateUrl; // On or Off - 1 or 0
        
        this.cmdTimeout = config.cmdTimeout || 50; // millisecond, async send timeout
        this.syncInterval = config.syncInterval || 5000; // millisecond, sync interval

        /* characteristics */
        this.Active;
        this.CurrentTemperature;

        /* used for generating commands */
        this.model;

        /* command timeout Handle */
        this.cmdHandle;

        /* while sending commands, not sync */
        this.syncLock = false;

        this.services = [];

        this.addServices();

        this.bindCharacteristics();

        this.init();
    }

    addServices() {
        this.acService = new Service.HeaterCooler(this.name);
        this.services.push(this.acService);

        this.serviceInfo = new Service.AccessoryInformation();

        this.serviceInfo
            .setCharacteristic(Characteristic.Manufacturer, 'Ofir Shmuel')
            .setCharacteristic(Characteristic.Model, 'Heater Cooler')
            .setCharacteristic(Characteristic.SerialNumber, '0.0.0.0');
        this.services.push(this.serviceInfo);
    }

    bindCharacteristics() {
        this.Active = this.acService.getCharacteristic(Characteristic.Active)
            .on('set', this._setActive.bind(this));
            

        this.CurrentTemperature = this.acService.addCharacteristic(Characteristic.CoolingThresholdTemperature)
            .setProps({
                maxValue: 30,
                minValue: 15,
                minStep: 1,
                maxStep: 1
            })
            .on('set', this._setCurrentHeaterCoolerTemp.bind(this));
    }

    init() {
//         this.syncState();
    }

    syncState() {
		if (!this.syncLock) {

			let active, temperature;
		
			// REQUEST FOR ON / OFF
			this._httpRequest(this.getStateUrl, function (error, response, body) {
				if (error) {
					this.log("getStatus() failed: %s", error.message);
					callback(error);
				
					active = false;
				}
				else if (response.statusCode !== 200) {
					this.log("getStatus() http request returned http error code: %s", response.statusCode);
					callback(new Error("Got html error code " + response.statusCode));
				
					active = false;
				}
				else {
					const switchedOn = parseInt(body) > 0; // 0 - FALSE, 1 - TRUE
					this.log("AC is currently %s", switchedOn? "ON": "OFF");
					callback(null, switchedOn);
				
					active = switchedOn;
					
					callback(null, temp);
				}
			
// 				this.Active.updateValue(active);
			
			}.bind(this));
		
			// REQUEST FOR Temperature
			this._httpRequest(this.getTempUrl, function (error, response, body) {
				if (error) {
					this.log("getStatus() failed: %s", error.message);
					callback(error);
				
					temperature = "25"; // DEFAULT
				}
				else if (response.statusCode !== 200) {
					this.log("getStatus() http request returned http error code: %s", response.statusCode);
					callback(new Error("Got html error code " + response.statusCode));
				
					temperature = "25"; // DEFAULT
				}
				else {
					const temp = parseInt(body);
					this.log("Temperature is currently %s degrees", temp.toString());
				
					temperature = temp;
					this.HeatingThresholdTemperature.updateValue(temperature);
					
					callback(null, temp);
				}
			
// 				this.CurrentTemperature.updateValue(temperature);
			
			}.bind(this));

		
		}
    }

    /* set characteristic methods */
    _setActive(Active, callback) {
		this._httpRequest(this.stateUrl, function (error, response, body) {
				if (error) {
					this.log("_setActive() failed: %s", error.message);
					callback(error);
				}
				else if (response.statusCode !== 200) {
					this.log("_setActive() http request returned http error code: %s", response.statusCode);
					callback(new Error("Got html error code " + response.statusCode));
				}
				else {
					this.log("_setActive() succeeded!");
					callback(null, 0);
				}
			
		}.bind(this));
    }
    
	_setCurrentHeaterCoolerTemp(CurrentHeaterCoolerTemp, callback) {
        this._httpRequest(this.tempUrl + CurrentHeaterCoolerTemp.value, function (error, response, body) {
				if (error) {
					this.log("_setCurrentHeaterCoolerTemp() failed: %s", error.message);
					callback(error);
				}
				else if (response.statusCode !== 200) {
					this.log("_setCurrentHeaterCoolerTemp() http request returned http error code: %s", response.statusCode);
					callback(new Error("Got html error code " + response.statusCode));
				}
				else {
					this.log("_setCurrentHeaterCoolerTemp() succeeded!");
					callback(null, 0);
				}
			
		}.bind(this));
    }

	_httpRequest: function (url, callback) {
        request(
            {
                url: url,
                body: "",
                method: "GET",
                rejectUnauthorized: false
            },
            function (error, response, body) {
                callback(error, response, body);
            }
        )
    }
    
    /* framework interface */
    getServices() {
        return this.services;
    }
    
	identify(callback) {
        this.log("Identify requested!");
        callback(); // success
    }
}