angular.module('navApp').controller('NavControl',['$scope','$sce','$sanitize','sockFactory','$interval',function($scope,$sce,$sanitize,sockFactory,$interval){
		
    var visualAlerts = ['HUR','TOR','TOW','WRN','SEW','WIN','FLO','WAT','SVR','SPE','HWW'];
	var needMap = false;
	
	$scope.header = "";
	$scope.seconds = 60;
	$scope.slideData = {};
	$scope.alert = "";
	$scope.alerts = {};
	$scope.time = new Date().toString();
	
	var updateTime = function(){
		$scope.time = new Date();
	};
	
	var updateSlide = function(){
		sockFactory.emit('getNextSlide', {});
	};
	
	updateTime();
	$interval(updateTime,1000);
	
	function refreshScope(data){
		$scope.header = data.kiosk.name;
		$scope.seconds = data.kiosk.seconds;
		$scope.slideData = data.slide.data;
		$scope.slideData.trustedSource = $sce.trustAsResourceUrl($scope.slideData.source);
		
	}
    sockFactory.on('init',function(data){
        // Start loop to switch slide view with next url from server
		console.log("Initializing client with: ");
		console.log(data);
		
		sockFactory.emit('clientInfo',{
			browser:{
				height:$("#main").height(),
				width:$("#main").width()
			}
		});
		
		refreshScope(data);
		
		setInterval(function(){
			sockFactory.emit('getNextSlide', {});
		},$scope.seconds*1000);
    });
	
	sockFactory.on('alert',function(data){
		$scope.alerts = data;
		$scope.alert = "";
		
		for(var i in data.alerts){
			$scope.alert += (i>0?', ':'')+data.alerts[i].description;
			var type = data.alerts[i].type;
			if(visualAlerts.indexOf(type) !== -1){
				needMap = true;
			}
			
		}
	});
	
	sockFactory.on('nextSlide', function(data){
		console.log("Retrieved next slide.");
		console.log(data);
		if(!data.slide.data.source){
			sockFactory.emit('getNextSlide',{});
		} else {
			refreshScope(data);
		}
	});
	
	sockFactory.on('prevSlide', function(data){
		refreshScope(data);
	});
	
}]);
