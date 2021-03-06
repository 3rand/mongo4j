const neo4j = require('neo4j-driver').v1;
const _ = require('lodash');

let driver;
let drivers;

module.exports = {
  drivers,
  driver,

  init(hosts, auth, options) {
    // If there is an array specified, create an array of drivers (multiple databases case)
    if (_.isArray(hosts) && _.isNil(this.driver) && _.isNil(this.drivers)) {
      // Return mapped array of neo4j drivers and their name
      this.drivers = _.map(hosts, (host) => {
        // Name must be set to ensure you can select the right database
        if (_.isNil(host.name)) {
            throw new TypeError("Name of Neo4j-connection must be specified, if you have more than one");
        } else if (!_.isString(host.name)) {
            throw new TypError("Name of Neo4j-connection must be a string");
        }

        const neo_url = host.url || 'bolt://127.0.0.1';
        const neo_auth = host.auth || auth || { user: 'neo4j', pass: 'neo4j' };
        const neo_options = host.options || options || {};

        return {
          name: host.name,
          driver: neo4j.driver(neo_url, neo4j.auth.basic(neo_auth.user, neo_auth.pass), neo_options)
        };
      });

      return this.drivers;
    }

    // Create a new driver (single database case)
    if (_.isNil(this.driver) && _.isNil(this.drivers)) {
      const neo_url = hosts || 'bolt://127.0.0.1';
      const neo_auth = auth || { user: 'neo4j', pass: 'neo4j' };
      const neo_options = options || {};

      this.driver = neo4j.driver(neo_url, neo4j.auth.basic(neo_auth.user, neo_auth.pass), neo_options);
      return this.driver;
    }

    if (!_.isNil(this.driver)) {
      throw new TypeError("A driver has already been initialized");
    } else if (!_.isNil(this.drivers)) {
      throw new TypeError("Drivers have already been initialized");
    }
  },

  getDriver(identifier) {

    if (!_.isUndefined(this.driver)) {
      return this.driver;
    }

    if (!_.isUndefined(this.drivers) && _isUndefined(identifier)) {
      throw new TypError("You initiated more than one driver, which means you need to provide an identifier (String or Integer)");
    }

    if (_.isString(identifier) && !_.isUndefined(this.drivers)) {
      return _.find(this.drivers, ['name', identifier]);
    }

    if (_.isInteger(this.identifier) && !_.isUndefined(this.drivers)) {

      if(identifier > this.drivers.length) {
        throw new RangeError("Identifier is greater than the lenght of the array of drivers");
      }

      if(identifier < 0) {
        throw new RangeError("Identifier must be greater than 0");
      }

      return this.drivers[identifier - 1];

    }

    if (_.isNil(driver) && _.isNil(drivers)) {
      throw new TypeError("No drivers have yet been initialized, do so by calling: init(hosts, auth, options)");
    }
  },

  close(identifier) {
    if (!_.isUndefined(this.driver)) {
      this.driver.close();
    }

    if (!_.isUndefined(this.drivers) && _.isString(this.identifier)) {
      let unclosed_driver = _.find(drivers, ['name', identifier]);
      unclosed_driver.close();
    }

    if (!_.isUndefined(this.drivers) && _.isInteger(this.identifier)) {

      if(identifier > this.drivers.length) {
        throw new RangeError("Identifier is greater than the length of the array of drivers");
      }

      if(identifier < 0) {
        throw new RangeError("Identifier must be greater than 0");
      }

      let unclosed_driver = this.drivers[identifier - 1];
      unclosed_driver.close();
    }

    if (!_.isUndefined(this.drivers)) {
      _.forEach(this.drivers, (val) => val.driver.close());
    }

    if (_.isNil(this.driver) && _.isNil(this.drivers)) {
      throw new TypeError("No drivers have yet been initialized, do so by calling: init(hosts, auth, options)");
    }

  },

  reset() {
    if (!_.isNil(this.driver) || !_.isNil(this.drivers)) {
      this.close();
      this.driver = undefined;
      this.drivers = undefined;
    }
  }
};
