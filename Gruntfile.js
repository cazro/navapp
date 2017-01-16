module.exports = function(grunt) {

	var angularFiles = [
		'**/*.min.js',
		'!**/*slim*',
		'!**/sizzle*'
	];
	var jsAppFiles = [
		'src/js/ng/**/*.js',
		'src/js/ng/*.js'
	];
	
	var jsSrcFiles = angularFiles.concat(jsAppFiles);
	
	// Project configuration.
	grunt.initConfig({
	  
		pkg: grunt.file.readJSON('package.json'),

		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			prod:{
				files:[
					{
						src: 'build/<%= pkg.name %>.js',
						dest: 'public/javascripts/ng/<%= pkg.name %>.min.js'
					},
					{
						src: 'build/angular.js',
						dest: 'public/javascripts/ng/angular.min.js'
					}
				]
				
			}
		},

		concat: {
			dev:{
				files:[
					{
						src: jsAppFiles,
						dest: 'build/<%= pkg.name %>.js'
					},
					{
						src: angularFiles,
						dest: 'build/angular.js'
					}
				]
			}
		},
		
		copy: {
			dist:{
				files:[
					
					{
						expand: true,
						flatten:true,
						cwd:'bower_components',
						src:['**/*.min.js','!**/*slim*','!**/sizzle*'],
						dest:'public/javascripts/lib/',
						
					},
					{
						expand: true,
						flatten:true,
						cwd:'bower_components',
						src:['**/*.min.js','!**/*slim*','!**/sizzle*'],
						dest:'src/js/lib/',
					}
				]
			}
		}
	});

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-copy');
	// Default task(s).
	grunt.registerTask('default', ['concat:dev','uglify:prod','copy:dist']);
	grunt.registerTask('build-prod',['uglify:prod']);
};