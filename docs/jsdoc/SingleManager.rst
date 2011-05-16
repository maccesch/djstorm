





.. Classes and methods
.. _class-SingleManager:

Class SingleManager
================================================================================

..
   class-title


Proxy for a single model instance, that should be loaded lazily. Used for ForeignKeys. The actual instance is loaded when get() is called.



.. js:class:: SingleManager(modelDef, id)


    
    :param Object modelDef: 
        Model definition of the base model. See :ref:`Model <class-Model>`. 
    
    :param  id: 
        The value of the primary key of the instance this object represents. 
    









    







Methods
-------

..
   class-methods


get 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Fetches the instance from the database and calls callback with it as argument.

.. js:function:: SingleManager.prototype.get (callback)

    
    :param Function callback: 
        A callback function that is called when the instance that this proxy represents was fetched from the database.
Passes the instance as parameter to the callback. 
    












    



set 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Sets the instance

.. js:function:: SingleManager.prototype.set (instance)

    
    :param Model instance: 
        The instance this proxy reprents 
    












    




    


