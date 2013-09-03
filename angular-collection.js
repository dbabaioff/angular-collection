(function (window, angular, undefined) {
    'use strict';

    angular.module('ngCollection', []).
        factory('$collection', ['$filter', '$parse', function ($filter, $parse) {
            var _guid = function() {
                var s4 = function() {
                    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
                };

                return s4() + s4() + '-' + s4() + '-' + s4() +
                    '-' + s4() + '-' + s4() + s4() + s4();
            };

            var _checkValue = function(item, compareFn) {
                return compareFn(item);
            };

            // Helper function to continue chaining intermediate results.
            var _result = function(models) {
                return this._chain ? (new Collection(models)).chain() : models;
            };

            var Collection = function(models, options) {
                options || (options = {});

                if (options.comparator !== void 0) {
                    this.comparator = options.comparator;
                }
                this.idAttribute = options.idAttribute || this.idAttribute;

                this._reset();
                this.initialize.apply(this, arguments);
                if (models) {
                    this.add(models);
                }
            };

            angular.extend(Collection.prototype, {
                idAttribute: 'id',

                initialize: function() {},

                add: function (models, options) {
                    options || (options = {});

                    if ( ! angular.isArray(models)) {
                        models = models ? [models] : [];
                    }

                    var i, l, model, existing, sort;
                    var sort = (this.comparator && options.sort !== false);

                    for (i = 0, l = models.length; i < l; i++) {
                        model = models[i];

                        if ( ! model[this.idAttribute]) {
                            model[this.idAttribute] = _guid();
                        }

                        if (existing = this.get(model)) {
                            angular.extend(existing, model);
                        }
                        else {
                            var id = model[this.idAttribute];

                            this.hash[id] = model;
                            this.array.push(model);
                            this.length += 1;
                        }
                    }

                    if (sort) this.sort();

                    return this;
                },

                sort: function () {
                    if (angular.isString(this.comparator)) {
                        this.array = $filter('orderBy')(this.array, this.comparator);
                    }

                    return this;
                },

                get: function (obj) {
                    if (obj == null) return void 0;
                    return this.hash[obj[this.idAttribute] || obj];
                },

                find: function (expr, value, deepCompare) {
                    var value = this.where(expr, value, deepCompare, true);

                    return _result.call(this, value);
                },

                where: function (expr, value, deepCompare, returnFirst) {
                    var results = [];

                    var compareFn ;
                    if (angular.isFunction(expr)){
                        compareFn = expr;
                    } else {
                        var compareObj = {};
                        if (typeof expr === 'string'){
                            compareObj[expr] = value;
                        } else {
                            compareObj = expr;
                        }

                        compareFn = function(obj)
                        {
                            for (var key in compareObj) {

                                if (compareObj[key] !== obj[key]) return false;
                            }
                            return true;
                        }
                    }
                    if ( ! compareFn) {
                        return false;
                    }

                    //loop over all the items in the array
                    for (var i = 0; i < this.array.length; i++) {
                        if (_checkValue(this.array[i], compareFn)) {
                            if (returnFirst) {
                                return this.array[i];
                            } else {
                                results.push(this.array[i]);
                            }
                        }
                    }

                    var value =  (returnFirst) ? void 0 : results;

                    return _result.call(this, value);
                },

                update: function (obj) {
                    var existing;
                    existing = this.get(obj);
                    if (existing) angular.extend(existing, obj);
                    if (!existing) this.add(obj);

                    return this;
                },

                remove: function (models) {
                    if ( ! angular.isArray(models)) {
                        models = models ? [models] : [];
                    }

                    var i, l, index, model;
                    for (i = 0, l = models.length; i < l; i++) {
                        model = models[i];
                        if ( ! model) continue;

                        index = this.array.indexOf(models[i]);
                        if (index === -1) {
                            return this
                        }

                        delete this.hash[model[this.idAttribute]];
                        this.array.splice(index, 1);
                        this.length--;
                    }

                    return this;
                },

                removeAll: function () {
                    this.remove(this.array);

                    return this;
                },

                removeWhere: function (expr, value, deepCompare) {
                    var objects = this.where(expr, value, deepCompare);
                    this.remove(objects);

                    return this;
                },

                last: function () {
                    return this.array[this.length - 1];
                },

                at: function (index) {
                    return this.array[index];
                },

                size: function () {
                    return this.array.length;
                },

                all: function () {
                    return this.array;
                },

                toJSON: function() {
                    var value = this.map(function(model){
                        return angular.copy(model);
                    });

                    return _result.call(this, value);
                },

                each: function(iterator, context) {
                    var nativeForEach = Array.prototype.forEach;

                    if (nativeForEach && this.array.forEach === nativeForEach) {
                        this.array.forEach(iterator, context);
                    }
                    else if (this.array.length === +this.array.length) {
                        for (var i = 0, l = this.array.length; i < l; i++) {
                            iterator.call(context, this.array[i], i, this.array);
                        }
                    }
                },

                map: function (iterator, context) {
                    var results   = [],
                        nativeMap = Array.prototype.map;

                    if (nativeMap && this.array.map === nativeMap) {
                        return this.array.map(iterator, context);
                    }
                    angular.forEach(this.array, function(value, index, list) {
                        results.push(iterator.call(context, value, index, list));
                    });

                    var value = results;

                    return _result.call(this, value);
                },

                filter: function(expression, comparator) {
                    var value = $filter('filter')(this.array, expression, comparator);

                    return _result.call(this, value);
                },

                pluck: function(key) {
                    var value = this.map(function(value){
                        return value[key];
                    });

                    return _result.call(this, value);
                },

                chain: function() {
                    this._chain = true;

                    return this;
                },

                clone: function() {
                    return new this.constructor(this.array);
                },

                slice: function(begin, end) {
                    return this.array.slice(begin, end);
                },

                _reset: function () {
                    this.length = 0;
                    this.hash   = {};
                    this.array  = [];
                }
            });

            Collection.extend = function (protoProps, staticProps) {
                var parent = this;
                var child;

                if (protoProps && protoProps.hasOwnProperty('constructor')) {
                    child = protoProps.constructor;
                } else {
                    child = function () {
                        return parent.apply(this, arguments);
                    };
                }

                angular.extend(child, parent, staticProps)

                var Surrogate = function () {
                    this.constructor = child;
                };
                Surrogate.prototype = parent.prototype;
                child.prototype = new Surrogate;

                if (protoProps) angular.extend(child.prototype, protoProps);

                child.getInstance = Collection.getInstance;
                child.__super__   = parent.prototype;

                return child;
            };

            Collection.getInstance = function(models, options) {
                return new this(models, options);
            };

            return Collection;
        }]);
})(window, window.angular);
