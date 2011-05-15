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

Here is a complete example of how to use djstorm.js::

<script type="text/javascript" src="/js/djstorm.js"></script>
<script type="text/javascript">
	var Language = new Model({
		Meta: {
			dbTable: "languages"
		},
		
		name: new CharField({ maxLength: 50 }),
		shortcut: new CharField({ maxLength: 5, primaryKey: true, verboseName: "Abkürzung" }),
		
		toString: function() {
			return this.name;
		}
	});
	
	
	var TYPE_CHOICES = [
        [1, "Buch"],
        [2, "Broschüre"],
        [3, "CD"],
        [4, "DVD"],
        [5, "VHS"]
	];

	var LiteratureType = new Model({
		Meta: {
			dbTable: "literature_types"
		},
		
		title: new CharField({ verboseName: 'Titel' }),
		shortcut: new CharField({ maxLength: 6, verboseName: 'Abkürzung' }),
		orderId: new CharField({ maxLength: 10, primaryKey: true, verboseName: 'Bestellnr' }),
		type: new IntegerField({ choices: TYPE_CHOICES, verboseName: 'Typ' }),
		languages: new ManyToManyField(Language, { relatedName: 'literatureTypes', verboseName: 'Sprachen' })
	});

</script> 