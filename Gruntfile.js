module.exports = function(grunt) {

	var jsVendorFiles = [
		'bower_components/jQuery/dist/jquery.js'
	];
	var jsAppFiles = [
		'src/js/socketEvents.js'
	];
	
	var jsSrcFiles = jsVendorFiles.concat(jsAppFiles);
	
	// Project configuration.
	grunt.initConfig({
	  
		pkg: grunt.file.readJSON('package.json'),

		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			prod:{
				src: 'build/<%= pkg.name %>.js',
				dest: 'public/javascripts/<%= pkg.name %>.min.js'
			}
		},

		concat: {
			dev:{
				src: jsSrcFiles,
				dest: 'build/<%= pkg.name %>.js'
			}
		}
	});

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	// Default task(s).
	grunt.registerTask('default', ['concat:dev','uglify:prod']);
	grunt.registerTask('build-prod',['uglify:prod']);
};