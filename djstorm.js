/**
 * @fileOverview Django like Object Relational Mapper for JavaScript
 * @author maccesch
 * @version 0.1
 */

/**
 * ModelManager constructor
 * @class Model Manager class that provides the actual database operations for models
 * @extends QuerySet
 * 
 * @param {Object} modelDef
 *            The model definition. See {@link Model}.
 */
function ModelManager(modelDef) {
	QuerySet.call(this, modelDef, this);
}

ModelManager.prototype = new QuerySet();

/**
 * Saves a model instance to the db. Called by Model's save.
 * 
 * @param modelInstance
 *            The model instance to save
 * @param {Function} onComplete
 *            callback function that is called when instance has been
 *            saved. Takes the saved instance as parameter.
 * @see Model
 */
ModelManager.prototype.save = function(modelInstance, onComplete) {
	var values = [];
	var cols = []
	var additionalQueries = "";
	for (name in modelInstance._model) {
		var fieldType = modelInstance._model[name];
		if (fieldType instanceof Field) {
			if (fieldType instanceof ManyToManyField) {
				if (!modelInstance._new) {
					additionalQueries += this._updateManyToManyField(fieldType, modelInstance);
				}
			} else {
				var value = modelInstance[name];
				values.push(fieldType.toSql(value));
				cols.push(fieldType._params.dbColumn);
			}
		}
	}
	
	var tableName = modelInstance._model.Meta.dbTable;
	var primKey = modelInstance._model.Meta.primaryKey;
	
	if (modelInstance._new) {
		this._saveNew(tableName, primKey, modelInstance, cols, values, onComplete, additionalQueries);
	} else {
		this._saveExisting(tableName, primKey, modelInstance, cols, values, onComplete, additionalQueries);
	}
}

/**
 * Saves an existing (already in db) model instance to the db.
 */
ModelManager.prototype._saveExisting = function(tableName, primKey, modelInstance, cols, values, onComplete, additionalQueries) {
	if (!modelInstance[primKey]) {
		throw "Invalid value of Primary Key '" + primKey + "'";
	}
	var query = additionalQueries + 'UPDATE "' + tableName + '" SET ';
	var assigns = [];
	for (var i = 0; i < cols.length; ++i) {
		assigns.push('"' + cols[i] + '"=' + values[i]);
	}
	query += assigns.join(',') + ' WHERE "' + modelInstance._model[primKey]._params.dbColumn + '"=' + modelInstance._model[primKey].toSql(modelInstance._old_id);
	db.transaction(function (tx) {
		tx.executeSql(query, [], function(tx, result) {
			modelInstance._old_id = modelInstance[primKey];
			onComplete(modelInstance);
		});
	});
}

/**
 * Saves a new (not in db yet) model instance to the db.
 */
ModelManager.prototype._saveNew = function(tableName, primKey, modelInstance, cols, values, onComplete, additionalQueries) {
	var pkCol = modelInstance._model[primKey]._params.dbColumn;
	function insertNew() {
		db.transaction(function (tx) {
			var query = additionalQueries + 'INSERT INTO "' + tableName + '" ("' + cols.join('","') + '") VALUES (' + values.join(",") + ")";
			tx.executeSql(query, [], function(tx, result) {
				modelInstance._new = false;
				modelInstance._old_id = modelInstance[primKey];

				// make sure values in a ManyToManyField are written to the db
				var saveablePlaceholders = [];
				for (key in modelInstance) {
					if (modelInstance[key] instanceof RelatedManagerPlaceholder) {
						saveablePlaceholders.push([key, modelInstance[key]]);
					}
				}
				function saveValuesFromPlaceholders(index) {
					if (index < saveablePlaceholders.length) {
						var sav = saveablePlaceholders[index];
						var key = sav[0];
						var relManager = modelInstance[key].getManager(modelInstance._model, modelInstance[primKey]);
						modelInstance[key] = relManager;
						sav[1].save(relManager, function() {
							saveValuesFromPlaceholders(index+1);
						});
					} else {
						onComplete(modelInstance);
					}
				}
				saveValuesFromPlaceholders(0);
				
				Model.replacePlaceholders(modelInstance);
				
			});
		});
	}
	
	db.transaction(function (tx) {
		if (!modelInstance[primKey]) {
			tx.executeSql('SELECT MAX("' + pkCol + '") + 1 AS nk FROM ' + tableName, [], function(tx, result) {
				var nk = result.rows.item(0).nk;
				values[cols.indexOf(pkCol)] = nk;
				modelInstance[primKey] = nk;

				insertNew();
			});
		} else {
			insertNew();
		}
	});
}

/**
 * Saves the many to many field through its intermediate table
 */
ModelManager.prototype._updateManyToManyField = function(manyToManyField, modelInstance) {
	var primKey = this._model.Meta.primaryKey;
	if (modelInstance._old_id == modelInstance[primKey]) {
		return "";
	}
	
	var interModel = manyToManyField._params.through.objects._model;
	
	// find reference to this model
	var type;
	var name;
	for (name in interModel) {
		type = interModel[name];
		if (type instanceof ForeignKey && type._refModel.objects._model == this._model) {
			break;
		}
	}
	
	return 'UPDATE "' + interModel.Meta.dbTable + '" SET "' + type._params.dbColumn + '" = ' +
			type.toSql(modelInstance[primKey]) + ' WHERE "' + type._params.dbColumn + '" = ' +
			type.toSql(modelInstance._old_id) + ";";
}


/**
 * SingleManager constructor
 * @class Proxy for a single model instance, that should be loaded lazily. Used for ForeignKeys. The actual instance is loaded when get() is called. 
 * @extends ModelManager
 * @param {Object} modelDef Model definition of the base model. See {@link Model}.
 * @param id The value of the primary key of the instance this object represents.
 */
function SingleManager(modelDef, id) {
	ModelManager.call(this, modelDef);
	this._id = id;
}

SingleManager.prototype = new ModelManager();

/**
 * Fetches the instance from the database and calls callback with it as argument.
 * @param {Function} callback
 * A callback function that is called when the instance that this proxy represents was fetched from the database.
 * Passes the instance as parameter to the callback.
 */
SingleManager.prototype.get = function(callback) {
	if (this._cache) {
		callback(this._cache);
	} else {
		var self = this;
		QuerySet.prototype.get.call(this, { pk: this._id }, function(instance) {
			self._cache = instance;
			callback(instance);
		});
	}
}

/**
 * Sets the instance. Does not save anything to the database (call save() on the related model instance for that).
 * @param {Model} instance The instance this proxy represents
 */
SingleManager.prototype.set = function(instance) {
	this._cache = instance;
	this._id = instance[this._model.Meta.primaryKey];
}


/**
 * RelatedManager constructor
 * @class
 * Class that represents all instances of modelDef whose field named foreignKey has the value id.
 * Used for ManyToManyFields or the reverse relation of a ForeignKey.
 * @extends ModelManager
 * @param {Object} modelDef Model definition. See {@link Model}.
 * @param {Object} relModelDef Model definition of the related model.
 * @param {String} foreignKey Name of the foreign key field.
 * If joinModelDef is provided then foreignKey is a column of the join table and the join table is joined with the modelDef table.
 * If joinModelDef is not given, foreignKey is a column in the modelDef table.
 * @param id Value of the foreignKey column, that the related model instances have in common
 * @param {Object} joinModelDef Model definition of an intermediate join table. This is used for ManyToManyFields.
 * @see Model
 */
function RelatedManager(modelDef, relModelDef, foreignKey, id, joinModelDef) {
	ModelManager.call(this, modelDef);

	var table;
	var col;
	if (joinModelDef) {
		this._joinModelDef = joinModelDef;
		this._relModelDef = relModelDef;
		this._foreignKey = foreignKey;
		this._id = id;
		
		table = joinModelDef.Meta.dbTable;
		col = joinModelDef[foreignKey]._params.dbColumn;
	} else {
		table = modelDef.Meta.dbTable;
		col = modelDef[foreignKey]._params.dbColumn;
	}
	this._where = '"' + table + '"."' + col + '"=' + relModelDef[relModelDef.Meta.primaryKey].toSql(id);
	
	if (joinModelDef) {
		// TODO : make this a join?
		
		// find foreign key for this model
		var joinForeignKey;
		for (name in joinModelDef) {
			var type = joinModelDef[name]; 
			if (type instanceof ForeignKey && type._refModel.objects._model == modelDef) {
				joinForeignKey = name;
				break;
			}
		}
		this._joinForeignKey = joinForeignKey;
		
		this._additionalTables.push(table);
		this._where = '(' + this._where + ' AND "' + table + '"."' + joinModelDef[joinForeignKey]._params.dbColumn + '"="' + 
				modelDef.Meta.dbTable + '"."' + modelDef[modelDef.Meta.primaryKey]._params.dbColumn + '")';
	}
}

RelatedManager.prototype = new ModelManager();

/**
 * Sets the instances and saves the relation to the database. Only works for ManyToManyFields.
 * @param {Array} instances List of instances this manager represents.
 * @param {Function} doneCallback Callback function for when it's done. Takes instances as argument.
 */
RelatedManager.prototype.set = function(instances, doneCallback) {
	if (!this._joinModelDef) {
		throw "Method set() cannot be called on a RelatedManager instance that doesn't represent a ManyToManyField";
	}

	console.log('joinModelDef: ' + this._joinModelDef.Meta.dbTable + '\n' +
			'relModelDef: ' + this._relModelDef.Meta.dbTable + '\n' +
			'foreignKey: ' + this._foreignKey + '\n' +
			'id: ' + this._id);

	delete this._cache;
	
	var self = this;
	this.clear(function() {
		if (instances.length == 0) {
			doneCallback();
			return;
		}
		
		var table = self._joinModelDef.Meta.dbTable;
		var col = self._joinModelDef[self._foreignKey]._params.dbColumn;
		
		var baseQuery = 'INSERT INTO ' + table + ' (' +
				col + ', ' + self._joinModelDef[self._joinForeignKey]._params.dbColumn + 
				') VALUES (' + self._relModelDef[self._relModelDef.Meta.primaryKey].toSql(self._id) + ', ';
		var primKey = self._model.Meta.primaryKey;
		
		var query = "";

		function doInsertQuery(index) {
			query = baseQuery + self._model[primKey].toSql(instances[index][primKey]) + ')';
	
			db.transaction(function (tx) {
				tx.executeSql(query, [], function(tx, result) {
					if (index == instances.length-1) {
						if (doneCallback) {
							self._cache = instances.slice(0);
							doneCallback();
						}
					} else {
						doInsertQuery(index+1);
					}
				});
			});
		}
		doInsertQuery(0);
		
	});
}

/**
 * Clears all currently represented relation data from the database. Only works for ManyToManyFields.
 * @param {Function} doneCallback Callback function for when it's done. Takes no arguments.
 */
RelatedManager.prototype.clear = function(doneCallback) {
	if (!this._joinModelDef) {
		throw "Method clear() cannot be called on a RelatedManager instance that doesn't represent a ManyToManyField";
	}
	var table = this._joinModelDef.Meta.dbTable;
	var col = this._joinModelDef[this._foreignKey]._params.dbColumn;
	
	var query = 'DELETE FROM ' + table +
			' WHERE "' + col + '"=' +
			this._relModelDef[this._relModelDef.Meta.primaryKey].toSql(this._id);
	
	db.transaction(function (tx) {
		tx.executeSql(query, [], function(tx, result) {
			if (doneCallback) {
				doneCallback();
			}
		});
	});
}


/**
 * A placeholder for RelatedManager. This is replaced by an actual manager
 * when an instance of the model is created.
 * @see RelatedManager
 * @returns {RelatedManagerPlaceholder}
 */
function RelatedManagerPlaceholder(modelDef, foreignKey, joinModelDef, initInstances) {
	this._model = modelDef;
	this._foreignKey = foreignKey;
	this._joinModelDef = joinModelDef;
	if (initInstances) {
		this._cache = initInstances.slice(0);
	} else {
		this._cache = [];
	}
}

/**
 * Same as RelatedManager.all
 */
RelatedManagerPlaceholder.prototype.all = function(callback) {
	callback(this._cache.slice(0));
}

/**
 * Same as RelatedManager.set
 */
RelatedManagerPlaceholder.prototype.set = function(instances, doneCallback) {
	this._cache = instances.slice(0);
	doneCallback();
}

/**
 * Saves the instances to the database through the actual manager.
 * @param {RelatedManager} relatedManager The actual manager this placeholders represented
 * @param {Function} callback Called when saving is done. Takes an array of the instances as argument.
 * @see RelatedManager.set
 */
RelatedManagerPlaceholder.prototype.save = function(relatedManager, callback) {
	relatedManager.set(this._cache, callback);
}

/**
 * Returns the RelatedManager that should replace this placeholder.
 * @param modelDef Model definition of the model this placeholder is in.
 * @param id Value of the primary key that the concerned instances reference to.
 */
RelatedManagerPlaceholder.prototype.getManager = function(relModelDef, id) {
	return new RelatedManager(this._model, relModelDef, this._foreignKey, id, this._joinModelDef);
}


/**
 * QuerySet constructor
 * @class Class that represents a list of model instances that are retrieved by a
 * database query.
 * @param {Object} modelDef Definition of the model. See Model.
 * @param {ModelManager} manager The model manager of the model that is the base for this query set.
 * @see Model
 */
function QuerySet(modelDef, manager) {
	this._model = modelDef;
	this._manager = manager;
	
	this._where = "";
	this._extra = "";
	this._joins = [];
	this._additionalTables = [];
	
	this._cache = null;
}

/**
 * Creates a deep copy of this object (except cache).
 */
QuerySet.prototype.clone = function() {
	var newQs = new QuerySet(this._model, this._manager);
	
	newQs._where = this._where.substr(0);
	newQs._extra = this._extra.substr(0);
	newQs._joins = this._joins.slice(0);
	newQs._additionalTables = this._additionalTables.slice(0);
	
	return newQs;
}

/**
 * Extracts model instances from result rows of a database query. Calls callback
 * with the extracted instances when done.
 */
QuerySet.prototype._extractModelInstances = function(rows, modelDef, callback) {

	var self = this;
	
	function getCallback(instance, values, name) {
		
		return function converted(value) {
			values[name] = value;
			instance.__i -= 1;
			if (instance.__i == 0) {
				delete instance.__i;

				Model._initInstance.call(instance, modelDef, self._manager, values);

				instances.push(instance);
				if (instances.length == len) {
					callback(instances);
				}
			}
		}
	}

	var len = rows.length;
	
	var instances = [];
	for (var i = 0; i < len; ++i) {
		var item = rows.item(i);
		var instance = { __i: 0 };
		var values = {}
		
		for (name in modelDef) {
			var type = modelDef[name];
			
			if (type instanceof Field) {
				instance.__i += 1;
				
				var dbCol = name;
				if (type instanceof ForeignKey) {
					dbCol = name + '_id';
				}
				values[name] = dbCol;
			}
		}
		
		for (name in modelDef) {
			var type = modelDef[name];
			if (type instanceof Field) {
				type.toJs(item[values[name]], getCallback(instance, values, name));
			}
		}
		
	}
}

/**
 * Builds the where clause of the sql query, that fetches all instances that are
 * represented by this queryset
 */
QuerySet.prototype._buildWhere = function() {
	if (this._where.length > 0) {
		return " WHERE " + this._where;
	}
	return "";
}

/**
 * Builds the extra clauses (like GROUP BY or ORDER BY) of the sql query, that
 * fetches all instances that are represented by this queryset
 */
QuerySet.prototype._buildExtra = function() {
	if (this._extra.length > 0) {
		return " " + this._extra;
	}
	return "";
}

/**
 * Builds the from clause, that is the table joins and additional table list for the sql query
 */
QuerySet.prototype._buildFrom = function() {
	var table = this._model.Meta.dbTable;
	var model = this._model;
	var from = ' FROM "' + table + '"';
	
	for (var i = 0; i < this._joins.length; ++i) {
		var join = this._joins[i];
		var otherTable = join.model.Meta.dbTable;
		from += ' JOIN "' + otherTable;
		from += '" ON ("' + table + '"."' + model[join.column]._params.dbColumn + '"="' + otherTable + '"."' + join.model.Meta.primaryKey + '")';
		
		table = otherTable;
		model = join.model;
	}
	
	if (this._additionalTables.length) {
		from += ',"' + this._additionalTables.join('","') + '"';
	}
	
	return from;
}

/**
 * Deletes all objects this query set represents.
 * @param onComplete {Function} Callback that is called when deletion is done. No arguments are passed.
 */
QuerySet.prototype.delete = function(onComplete) {
	this._cache = [];
	var self = this;
	db.transaction(function (tx) {
		var where = self._buildWhere();
		var from = self._buildFrom();
		tx.executeSql('DELETE' + from + where, [], function(tx, result) {
			onComplete();
		});
	});
}

/**
 * Fetches the object that machtes the lookup parameters given by queryObj. The format of queryObj is the same as in filter().
 * If no or more than one result is found, an exception is thrown.
 * @param queryObj {Object}
 *            field lookups or Q object.
 * @param onComplete {Function}
 *            Callback that is called with the fetched instance.
 */
QuerySet.prototype.get = function(queryObj, onComplete) {
	this.filter(queryObj).all(function(results) {
		if (results.length == 0) {
			throw "No Object found"
		} else if (results.length > 1) {
			throw "More than one Object found"
		} else {
			onComplete(results[0]);
		}
	});
}

/**
 * Fetches all instances of the model which are in the db. This method actually
 * hits the database and evaluates the query set.
 * 
 * @param onComplete {Function}
 *            Callback that is called with a list of all instances.
 */
QuerySet.prototype.all = function(onComplete) {
	if (this._cache) {
		onComplete(this._cache.slice(0));
	} else {
		var self = this;
		db.transaction(function (tx) {
			var where = self._buildWhere();
			var from = self._buildFrom();
			var extra = self._buildExtra();
			tx.executeSql('SELECT "' + self._model.Meta.dbTable + '".*' + from + where + extra, [], function(tx, result) {
				self._extractModelInstances(result.rows, self._model, function(instances) {
					self._cache = instances.slice(0);
					onComplete(instances);
				});
			});
		});
	}
}


/**
 * Returns a QuerySet which represents all instances of the model which validate
 * against queryObj. This QuerySet remains unchanged.
 * 
 * @param queryObj {Object}
 *            field lookups or Q object.
 */
QuerySet.prototype.filter = function(queryObj) {
	var values = [];
	var whereStr;
	if (queryObj instanceof Q.Obj) {
		values = queryObj._values;
		whereStr = queryObj._where;
	} else {
		whereStr = this.convertLookups(queryObj, values);
	}
	whereStr = this._bindParameters(whereStr, values);
	
	var newQs = this.clone();
	if (newQs._where.length > 0) {
		newQs._where = "(" + newQs._where + ") AND ";
	}
	newQs._where += "(" + whereStr + ")";
	return newQs;
}

/**
 * Returns a QuerySet which represents all instances of the model which do NOT
 * validate against queryObj. This QuerySet remains unchanged.
 * 
 * @param queryObj {Object}
 *            field lookups or Q object.
 */
QuerySet.prototype.exclude = function(queryObj) {
	var newQs = this.filter(queryObj);
	newQs._where = "NOT " + newQs._where;
	return newQs;
}

/**
 * Returns a new QuerySet that is ordered by the given fields.
 * 
 * @example Entry.objects.orderBy('-pub_date', 'headline').all(...);
 */
QuerySet.prototype.orderBy = function() {
	// TODO : foreign keys
	var orderList = [];
	for (var i = 0; i < arguments.length; ++i) {
		var a = arguments[i];
		if (a[0] == "-") {
			orderList.push('"' + this._model.Meta.dbTable + '"."' + this._model[a.substr(1)]._params.dbColumn + '" DESC');
		} else {
			orderList.push('"' + this._model.Meta.dbTable + '"."' + this._model[a]._params.dbColumn + '" ASC');
		}
	}
	
	var newQs = this.clone();
	newQs._extra += " ORDER BY " + orderList.join(',');
	newQs._extra = newQs._extra.trim();
	return newQs;
}

/**
 * Converts a lookup object into an SQL WHERE condition.
 */
QuerySet.prototype.convertLookups = function(queryObj, values) {
	var wheres = [];
	for (lookup in queryObj) {
		var lus = lookup.split("__");
		var col;
		var op;
		if (lus.length > 1) {
			col = lus.slice(0, lus.length - 1).join('__');
			op = lus[lus.length - 1];
			if (!this._isLookupOp(op)) {
				col = col + '__' + op;
				op = 'exact';
			}
		} else {
			col = lus[0];
			op = 'exact';
		}
		
		var val = queryObj[lookup];
		values.push(val);
		
		wheres.push(this._buildCondition(col, op));
	}
	return "(" + wheres.join(") AND (") + ")";
}

/**
 * Returns true if op is a valid lookup operator
 */
QuerySet.prototype._isLookupOp = function(op) {
	return ['exact', 'iexact', 'contains', 'icontains', 'in', 'gt', 'gte', 'lt', 'lte'].indexOf(op) >= 0;
}

/**
 * Builds a part of the sql where condition based on the columns, the lookup
 * operation and the value.
 */
QuerySet.prototype._buildCondition = function(col, op) {
	
	var valPlaceholder = "${" + col + "}";
	var colPlaceholder = "§{" + col + "}"
	
	if (op == 'exact') {
		return colPlaceholder + " = " + valPlaceholder + " COLLATE BINARY";
	} else if (op == 'iexact') {
		return colPlaceholder + " = " + valPlaceholder + " COLLATE NOCASE";
	} else if (op == 'contains') {
		return colPlaceholder + " LIKE '%" + valPlaceholder + "%'";
	} else if (op == 'icontains') {
		// TODO : sqlite doesn't support ILIKE
		return colPlaceholder + " LIKE '%" + valPlaceholder + "%'";
	} else if (op == 'in') {
		return colPlaceholder + " IN (" + valPlaceholder + ")";
	} else if (op = 'gt') {
		return colPlaceholder + ">" + valPlaceholder;
	} else if (op = 'gte') {
		return colPlaceholder + ">=" + valPlaceholder;
	} else if (op = 'lt') {
		return colPlaceholder + "<" + valPlaceholder;
	} else if (op = 'lte') {
		return colPlaceholder + "<=" + valPlaceholder;
	}
}

QuerySet.prototype._bindParameters = function(whereStr, values) {
	
	var i = 0;
	var index = whereStr.indexOf('${');
	while (index >= 0) {
		var orig = whereStr.substr(index + 2).split('}', 1)[0];
		var len = orig.length;
		var model = this._model;
		var col = orig;

		// lookup spans multiple tables
		if (col.indexOf('__') >= 0) {
			var cols = col.split('__');
			col = "pk";
			
			for (var j = 0; j < cols.length; ++j) {
				var field = model[col];
				if (!field) {
					throw "Model does not have a field named '" + col + "'";
				}
				if (field instanceof ForeignKey) {
					model = field._refModel.objects._model;
					this._joins.push({
						column: cols[j],
						model: field._refModel.objects._model
					});
				} else {
					col = cols[j];
				}
			}
		}
		
		if (col == "pk") {
			col = model.Meta.primaryKey;
		}
		
		var val = values[i++];

		if (!model[col]) {
			throw "Model does not have a field named '" + col + "'";
		}

		// format val for sql
		if (val instanceof Array) {
			for (var i = 0; i < val.length; ++i) {
				val[i] = model[col].toSql(val[i]);
			}
			val = val.join(',');
		} else {
			val = model[col].toSql(val);
		}
		
//		whereStr = whereStr.substring(0, index) + val + whereStr.substr(index + len + 3);
		whereStr = whereStr.replace("${" + orig + "}", val);
		whereStr = whereStr.replace("§{" + orig + "}", '"' + model.Meta.dbTable + '"."' + model[col]._params.dbColumn + '"');
		
		index = whereStr.indexOf('${', index + 1);
	}
	
	// remove additional quotes of LIKE clauses
	whereStr = whereStr.replace(/'%'(.*?)'%'/g, "'%$1%'");
	
	return whereStr;
}


/**
 * Creates a lookup object. Used for complex lookups in QuerySet.filter() for
 * example.
 * 
 * @param {Object} queryObj lookups like in QuerySet.filter()
 * @example
 * 	// Returns all books that don't have the title "Hello" and/or have the author "John Doe"
 * 	Book.objects.filter(Q.not(Q({ title__exact: "Hello" })).or(Q({ author__exact: "John Doe" })));
 */
function Q(queryObj) {
	var values = [];
	
	var whereStr = QuerySet.prototype.convertLookups(queryObj, values);
	
	return new Q.Obj(whereStr, values);
}

/**
 * The actual lookup object
 */
Q.Obj = function(whereStr, values) {
	this._where = whereStr;
	this._values = values;
}

/**
 * Returns a lookup object that represents the AND composition of this instance and rhs.
 * 
 */
Q.Obj.prototype.and = function(rhs) {
	return new Q.Obj("(" + this._where + ") AND (" + rhs._where + ")",
			this._values.concat(rhs._values));
}

/**
 * Returns a lookup object that represents the OR composition of this instance and rhs.
 */
Q.Obj.prototype.or = function(rhs) {
	return new Q.Obj("(" + this._where + ") OR (" + rhs._where + ")",
			this._values.concat(rhs._values));
}

/**
 * Returns the negated op.
 */
Q.not = function(op) {
	return new Q.Obj("NOT (" + op._where + ')', op._values);
}


/**
 * Field constructor
 * @class Field of a model.
 * 
 * @param {Object} params Parameters for this field 
 * @param {Boolean} params.primaryKey This field is the primary key.
 * @param {Boolean} params.unique This field is unique.
 * @param {Boolean} params.null This field can be null.
 * @param {Boolean} params.choices Array of [dbValue, displayValue] This field can hold exclusively values from choices.
 * @see Model
 */
function Field(params) {
	this._params = params || {};
	if (this._params['primaryKey']) {
		this._params['unique'] = true;
		this._params['null'] = false;
	}
	if (this._params['choices']) {
		this._choicesVals = [];
		var cs = this._params.choices;
		for (var i = 0; i < cs.length; ++i) {
			this._choicesVals.push(cs[i][0]);
		}
	}
}

/**
 * Converts the value, that was fetched from a database query result, to its
 * JavaScript equivalent. Callback is then called with the converted instance.
 */
Field.prototype.toJs = function(value, callback) {
	callback(value);
}

/**
 * Returns value as SQL formatted string
 */
Field.prototype.toSql = function(value) {
	return "'" + value + "'";
}

/**
 * Returns the params object of this field.
 */
Field.prototype.getParams = function() {
	return this._params;
}

/**
 * If value is valid returns true else returns an error msg string
 */
Field.prototype.validate = function(value) {
	if ((value === null || value === undefined) && (!this._params.null)) {
		return "Value must not be " + value;
	} else if (this._params['choices'] && this._choicesVals.indexOf(value) < 0) {
		return "Value must be one of (" + this._choicesVals.toString() + ")";
	}
	return true;
}

/**
 * Constructor for CharField
 * @class Model field that represents a string.
 * 
 * @param params
 *            {Object} maxLength: maximal length of string. defaults to 255.
 * @returns  {CharField}
 * 
 * @example
 * 
 */
function CharField(params) {
	params = params || {};
	params.maxLength = params.maxLength || 255;
	Field.call(this, params);
}

CharField.prototype = new Field();

CharField.prototype.validate = function(value) {
	
	if (value && value.length > this._params.maxLength) {
		return "Value exceeds max length of " + this._params.maxLength;
	}
	return Field.prototype.validate.call(this, value);
}

/**
 * Model field that represents an integer.
 * 
 * @param params
 *            See Field
 * @returns {IntegerField}
 */
function IntegerField(params) {
	Field.call(this, params);
}

IntegerField.prototype = new Field();

IntegerField.prototype.validate = function(value) {
	value = parseInt(value);
	if (value && isNaN(value)) {
		return "Value is not a valid integer";
	}
	if (this._params['primaryKey'] && !value) {
		return true;
	}
	return Field.prototype.validate.call(this, value);
}

IntegerField.prototype.toSql = function(value) {
	return value.toString();
}

IntegerField.prototype.toJs = function(value, callback) {
	callback(parseInt(value));
}

/**
 * Constructor of BooleanField
 * @class Model field that represents a boolean.
 * 
 * @param params
 *            See Field
 * @returns {BooleanField}
 */
function BooleanField(params) {
	Field.call(this, params);
}

BooleanField.prototype = new Field();

BooleanField.prototype.toSql = function(value) {
	return value ? 1 : 0;
}

BooleanField.prototype.toJs = function(value, callback) {
	callback(Boolean(value));
}


/**
 * Model field that represents a reference to another model.
 * 
 * @param model
 *            Model to be referenced
 * @param params
 *            See Field
 *            relatedName: name of the inverse relation field, that is added to the referenced model.
 * @returns {ForeignKey}
 */
function ForeignKey(model, params) {
	Field.call(this, params);
	
	this._refModel = model;
	
}

ForeignKey.prototype = new Field();

ForeignKey.prototype.toSql = function(value) {
	var sqlValue;
	var model = this._refModel.objects._model;
	var refPrimKey = model.Meta.primaryKey;
	
	sqlValue = value._id;
	
	return model[refPrimKey].toSql(sqlValue);
}

// TODO : change back toJs into a synchronous method?
ForeignKey.prototype.toJs = function(value, callback) {
//	var manager = new ModelManager(this._refModel.objects._model);
//	manager.get({ pk: value }, callback);
	callback(new SingleManager(this._refModel.objects._model, value));
}

ForeignKey.prototype.validate = function(value) {
	if (value) {
		if (!(value instanceof SingleManager)) {
			return "Value is not a SingleManager. You probably assigned a value directly to the field instead of using the set() method.";
		}
	}
	
	return Field.prototype.validate.call(this, value);
}

/**
 * Returns the referenced model.
 */
ForeignKey.prototype.getModel = function() {
	return this._refModel;
}

/**
 * Field that represents a many to many relationship.
 * @param model The referenced model
 * @param params See Field
 * @returns {ManyToManyField}
 */
function ManyToManyField(model, params) {
	Field.call(this, params);
	
	this._refModel = model;
}

ManyToManyField.prototype = new Field();

ManyToManyField.prototype.toSql = function(value) {
}

ManyToManyField.prototype.toJs = function(value, callback) {
	var interModel = this._params.through.objects._model;
	
	var foreignKey = ManyToManyField.getForeignKey(interModel, this._model);
	
	callback(new RelatedManagerPlaceholder(this._refModel.objects._model, foreignKey, interModel));
}

/**
 * find field of interModel that references the thisModel.
 */ 
ManyToManyField.getForeignKey = function(interModel, thisModel) {
	var foreignKey;
	for (name in interModel) {
		var type = interModel[name];
		if (type instanceof ForeignKey) {
			if (type._refModel.objects._model == thisModel) {
				foreignKey = name;
				break;
			}
		}
	}
	return foreignKey;
}

ManyToManyField.prototype._createDefaultThrough = function(thisModel, fieldName) {
	var modelFkName = this._model.Meta.dbTable;
	var refModelFkName = this._refModel.objects._model.Meta.dbTable;
	
	var throughDef = {
		Meta: {
			dbTable: modelFkName + "_" + fieldName
		}
	};
	throughDef[modelFkName] = new ForeignKey(thisModel, { relatedName: '+' });
	throughDef[refModelFkName] = new ForeignKey(this._refModel, { relatedName: '+' });
	
	return new Model(throughDef);
}

/**
 * Returns the referenced model.
 */
ManyToManyField.prototype.getModel = function() {
	return this._refModel;
}


/**
 * Meta Model constructor
 * @class Meta Model Class. Used to define database models in an object-oriented way.
 * @param {Object} modelDef The model definition, that is, field definitions and meta data
 * @returns {Function} Model instance constructor
 * @see Field
 * @example
 * // define a model
 * var TYPE_CHOICES = [
 *      [1, "Book"],
 *      [2, "Brochure"],
 *      [3, "Flyer"]
 * ];
 * 
 * var Literature = new Model({
 *     Meta: {
 *         dbTable: "literature_types"
 *     },
 * 
 *     title: new CharField(),
 *     author: new CharField({ maxLength: 50 }),
 *     orderId: new CharField({ maxLength: 10, primaryKey: true }),
 *     type: new IntegerField({ choices: TYPE_CHOICES })
 * });
 * 
 * // use the model to create a new instance
 * var literature = new Literature({
 *     title: "Alice's Adventures in Wonderland",
 *     author: "Lewis Carroll",
 *     orderId: 'AA',
 *     type: 1
 * });
 */
function Model(modelDef) {

	if (!modelDef['Meta']) {
		throw "Meta information missing";
	}
	if (!modelDef.Meta.dbTable) {
		throw "Meta table name missing";
	}
	Model._completeMetaInfo(modelDef);
	Model._preProcessFields(modelDef);
	
	var modelManager = new ModelManager(modelDef);
	
	/** 
	 * create model instance constructor 
	 * @private
	 */
	var newModel = function(values) {
		this._new = true;
		
		Model._initInstance.call(this, modelDef, modelManager, values);
	}
	
	/**
	 * The default model manager to be used for querys
	 * @static
	 * @type ModelManager
	 * @name objects
	 * @memberOf Model
	 */
	newModel.objects = modelManager;
	newModel.getFields = Model._getFields;
	
	Model._postProcessFields(newModel);
	
	return newModel;
}

/**
 * Initializes a new model instance.
 */
Model._initInstance = function(modelDef, modelManager, values) {
	this._model = modelDef;
	this._manager = modelManager;
	
	function getDisplayFunc(name) {
		return function() {
			return this['_' + name + 'Choices'][this[name]];
		}
	}

	if (!values) {
		values = {}
	}
	
	// assign initial values
	var name;
	for (name in values) {
		if (modelDef[name]) {
			this[name] = values[name];
		} else {
			throw "Model has no field named '" + name + "'";
		}
	}
	
	// init fields
	for (name in modelDef) {
		
		if (name != "Meta") {
			
			var type = modelDef[name];
			if (type instanceof Field) {
				if (type.getModel && (!this[name] || !this[name].set)) {
					Model.createPlaceholder(this, name, type, values[name]);
				}
				
				// fill with default values
				if (this[name] === undefined) {
					this[name] = type._params['default'];
					if (this[name] instanceof Function) {
						this[name] = this[name]();
					}
				}
				// create get<Name>Display() method for fields with choices.
				var choices = modelDef[name].getParams()['choices'];
				if (choices) {
					var choicesObj = {};
					for (var i = 0; i < choices.length; ++i) {
						choicesObj[choices[i][0]] = choices[i][1];
					}
					this['_' + name + 'Choices'] = choicesObj;
					this['get' + name[0].toUpperCase() + name.substr(1) + 'Display'] = getDisplayFunc(name);
				}
			} else {
				// copy everything that is not a Field from def
				this[name] = type;
			}
		}
	}

	this._old_id = this[modelDef.Meta.primaryKey];
	
	Model.replacePlaceholders(this);
	
	// create methods
	this.save = Model._save;
	this.validate = Model._validate;
}

/**
 * Fills neccessary default params for the fields and adds inverse relations.
 */
Model._preProcessFields = function(modelDef) {
	for (name in modelDef) {
		var type = modelDef[name];
		if (type instanceof Field) {
			
			var defaultName = name;
			
			if (type instanceof ForeignKey || type instanceof ManyToManyField) {
				type._model = modelDef;

				var relName = type._params['relatedName'] = type._params['relatedName'] || (modelDef.Meta.dbTable + 'Set');
				
				defaultName += "_id";
				
				// add inverse relation to referenced model
				if (relName[relName.length-1] != '+') {
					var refModelDef = type._refModel.objects._model;
					refModelDef[relName] = new RelatedManagerPlaceholder(modelDef, name);
				}
			}
			
			type._params['dbColumn'] = type._params['dbColumn'] || defaultName;
			type._params['verboseName'] = type._params['verboseName'] || name[0].toUpperCase() + name.slice(1).replace(/([A-Z])/g, " $1");
		}
	}
}

/**
 * Completes Field information after the model constructor is created.
 */
Model._postProcessFields = function(model) {
	var modelDef = model.objects._model;
	for (name in modelDef) {
		var type = modelDef[name];
		// Create default through model for ManyToManyFields
		if (type instanceof ManyToManyField) {
			type._params.through = type._params.through || type._createDefaultThrough(model, name);
			type._refModel.objects._model[type._params.relatedName]._joinModelDef = type._params.through.objects._model;
		}
	}
}


/**
 * Replaces all placeholders by their proper managers
 * @private
 */
Model.replacePlaceholders = function(instance) {
	var id = instance[instance._model.Meta.primaryKey];
	if (!id) {
		return;
	}
	for (name in instance._model) {
		var type = instance[name];
		if (type instanceof RelatedManagerPlaceholder) {
			instance[name] = type.getManager(instance._model, id);
		}
	}	
}

/**
 * Create a placeholder for the instance for the given field and initialize it.
 * @param {Model} instance The model instance
 * @param {String} name Name of the field
 * @param {Field} type Type of the field
 * @param values Initial values for the placeholder
 * @private
 */
Model.createPlaceholder = function(instance, name, type, values) {
	if (type.getParams().through) {
		// ManyToManyField
		var interModel = type.getParams().through.objects._model;
		var foreignKey = ManyToManyField.getForeignKey(interModel, instance._model);
		
		instance[name] = new RelatedManagerPlaceholder(type.getModel().objects._model, foreignKey, interModel, values);
	} else {
		// ForeignKey
		//instance[name] = new SingleManagerPlaceholder(...);
	}
}

/**
 * Completes needed meta information about a model definition.
 */
Model._completeMetaInfo = function(modelDef) {
	// search for primary key
	for (name in modelDef) {
		var type = modelDef[name];
		if (type instanceof Field && type._params['primaryKey']) {
			modelDef.Meta.primaryKey = name;
			break;
		}
	}
	if (!modelDef.Meta['primaryKey']) {
		modelDef.Meta.primaryKey = 'id';
		if (!modelDef.id) {
			modelDef.id = new IntegerField({
				primaryKey: true,
			});
		}
	}
}

/**
 * Save method that every model instance has.
 * @name save
 * @function
 * @param {Function} onComplete Callback when saving is finished. It is passed the saved model instance.
 * @memberOf Model.prototype
 * @example
 * var Literature = new Model({ ... });
 * 
 * var literature = new Literature({ ... });
 * 
 * // save to database
 * literature.save();
 */
Model._save = function(onComplete) {
	var validationValue = this.validate();
	if (validationValue !== true) {
		throw validationValue;
	}
	
	this._manager.save(this, onComplete);
}

/**
 * Validation method that every model instance has. Validates every field of the model.
 * @name validate
 * @function
 * @memberOf Model.prototype
 * @returns {Boolean|String} true if every field is valid. If that is not the case the validation error message is returned.
 */
Model._validate = function() {
	for (name in this._model) {
		var fieldType = this._model[name];
		if (fieldType instanceof Field) {
			var value = this[name];
			var validationValue = fieldType.validate(value);
			if (validationValue !== true) {
				return validationValue;
			}
		}
	}
	return true;
}

/**
 * Returns a dictionary of field names and types
 * @name getFields
 * @function
 * @memberOf Model
 * @returns {Object} { fieldName1: FieldType1, fieldName2: FieldType2, ... }
 * @see Field
 */
Model._getFields = function() {
	// TODO : cache this?
	
	var scheme = {};

	for (name in this.objects._model) {
		var type = this.objects._model[name];
		if (type instanceof Field) {
			scheme[name] = type;
		}
	}
	
	return scheme;
}