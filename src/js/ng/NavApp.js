'use strict';

/**
 * @ngdoc overview
 * @name navApp
 * @description
 * # navApp
 *
 * Main module of the application.
 */
angular
	.module('navApp', [
		'ngMessages',
		'ngResource',
		'ngSanitize'
	]
			
);
//.config(function($stateProvider){
//	$stateProvider.state("main",{
//		views:{
//			"header":{
//				template:"{{greeting}}"
//			},
//			"alert":{
//				
//			},
//			"slide":{
//				
//			},
//			"footer":{
//				template:"<p>{{currentSlide.name}}</p><p>{{time}}</p>"
//			}
//		}
//	});
//	
//}).run([
//	'$rootScope','$state','$stateParams',
//	
//    function($rootScope,$state,$stateParams)
//    {
//        $rootScope.$state = $state;
//        $rootScope.$stateParams = $stateParams;
//    }
//]);