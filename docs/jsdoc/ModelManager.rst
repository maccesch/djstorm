





.. Classes and methods
.. _class-ModelManager:

Class ModelManager
================================================================================

..
   class-title


Model Manager class that provides the actual database operations for models



.. js:class:: ModelManager(modelDef)


    
    :param Object modelDef: 
        The model definition. See :ref:`Model <class-Model>`. 
    









    







Methods
-------

..
   class-methods


save 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Saves a model instance to the db. Called by Model's save.

.. js:function:: ModelManager.prototype.save (modelInstance, onComplete)

    
    :param  modelInstance: 
        The model instance to save 
    
    :param Function onComplete: 
        callback function that is called when instance has been
           saved. Takes the saved instance as parameter. 
    










.. seealso::

    :ref:`Model <class-Model>`



    




    


