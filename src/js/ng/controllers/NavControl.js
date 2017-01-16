angular.module('navApp').controller('NavControl',['$scope','$sce','$sanitize','sockFactory',function($scope,$sce,$sanitize,sockFactory){
		
    var visualAlerts = ['HUR','TOR','TOW','WRN','SEW','WIN','FLO','WAT','SVR','SPE','HWW'];
	var needMap = false;
	
	$scope.header = "";
	$scope.seconds = 60;
	$scope.currentSlide = {};
	$scope.alert = "";
	$scope.alerts = {};
	
	function interval(){
		sockFactory.emit('getNextSlide', {});
	};
	
	function refreshScope(data){
		$scope.header = data.kiosk.name;
		$scope.seconds = data.kiosk.seconds;
		$scope.currentSlide = data.slide.data;
		$scope.slideHtml = function(slideData){
			if(slideData.sourceType === 'url'){
				return '<iframe ng-src="{{slideData.source}}"></iframe>';
			} else if(slideData.sourceType === 'folder' || slideData.sourceType === 'reddit'){
				return '<div class="slideImage" style="background-image:'+slideData.source+'"></div>';
			}
		};
	}
    sockFactory.on('init',function(data){
        // Start loop to switch slide view with next url from server
		refreshScope(data);
		$scope.slideInterval = setInterval(interval,$scope.seconds);
    });
	
	sockFactory.on('alert',function(data){
		$scope.alerts = data;
		for(var i in data.alerts){
			$scope.alert += (i>0?', ':'')+data.alerts[i].description;
			var type = data.alerts[i].type;
			if(visualAlerts.indexOf(type) !== -1){
				needMap = true;
			}
		}
	});
	
	sockFactory.on('nextSlide', function(data){
		refreshScope(data);
	});
	
	sockFactory.on('prevSlide', function(data){
		refreshScope(data);
	});
	
}]);
