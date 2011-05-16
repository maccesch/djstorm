





.. Classes and methods
.. _class-QuerySet:

Class QuerySet
================================================================================

..
   class-title


Class that represents a list of model instances that are retrieved by a
database query.



.. js:class:: QuerySet(modelDef, manager)


    
    :param Object modelDef: 
        Definition of the model. See Model. 
    
    :param ModelManager manager: 
        The model manager of the model that is the base for this query set. 
    









    



.. seealso::

    :ref:`Model <class-Model>`





Methods
-------

..
   class-methods


all 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Fetches all instances of the model which are in the db. This method actually
hits the database and evaluates the query set.

.. js:function:: QuerySet.prototype.all (onComplete)

    
    :param  onComplete: 
        {Function}
           Callback that is called with a list of all instances. 
    












    



clone 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Creates a deep copy of this object (except cache).

.. js:function:: QuerySet.prototype.clone ()












    



convertLookups 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Converts a lookup object into an SQL WHERE condition.

.. js:function:: QuerySet.prototype.convertLookups (queryObj, values)

    
    :param  queryObj: 
         
    
    :param  values: 
         
    












    



delete 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Deletes all objects this query set represents.

.. js:function:: QuerySet.prototype.delete (onComplete)

    
    :param  onComplete: 
        {Function} Callback that is called when deletion is done. No arguments are passed. 
    












    



exclude 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Returns a QuerySet which represents all instances of the model which do NOT
validate against queryObj. This QuerySet remains unchanged.

.. js:function:: QuerySet.prototype.exclude (queryObj)

    
    :param  queryObj: 
        {Object}
           field lookups or Q object. 
    












    



filter 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Returns a QuerySet which represents all instances of the model which validate
against queryObj. This QuerySet remains unchanged.

.. js:function:: QuerySet.prototype.filter (queryObj)

    
    :param  queryObj: 
        {Object}
           field lookups or Q object. 
    












    



get 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Fetches the object that machtes the lookup parameters given by queryObj. The format of queryObj is the same as in filter().
If no or more than one result is found, an exception is thrown.

.. js:function:: QuerySet.prototype.get (queryObj, onComplete)

    
    :param  queryObj: 
        {Object}
           field lookups or Q object. 
    
    :param  onComplete: 
        {Function}
           Callback that is called with the fetched instance. 
    












    



orderBy 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Returns a new QuerySet that is ordered by the given fields.

.. js:function:: QuerySet.prototype.orderBy ()












    


.. code-block:: javascript

	Entry.objects.orderBy('-pub_date', 'headline').all(...);





    


