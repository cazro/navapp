angular.module('navApp').controller('NavControl',['$scope','$sce','$sanitize','sockFactory','$interval',function($scope,$sce,$sanitize,sockFactory,$interval){
	$scope.alert = "";
    $scope.alerts = {};
	$scope.header = "";
	$scope.seconds = 60;
	$scope.slideData = {};
	$scope.time = new Date();
    
	var slideInterval;

	var timeInterval = $interval(function(){
        $scope.time = new Date();
    },500);
		
	function refreshScope(data){
		$scope.header = data.kiosk.name;
		$scope.seconds = data.kiosk.seconds;
		$scope.slideData = data.slide.data;
        if($scope.slideData.source){
            $scope.slideData.trustedSource = $sce.trustAsResourceUrl($scope.slideData.source);
        }
	}
    
    sockFactory.on('init',function(data){
        // Start loop to switch slide view with next url from server
		console.log("Initializing client with: ");
		console.log(data);
		
		sockFactory.emit('clientInfo',{
			browser:{
				height:$("body").height(),
				width:$("body").width()
			}
		});
		
		refreshScope(data);
		handleAlerts(data.alerts);
		
		if(!angular.isDefined(slideInterval)){
			slideInterval = $interval(function(){
				sockFactory.emit('getNextSlide', {});
			},$scope.seconds*1000);
		}
    });
	
	sockFactory.on('alert',function(data){
		console.log("Got weather alert.");
		console.log(data);
		handleAlerts(data);
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
	
	function handleAlerts(data){
		$scope.alerts = data;
		$scope.alert = "";
		
		for(var i in data.alerts){
			$scope.alert += (i>0?', ':'')+data.alerts[i].description;
		}
        
		if($scope.alert){
			$('#main').height('85vh');
		} else {
			$('#main').height('88vh');
		}
	}
}]);
