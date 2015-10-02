$(document).ready(function(){
    
	  //function to retrieve map from google - London coordinates are being used with zoom level 14 - alternatively, use google geo location to check your position automatically
    function initialize() {
        var mapOptions = {
          center: { lat: 51.5230557, lng: -0.0628913}, 
          zoom: 14
        };

        var map = new google.maps.Map(document.getElementById('map-canvas'),
            mapOptions);

        setMarkers(map, busStops);
      }

      //The array where to store the markers
      var markers = [];

     //create an array containing all stops positions and name so as to show them on the map
     var busStops = [];

      //create an array containing all bus info - arrival times 
     var busInfo = [];
    
     //create an array to contain new marker info-window
     var infos = [];

      //create an array to contain bus routes
     var routes = [];

     var busRoute = []

     var clickTriggeredTwice = false;

     //last update and serviceDisruption info
     var lastUpdated;
     var serviceDisruption = [];
     var importantMessages = [];
     var criticalMessages  = [];

     //set bus not found error message
     var noBusErrorMessage = "Ouch! No bus arrival times...try later!";

     //get bus info for the map markers
     var urlBusStopMarkers = "http://digitaslbi-id-test.herokuapp.com/bus-stops?northEast=51.52783450,-0.04076115&southWest=51.51560467,-0.10225884&callback=?";
     $.ajax({
      url: urlBusStopMarkers,
      dataType:'json',
      type:'get',
      timeout: 3000,
      cache: false,

      success:function(data){

         $(data.markers).each(function(index, value) {  

            busStops[index] = [value.name, value.stopIndicator , value.lat , value.lng, index, value.towards, value.direction, value.smsCode, value.id, value.routes];
              
         });     

      },
      error: function(xhr) {  
          $(".errorLoadingData").html('There was an error loading the data:' + '<p>' +  'Request Status: ' + xhr.status + ' - ' + ' Status Text: ' + xhr.statusText + ' & ' + xhr.responseText + '</p>' ).css("display","block");    
      }

     });

   

    //function to retrieve Buses info from API
    function retrieveBusInfo(busId,callback){

      var urlBusArrivals = "http://digitaslbi-id-test.herokuapp.com/bus-stops/"+ busId +"?northEast=51.52783450,-0.04076115&southWest=51.51560467,-0.10225884&callback=?";
     
     //create an array containing all bus arrivals 
     $.ajax({
      url: urlBusArrivals,
      dataType:'json',
      type:'get',
      timeout: 3000,
      cache: false,

      success:function(data){

         lastUpdated = data.lastUpdated;
         infoMessages = data.serviceDisruptions.infoMessages;
         importantMessages = data.serviceDisruptions.importantMessages;
         criticalMessages  = data.serviceDisruptions.criticalMessages;

         $(data.arrivals).each(function(index, value) {

            busInfo[index] = [value.routeName, value.destination, value.estimatedWait, value.scheduledTime];

         });

        var busArrivalsInfo = callback && callback.call(this,busInfo);          
      },
      error: function(xhr) {
          console.log("test in");     
        $(".errorLoadingData").html('There was an error loading the data:' + '<p>' +  'Request Status: ' + xhr.status + ' - ' + ' Status Text: ' + xhr.statusText + ' & ' + xhr.responseText + '</p>' ).css("display","block"); 
      }
        
     });

     }

      
      function setMarkers(map, busStops) {
        // Add markers to the map
        // Marker sizes are expressed as a Size of X,Y
        // where the origin of the image (0,0) is located
        // in the top left of the image.

        // Origins, anchor positions and coordinates of the marker
        // increase in the X direction to the right and in
        // the Y direction down.
        var image = {
          url: 'images/bus_marker_img.png',
          // This marker is 20 pixels wide by 32 pixels tall.
          size: new google.maps.Size(25, 25),
          // The origin for this image is 0,0.
          origin: new google.maps.Point(0,0),
          // The anchor for this image is the base of the flagpole at 0,32.
          anchor: new google.maps.Point(0, 32)
        };

        // Shapes define the clickable region of the icon.
        // The type defines an HTML &lt;area&gt; element 'poly' which
        // traces out a polygon as a series of X,Y points. The final
        // coordinate closes the poly by connecting to the first
        // coordinate.
        var shape = {
            coords: [1, 1, 1, 20, 18, 20, 18 , 1],
            type: 'poly'
        };

        //creates markers on the map according to the coordinates provided in the array
        for (var i = 0; i < busStops.length; i++) {

          var busStop = busStops[i];
    
          //check if bus stops are not in use - checking both stop indicator and towars         
          if(busStop[5] !== null){

            if(busStop[1] !== null){    

            var myLatLng = new google.maps.LatLng(parseFloat(busStop[2]), parseFloat(busStop[3]));
            var marker = new google.maps.Marker({
                position: myLatLng,
                map: map,
                icon: image,
                shape: shape,
                busRoutes: busStop[9],
                busId: busStop[8],
                towards: busStop[5],
                direction: busStop[6],
                title: busStop[0],
                stopIndicator: busStop[1],
                zIndex: busStop[4]
            });

            //Push the marker in to the 'markers' array
            markers.push(marker);   

            //marker info to be set
            var contentString = '<span class="iconBus"></span><span class="infowindowHeader">'+ marker.title + '</span>' +
            '<span class="subItemInfoWindow first">'+ "<b>Stop:</b> " + marker.stopIndicator  + '</span>' +
            '<span class="subItemInfoWindow">'+ "<b>Towards:</b> " + marker.towards  + '</span>' +
            '<span class="subItemInfoWindow">'+ "<b>Route:</b> " + getBusRoutes(marker.busRoutes)  + '</span>' +
            '<span class="subItemInfoWindow">'+ "<b>Direction:</b> " + marker.direction  + '</span>';

            var infowindow = new google.maps.InfoWindow({
                content: contentString,
                maxWidth: 200
            });

            //initialise the marker click counter
            var markerClickCounter = 0;
    
            //checks if the budId is a number before setting the values for each marker
            if($.isNumeric(busStop[8])){

              var markerClickedTwice = false;

              //add event listener to each marker and handle the click
              addListenersToMarkers(map, marker, contentString, infowindow, busStop);  
            }
    
          }//end if

        }//end if

       }//end for loop    
 
     }

      //Add a DOM listener that will execute the initialize() function when the page is loaded
      google.maps.event.addDomListener(window, 'load', initialize);


       //add event listener to each marker and handle the click coming from both the marker and the select option selected
      function addListenersToMarkers(map, marker, contentString, infowindow, busStop){

           //handles click on multiple bus stops 
            google.maps.event.addListener(marker,'click', (function(marker,contentString,infowindow){ 

              return function() {          
                       
                  retrieveBusInfo(this.busId, function(busInfo){

                      ++markerClickCounter;             

                     if(!clickTriggeredTwice){

                      //if the same google markers is clicked more than once don't perform the click event
                      if(markerClickCounter === 1){              
                                  
                        //retrieve routes of the bus stop selected
                       routes = getBusRoutes(marker.busRoutes);  

                       //function to populate the Bus info in the overlay
                       populateBusStopInfoOverlay(routes,busStop);
       
                       //change selected option according to the bus stop selected on the map
                       $("#bus-stop > option").each(function() {                    

                            //when the right bus stop is found then show its details in the select option list
                            if($(this).val() === marker.busId){                          
                              $(this).attr('selected','selected');
                            }                     
                        });              

                       }//end if  
                    }
                    else
                    {            
                      //avoid copying twice the content code in the overlay as double click is triggered by the infoWindow listener
                      clickTriggeredTwice = false;
                      busRoute.length = 0;                
                    }
                
                    //clear bus info and routes arrays
                    busInfo.length = 0;
                    routes.length = 0;   
        
                    // close the previous info-window 
                    closeInfos();
        
                    infowindow.setContent(contentString);
                    infowindow.open(map,marker);
        
                    //keep the handle, in order to close it on next click event
                    infos[0]=infowindow;   
             
                  });   
                   markerClickCounter = 0;              
              }

            })(marker,contentString,infowindow));   
      }



      function populateBusStopInfoOverlay(busRoutes,selectedBusInfo){

         var overlayTarget = $("#overlay-wrapper");
         overlayTarget.fadeIn(200);

         //go through the bus info array and display bus arrivals in the overlay
         populateBusRouteInfoOverlay(busInfo);

         //appending bus stop info (stop name, direction) and display it in the overlay
         var contentBox = $("#overlay-content-box");

         contentBox.prepend('<span class="subItem arrivals">'+ "<b>Bus arrivals:</b></span>");

         //if disruption messages exist then show them
         if(criticalMessages.length > 0){
            contentBox.prepend('<span class="subItem infoItem">'+ "<b>Critical messages:</b> " + "<p>" + criticalMessages + "</p>" + '</span>');
         }

         if(importantMessages.length > 0){
            contentBox.prepend('<span class="subItem infoItem">'+ "<b>Important messages:</b> " + "<p>" + importantMessages + "</p>" + '</span>');
         }

         if(infoMessages.length > 0){
             contentBox.prepend('<span class="subItem infoItem">'+ "<b>Info Messages:</b> " + "<p>" + infoMessages + "</p>"  + '</span>');
         }

         contentBox.prepend('<span class="subItem last">'+ "<b>Updated at:</b> " + lastUpdated  + '</span>');
         contentBox.prepend('<span class="subItem">'+ "<b>Direction:</b> " + selectedBusInfo[6]  + '</span>');
         contentBox.prepend('<span class="subItem">'+ "<b>Route:</b> " + busRoutes + '</span>');
         contentBox.prepend('<span class="subItem">'+ "<b>Towards:</b> " + selectedBusInfo[5]  + '</span>');
         contentBox.prepend('<span class="subItem ">'+ "<b>Stop:</b> " + selectedBusInfo[1]  + '</span>');
         contentBox.prepend('<div class="busStopHeaderContainer"><div class="iconBus"></div><div class="headerItem">'+ selectedBusInfo[0] + '</div>' + '<div class="iconCloseBox"><a id="iconClose"></a></div></div>');
       
       }


      //get bus routes depending on the bus stop selected
      function getBusRoutes(currentMarker){
       
        var busRoutesSelected = [];
       
        if(currentMarker.length > 0 ){
                      
          $(currentMarker).each(function(i, valueRoutes) {     
           
            //array containing bus routes for each bus stop
            busRoutesSelected[i] = [valueRoutes.name];
             
          }); 

          return busRoutesSelected;
        }

      }


      //closes the infoWindow previously opened
      function closeInfos(){
       
         if(infos.length > 0){
       
            // detach the info-window from the marker
            infos[0].set("marker", null);
       
            //and close it
            infos[0].close();
       
            //blank the array
            infos.length = 0;
         }
      }

   
      //appending elements to drop down list on page load
      var option = $('<option />');
      var myselect = $('#bus-stop');
      var optionRoutes = [];

      var urlBusInfoDropDown = "http://digitaslbi-id-test.herokuapp.com/bus-stops?northEast=51.52783450,-0.04076115&southWest=51.51560467,-0.10225884&callback=?";

      $.ajax({
       	url: urlBusInfoDropDown,
       	dataType:'json',
       	type:'get',
        timeout: 3000,
       	cache: false,

       	success:function(data){

       		 $(data.markers).each(function(index, value) {

          //check if bus stops are not in use - checking both stop indicator and towards         
          if(value.stopIndicator !== null){
            if(value.towards !== null){       

              $(value.routes).each(function(i, valueRoutes) {     
                  //array containing bus routes for each bus stop - to be added in each option
                  optionRoutes[i] = [valueRoutes.name];
                 
              });

              myselect.append($('<option class="option-item"></option>').val(value.id).html(value.name + " - " + "Stop " + value.stopIndicator + " - Towards: " + " " + value.towards + " " + " - Routes: " + " " + optionRoutes));    
            } 
           }
              optionRoutes.length = 0; 		 	
       		 });
       	},
        error: function() {
            $(".errorLoadingData").html('There was an error loading the data:' + '<p>' +  'Request Status: ' + xhr.status + ' - ' + ' Status Text: ' + xhr.statusText + ' & ' + xhr.responseText + '</p>' ).css("display","block"); 
        }

      });


      //pick bus info on drop down list change
      $('#bus-stop').change(function () {
       var selectedOption = $(this).val();

          //checks if the id is a valid number - otherwise don't proceed 
         if($.isNumeric(selectedOption)){
          createOverlayOption(selectedOption);
         }

      });


       //close overlay containing bus info - using "on" as it is injected dinamically cos the anchor loses the bind
      $(document).on("click", '#iconClose', function(){ 
           $('#overlay-wrapper').fadeOut(200);
           $('#overlay-content-box').empty();
      });



       // The function to trigger the marker click, 'id' is the reference index to the 'markers' array.
      function showInfoWindowOptionCLick(selectedOption){

          //look for the same busId in the markers array
         $.each(markers, function( i, val ) {  

           if(selectedOption === val.busId)
           {
              //trigger click event on the map to show to infoWindow according to the bus stop choosen
              google.maps.event.trigger(markers[i], 'click');
           }
            
          });
      }


     //creates overlay according to dropdown list selection     
     function createOverlayOption(selectedOption){
       
        var selectedBusInfo = [];
        var busRoutes = [];

        //retrieve seleted bus stop info
        $.each(busStops, function( index, value ) {
       
          var busStopInfo = busStops[index];

          //look for the bus stop selected to get its info
          if(busStopInfo[7] === selectedOption){
              
              selectedBusInfo = value;          
              return false;
          } 

        });

        //check if the bus info returned is not empty
        if(selectedBusInfo.length >0){

           retrieveBusInfo(selectedOption, function(busInfo){
           
            //check if there are no routes - no routes to add into the bus stop array
            if(selectedBusInfo[9].length > 0 ){
            
              $(selectedBusInfo[9]).each(function(i, valueRoutes) {     
                  //array containing bus routes for each bus stop
                  busRoutes[i] = [valueRoutes.name];             
              }); 

            } 
            
            //function to populate the Bus info in the overlay
            populateBusStopInfoOverlay(busRoutes,selectedBusInfo);

            //code added on the overlay with the first click
            clickTriggeredTwice = true;

            //show marker info
            showInfoWindowOptionCLick(selectedOption);

            //clear bus info and routes array 
            busInfo.length = 0;
            busRoutes.length = 0;
                      
         }); 

        }//end if          

     }


     //go through the bus info array and display bus arrivals in the overlay
     function populateBusRouteInfoOverlay(busInfo){

         //create dinamically bus info and list of bus arrivals
         var overlayInnerBox= $('<ul class=content-item-list></ul>');   
         overlayInnerBox.appendTo("#overlay-content-box"); 

         //check if the bus info returned is not empty
         if(busInfo.length > 0){

           //go through the bus info array and display bus arrivals in the overlay
           $.each(busInfo, function( i, val ) { 

              var integerIndex = parseInt(i, 10);
              ++integerIndex;
 
              var overlayWithInfo = $('<li>'+ '<div class="indexContainer"><span class="busIndex">' + integerIndex + '</span></div>' +  
                '<div class="arrivalInfoContainer"> <span class="busNumber">' + val[0] + '</span>' + ' to ' + '<span>' +
                  val[1] + '</span>' + ' in ' + '<span>' + val[2] + '</span>'  + ' - Estimated: ' + '<span>' + val[3] + '</span> </div>' + '</li>');  
        
              overlayWithInfo.appendTo(overlayInnerBox);                  
            });
         }
         else{
            var noBusesMessage = $('<li>'+ '<div class="noBusErrorMessage">' + noBusErrorMessage + '</div>' + '</li>');
            noBusesMessage.appendTo(overlayInnerBox);  
         }

     }

});

