const GOOGLE_API_KEY = 'AIzaSyABRmlB0IfynHdDA4cHE9-WmxBZO9Bxes4';
const FOURSQUARE_CLIENT_ID = 'CLIENT-ID';
const FOURSQUARE_CLIENT_SECRET = 'CLIENT-SECRET';

// Firebase config
var config = {
    apiKey: GOOGLE_API_KEY,
    authDomain: "neighborhood-map-1513030092681.firebaseapp.com",
    databaseURL: "https://neighborhood-map-1513030092681.firebaseio.com",
    projectId: "neighborhood-map-1513030092681",
    storageBucket: "",
    messagingSenderId: "716732455052"
};
firebase.initializeApp(config);

var database = firebase.database();

var map;
var infoWindow;

function initMap() {
    var styles = [
        {
            featureType: 'poi.business',
            stylers: [
                {
                    visibility: 'off'
                }
            ]
        },
        {
            featureType: 'poi.government',
            stylers: [
                {
                    visibility: 'off'
                }
            ]
        },
        {
            featureType: 'poi.medical',
            stylers: [
                {
                    visibility: 'off'
                }
            ]
        },
        {
            featureType: 'poi.park',
            elementType: 'labels.text',
            stylers: [
                {
                    visibility: 'off'
                }
            ]
        },
        {
            featureType: 'poi.school',
            stylers: [
                {
                    visibility: 'off'
                }
            ]
        },
        {
            featureType: 'poi.sports_complex',
            stylers: [
                {
                    visibility: 'off'
                }
            ]
        }
    ];

    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 35.0060799, lng: 135.6909099 },
        styles: styles,
        zoom: 12
    });

    infoWindow = new google.maps.InfoWindow();
}

/* Represents a zone or region on the map. Each region cotains different places
   or locations */
var Zone = function (data) {
    var self = this;

    self.zoneName = data.key;
    self.zoneId = data.key.replace(/ /g, '');
    //Holds the complete list of places for the given zone
    self.places = ko.observableArray([]);
    //Filter the locations of each zone based on the filter query
    self.filteredPlaces = ko.computed(function () {
        //If the filter is empty return the whole array of places
        if (!viewModel.filter()) {
            return self.places();
        }
        else {
            let filter = viewModel.filter().toLowerCase();
            return ko.utils.arrayFilter(self.places(), function (place) {
                /*Check for the first occurrence of the filter value in the
                  name of the place. If the value is zero or bigger it means
                  that the filter is present in the name of the place*/
                return place.name.toLowerCase().indexOf(filter) > -1;
            });
        }
    });
    self.zoneSelected = true;

    data.forEach(function (child) {
        self.places.push(new Place(child));
    });
};

/* Represents a location on the map */
var Place = function (data) {
    this.name = data.key;
    this.lat = data.val().lat;
    this.lng = data.val().lng;
    this.zoom = data.val().zoom;
    this.marker = null;
};

var animateMarker = function (marker) {
    if (marker !== null) {
        if (marker.getAnimation() !== null) {
            marker.setAnimation(null);
        }
        else {
            marker.setAnimation(google.maps.Animation.BOUNCE);
            //Set a timeout for the animation so it does not play indefinitely
            setTimeout(function () {
                marker.setAnimation(null);
            }, 1500);
        }

        if (infoWindow.marker != marker) {
            infoWindow.setContent('');
            infoWindow.marker = marker;

            infoWindow.setContent('<div>' + marker.title + '</div>');

            infoWindow.addListener('closeclick', function () {
                infoWindow.marker = null;
            });

            infoWindow.open(map, marker);
        }
    }
};

var createMarkers = function (zones) {
    if (typeof google === 'object' && typeof google.maps === 'object') {
        var bounds = new google.maps.LatLngBounds();
        zones().forEach(function (zone) {
            zone.places().forEach(function (place) {
                var marker = new google.maps.Marker({
                    position: { lat: place.lat, lng: place.lng },
                    title: place.name,
                    animation: google.maps.Animation.DROP
                });

                marker.addListener('click', function () {
                    viewModel.currentPlaceName(marker.title);
                    viewModel.getData(marker.title, marker.position.lat(), marker.position.lng());

                    viewModel.focusOnInfo();

                    animateMarker(marker);
                });

                place.marker = marker;
                place.marker.setMap(map);
                bounds.extend(place.marker.position);
            });
        });
        map.fitBounds(bounds);
    }
    else {
        alert('There was an error loading the map, try refreshing the page and see if the problem persist');
    }
};

var showFilteredMarkers = function () {
    if (typeof google === 'object' && typeof google.maps === 'object') {
        var bounds = new google.maps.LatLngBounds();
        var counter = 0;

        viewModel.zones().forEach(function (zone) {
            zone.filteredPlaces().forEach(function (place) {
                place.marker.setMap(map);
                bounds.extend(place.marker.position);
                counter++;
            });
        });

        //Make sure that there are markers present to fit the bounds
        if (counter) {
            map.fitBounds(bounds);
        }
    }
};

var showMarkers = function (zone) {
    if (typeof google === 'object' && typeof google.maps === 'object') {
        var bounds = new google.maps.LatLngBounds();
        zone.filteredPlaces().forEach(function (place) {
            place.marker.setMap(map);
            bounds.extend(place.marker.position);
        });
        map.fitBounds(bounds);
    }
};

var hideAllMarkers = function () {
    if (typeof google === 'object' && typeof google.maps === 'object') {
        viewModel.zones().forEach(function (zone) {
            zone.places().forEach(function (place) {
                place.marker.setMap(null);
            });
        });
    }
};

var hideMarkers = function (zone) {
    if (typeof google === 'object' && typeof google.maps === 'object') {
        zone.filteredPlaces().forEach(function (place) {
            place.marker.setMap(null);
        });
    }
};

var ViewModel = function () {
    var self = this;

    self.filter = ko.observable();
    //Holds the whole list of zones
    self.zones = ko.observableArray([]);
    self.currentPlaceImage = ko.observable();
    self.imgAlt = ko.observable();
    self.currentPlaceName = ko.observable();
    self.currentPlaceCategory = ko.observable();
    self.currentPlaceDescription = ko.observable();
    self.foursquareUrl = ko.observable();
    self.fButtonVisible = ko.observable(false);
    self.wikipediaUrl = ko.observable();
    self.wButtonVisible = ko.observable(false);

    /* Filters whether or not a zone should be visible based on the filter
       query. This filters the zone as a whole, not the individual places.*/
    self.items = ko.computed(function () {
        //If the filter is empty, return the whole array of zones
        if (!self.filter()) {
            return self.zones();
        }
        else {
            let filter = viewModel.filter().toLowerCase();
            /*Check whether or not a zone contains a place that meets the
              user's filter.*/
            return ko.utils.arrayFilter(self.zones(), function (zone) {

                /*Check whether or not there is any place in the given zone
                  array of places that meets the filter*/
                var check = ko.utils.arrayFilter(zone.places(),
                    function (place) {
                        return place.name.toLowerCase().indexOf(filter) > -1;
                    });
                //If there is any, the zone will be displayed
                return check.length;
            });
        }
    });

    self.toggleZone = function (clickedZone) {
        if (clickedZone.zoneSelected) {
            clickedZone.zoneSelected = false;
            hideMarkers(clickedZone);
        }
        else {
            clickedZone.zoneSelected = true;
            showMarkers(clickedZone);
        }
    };

    self.getResponse = function (url, successF, errorF) {
        $.ajax({
            type: "GET",
            dataType: "jsonp",
            url: url,
            success: successF,
            error: errorF
        });
    };

    self.getData = function (name, lat, lng) {

        var wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts%7Cinfo&indexpageids=1&titles=' + name + '&redirects=1&exintro=1&explaintext=1&inprop=url';
        var foursquareUrl = 'https://api.foursquare.com/v2/venues/search?v=20170801&intent=match&name=' + name + '&ll=' + lat + ',' + lng + '&client_id=' + FOURSQUARE_CLIENT_ID + '&client_secret=' + FOURSQUARE_CLIENT_SECRET;

        self.getResponse(wikiUrl, function (response) {
            var pageid = response.query.pageids[0];
            self.currentPlaceDescription(response.query.pages[pageid].extract);
            self.wButtonVisible(true);
            self.wikipediaUrl(response.query.pages[pageid].fullurl);
        }, function () {
            self.currentPlaceDescription('Could not retrieve Wikipedia info');
            self.wButtonVisible(false);
            self.wikipediaUrl('');
        });

        self.getResponse(foursquareUrl, function (data) {
            if (data.response.venues.length > 0) {
                var venueId = data.response.venues[0].id;
                var venueDetailsUrl = 'https://api.foursquare.com/v2/venues/' + venueId + '?v=20170801&client_id=' + FOURSQUARE_CLIENT_ID + '&client_secret=' + FOURSQUARE_CLIENT_SECRET;

                self.getResponse(venueDetailsUrl, function (data) {
                    var placeData = data.response.venue;
                    var categories = [];

                    placeData.categories.forEach(function (category) {
                        categories.push(category.name);
                    });

                    var imgSrc = placeData.bestPhoto.prefix + 'height300' + placeData.bestPhoto.suffix;
                    var url = placeData.canonicalUrl + '?ref=' + FOURSQUARE_CLIENT_ID;

                    self.currentPlaceCategory(categories.join(', '));
                    self.currentPlaceImage(imgSrc);
                    self.imgAlt(placeData.name);
                    self.fButtonVisible(true);
                    self.foursquareUrl(url);
                });
            }
            else {
                self.currentPlaceCategory('');
                self.currentPlaceImage('');
                self.imgAlt('');
                self.fButtonVisible(false);
                self.foursquareUrl('');
            }
        }, function () {
            self.currentPlaceCategory('Could not retrieve Foursquare venue info');
            self.currentPlaceImage('');
            self.imgAlt('');
            self.fButtonVisible(false);
            self.foursquareUrl();
        });
    };

    // Scrolls to the information section
    self.focusOnInfo = function () {
        $('#sidebar').animate({
            scrollTop: $("#place-info").position().top - $("#info-column").position().top + $("#info-column").scrollTop()
        }, 1000);
    };

    self.showLocation = function (clickedPlace) {
        if (typeof google === 'object' && typeof google.maps === 'object') {
            map.setCenter(clickedPlace.marker.position);
            map.setZoom(clickedPlace.zoom);
        }

        self.currentPlaceName(clickedPlace.name);
        self.getData(clickedPlace.name, clickedPlace.lat, clickedPlace.lng);

        self.focusOnInfo();
        animateMarker(clickedPlace.marker);
    };

    self.updateMarkers = function () {
        hideAllMarkers();
        showFilteredMarkers();
    };

    /* Get data from firebase database. The data doesn't really need to be
       stored using firebase but just for the sake trying different technologies
       it is.
    */
    database.ref('zones').once('value').then(function (snapshot) {
        snapshot.forEach(function (child) {
            self.zones.push(new Zone(child));
        });

        createMarkers(self.zones);
    });
};

var viewModel = new ViewModel();
ko.applyBindings(viewModel);
