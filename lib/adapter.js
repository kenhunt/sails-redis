/**
 * Adapter dependencies
 */

var _ = require('lodash'),
    Utils = require('./utils'),
    Connection = require('./connection'),
    Database = require('./database');

/**
 * Expose adapter
 */

module.exports = (function () {

  // Keep track of all the connections used by the app
  var connections = {};

  var adapter = {

    identity: 'sails-redis',

    // Which type of primary key is used by default
    pkFormat: 'integer',

    // Track schema internally
    syncable: false,

    // Default Schema setting
    schema: false,

    /**
     * Default adapter configuration
     */

    defaults: {
      port: 6379,
      host: 'localhost',
      password: null,
      options: {
        return_buffers: false,
        detect_buffers: false,
        socket_nodelay: true,
        no_ready_check: false,
        enable_offline_queue: true
      }
    },

    /**
     * Register A Connection
     *
     * Will open up a new connection using the configuration provided and store the DB
     * object to run commands off of.
     *
     * @param {Object} connection
     * @param {Object} collections
     * @param {Function} callback
     */

    registerConnection: function(connection, collections, cb) {

      if(!connection.identity) return cb(new Error('Connection is missing an identity'));
      if(connections[connection.identity]) return cb(new Error('Connection is already registered'));

      // Store the connection
      connections[connection.identity] = {
        config: connection,
        collections: {}
      };

      var activeConnection = connections[connection.identity];

      // Create a new active connection
      new Connection(connection, function(err, conn) {
        if(err) return cb(err);

        // Store the live connection
        activeConnection.connection = conn;

        // Create a new database with the active connection
        activeConnection.database = new Database(conn);

        // Register each collection with the database
        Object.keys(collections).forEach(function(key) {
          activeConnection.database.configure(key, collections[key].definition);
        });

        // Sync the database with redis
        activeConnection.database.sync(cb);
      });
    },

    /**
     * Teardown
     *
     * Closes the connection and removes the connection object from the registry.
     *
     * @param {String} connectionName
     * @param {Function} callback
     */

    teardown: function(connectionName, cb) {
      if(!connections[connectionName]) return cb();

      // Drain the connection pool if available
      connections[connectionName].connection.connection.quit();

      // Remove the connection from the registry
      delete connections[connectionName];
      cb();
    },

    /**
     * Describe a collection on `collection === tableName`
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Function} callback
     */

    describe: function(connectionName, collectionName, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.describe(collectionName, cb);
    },

    /**
     * Define a collection.
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} definition
     * @param {Function} callback
     */

    define: function(connectionName, collectionName, definition, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.define(collectionName, definition, cb);
    },

    /**
     * Drop a collection on `collection === tableName`
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Array} relations
     * @param {Function} callback
     */

    drop: function(connectionName, collectionName, relations, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.drop(collectionName, relations, cb);
    },

    /**
     * Create a new record from `data`
     * - Ensure record unique keys are unique
     * - attempts to get meta data or creates them
     * - ensures the primary key is present and unique
     * - saves the data to database updating all unique index sets
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} data
     * @param {Function} callback
     */

    create: function(connectionName, collectionName, data, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.create(collectionName, data, cb);
    },

    /**
     * Find records based on criteria in `criteria`
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} criteria
     * @param {Function} callback invoked with `err, records`
     */

    find: function(connectionName, collectionName, criteria, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.find(collectionName, criteria, cb);
    },

    /**
     * Update records based on criteria
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} criteria
     * @param {Object} values
     * @param {Function} callback invoked with `err, records`
     */

    update: function(connectionName, collectionName, criteria, values, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.update(collectionName, criteria, values, cb);
    },

    /**
     * Destroy records based on criteria
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Object} criteria
     * @param {Function} callback invoked with `err`
     */

    destroy: function(connectionName, collectionName, criteria, cb) {
      var connectionObject = connections[connectionName];
      connectionObject.database.destroy(collectionName, criteria, cb);
    },

    /**
     * Return the native redis object.
     *
     * @param {Function} callback invoked with `err, connection`
     */

    native: function(connectionName, collectionName, cb) {
      var connectionObject = connections[connectionName];
      var connection = connectionObject.database.connection;
      return cb(null, connection);
    },

    set: function (connectionName, collectionName, key, data, seconds, cb) {
        var connectionObject = connections[connectionName];
        var connection = connectionObject.database.connection;
        connectionObject.database.set(collectionName, key, data, seconds, cb);
    },

    updateTTL: function(connectionName, collectionName, key, seconds, cb) {
        var connectionObject = connections[connectionName];
        var connection = connectionObject.database.connection;
        connectionObject.database.updateTTL(collectionName, key, seconds, cb);
    },

    get: function (connectionName, collectionName, key, cb) {
        var connectionObject = connections[connectionName];
        var connection = connectionObject.database.connection;
        connectionObject.database.get(collectionName, key, cb);
    },

    remove: function (connectionName, collectionName, key, cb) {
      var connectionObject = connections[connectionName];
      var connection = connectionObject.database.connection;
      connectionObject.database.remove(collectionName, key, cb);
    }
  };

  return adapter;
})();
