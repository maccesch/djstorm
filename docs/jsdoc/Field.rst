





.. Classes and methods
.. _class-Field:

Class Field
================================================================================

..
   class-title


Field of a model.



.. js:class:: Field(params)


    
    :param Object params: 
        Parameters for this field 
    
    :param Boolean params.primaryKey: 
        This field is the primary key. 
    
    :param Boolean params.unique: 
        This field is unique. 
    
    :param Boolean params.null: 
        This field can be null. 
    
    :param Boolean params.choices: 
        Array of [dbValue, displayValue] This field can hold exclusively values from choices. 
    









    



.. seealso::

    :ref:`Model <class-Model>`





Methods
-------

..
   class-methods


getParams 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Returns the params object of this field.

.. js:function:: Field.prototype.getParams ()












    



toJs 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Converts the value, that was fetched from a database query result, to its
JavaScript equivalent. Callback is then called with the converted instance.

.. js:function:: Field.prototype.toJs (value, callback)

    
    :param  value: 
         
    
    :param  callback: 
         
    












    



toSql 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Returns value as SQL formatted string

.. js:function:: Field.prototype.toSql (value)

    
    :param  value: 
         
    












    



validate 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

If value is valid returns true else returns an error msg string

.. js:function:: Field.prototype.validate (value)

    
    :param  value: 
         
    












    




    


