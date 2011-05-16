==========
Quickstart
==========

Here is a complete example of how to use djstorm.js

Include the script:

.. code-block:: html

    <script type="text/javascript" src="/js/djstorm.js"></script>
    
    <script type="text/javascript">
    
Define the model:

.. code-block:: javascript

    var Language = new Model({
        Meta: {
            dbTable: "languages"
        },
        
        name: new CharField({ maxLength: 50 }),
        shortcut: new CharField({ maxLength: 5, primaryKey: true }),
        
        toString: function() {
            return this.name;
        }
    });
        
And another one:

.. code-block:: javascript
        
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
        type: new IntegerField({ choices: TYPE_CHOICES }),
        languages: new ManyToManyField(Language, { relatedName: 'literatureTypes' }),

        toString: function() {
            return this.title + " by " + this.author;
        }
    });
        
.. NOTE::
	Automatic creation of tables isn't supported yet. So for now you have to create the appropriate tables yourself.

Now create some instances:

.. code-block:: javascript
        
    var en = new Language({
        name: "English",
        shortcut: "en"
    });
    en.save();
    
    var de = new Language({
        name: "German",
        shortcut: "de"
    });
    de.save();
    
    
    var book = new Literature({
        title: "Alice's Adventures in Wonderland",
        author: "Lewis Carroll",
        orderId: 'AA',
        type: 1,
        languages: [en, de]
    });
    book.save();

Or make some queries:

.. code-block:: javascript
        
    Literature.objects.filter({ author__exact: "Lewis Carroll" }).all(processLiterature);

    function processLiterature(instances) {
        for (var i = 0; i < instances.length; ++i) {
            instance = instances[i];
            instance.languages.set([en]);
            instance.author = "Llorrac Siwel";
            instance.save();
            document.body.innerHTML += instances[i].toString();
        }
    }
    
.. code-block:: html
    
    </script> 