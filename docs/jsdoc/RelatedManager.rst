





.. Classes and methods
.. _class-RelatedManager:

Class RelatedManager
================================================================================

..
   class-title


Class that represents all instances of modelDef whose field named foreignKey has the value id.
Also used for the reverse relation of ForeignKey.



.. js:class:: RelatedManager(modelDef, relModelDef, foreignKey, id, joinModelDef)


    
    :param Object modelDef: 
        Model definition. See :ref:`Model <class-Model>`. 
    
    :param Object relModelDef: 
        Model definition of the related model. 
    
    :param String foreignKey: 
        Name of the foreign key field.
If joinModelDef is provided then foreignKey is a column of the join table and the join table is joined with the modelDef table.
If joinModelDef is not given, foreignKey is a column in the modelDef table. 
    
    :param  id: 
        Value of the foreignKey column, that the related model instances have in common 
    
    :param Object joinModelDef: 
        Model definition of an intermediate join table. This is used for ManyToManyFields. 
    









    



.. seealso::

    :ref:`Model <class-Model>`





    


