===================================================
Django like Object Relational Mapper for JavaScript
===================================================

This ORM is similar to the very elegant one of Django but this one is asynchronous.

For maximum compatibility it is completely framework agnostic.

Currently only the HTML5 Local Database is supported as backend. But due to the asynchronous architecture anything is thinkable.

Please note, that this is still in alpha stage. But feel free to try it out. You should already be able to use it in some real situations.

Any help in developing this further is welcome.

Installation
============

Since there are no required libraries or frameworks just add the script to your project.

Quickstart
==========

Here is a complete example of how to use djstorm.js

::

	<script type="text/javascript" src="/js/djstorm.js"></script>
	<script type="text/javascript">
		
		// please note: automatic creation of tables isn't supported yet. So for now you have to create tha approriate tables yourself.
		
		// define the models
		
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
	
	
		// create instances
		
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
		
		
		// make queries
		
		function processLiterature(instances) {
			for (var i = 0; i < instances.length; ++i) {
				instance = instances[i];
				instance.languages.set([en]);
				instance.author = "Llorrac Siwel";
				instance.save();
				document.body.innerHTML += instances[i].toString();
			}
		}
		
		Literature.objects.filter({ author__exact: "Lewis Carroll" }).all(processLiterature);
	</script> 