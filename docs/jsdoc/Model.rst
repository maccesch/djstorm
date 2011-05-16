





.. Classes and methods
.. _class-Model:

Class Model
================================================================================

..
   class-title


Meta Model Class. Used to define database models in an object-oriented way.



.. js:class:: Model(modelDef)


    
    :param Object modelDef: 
        The model definition, that is, field definitions and meta data 
    



    
    :returns: (*Function*) Model instance constructor
    







    

Examples
--------


.. code-block:: javascript

	// define a model
	var TYPE_CHOICES = [
	     [1, "Book"],
	     [2, "Brochure"],
	     [3, "Flyer"]
	];
	
	var Literature = new Model({
	    Meta: {
	        dbTable: "literature_types"
	    },
	
	    title: new CharField(),
	    author: new CharField({ maxLength: 50 }),
	    orderId: new CharField({ maxLength: 10, primaryKey: true }),
	    type: new IntegerField({ choices: TYPE_CHOICES })
	});
	
	// use the model to create a new instance
	var literature = new Literature({
	    title: "Alice's Adventures in Wonderland",
	    author: "Lewis Carroll",
	    orderId: 'AA',
	    type: 1
	});




.. seealso::

    :ref:`Field <class-Field>`





Methods
-------

..
   class-methods


getFields (*static*)
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Returns a dictionary of field names and types

.. js:function:: Model.getFields ()



    
    :returns: (*Object*) { fieldName1: FieldType1, fieldName2: FieldType2, ... } 
    








.. seealso::

    :ref:`Field <class-Field>`



    



save 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Save method that every model instance has.

.. js:function:: Model.prototype.save (onComplete)

    
    :param Function onComplete: 
        Callback when saving is finished. It is passed the saved model instance. 
    












    


.. code-block:: javascript

	var Literature = new Model({ ... });
	
	var literature = new Literature({ ... });
	
	// save to database
	literature.save();




validate 
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,

Validation method that every model instance has. Validates every field of the model.

.. js:function:: Model.prototype.validate ()



    
    :returns: (*Boolean|String*) true if every field is valid. If that is not the case the validation error message is returned. 
    










    




    

Attributes
----------

..
   class-attributes



.. js:attribute:: Model.objects
(*static*)  



The default model manager to be used for querys








    





