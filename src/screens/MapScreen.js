import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  PermissionsAndroid,
  Animated,
  TouchableOpacity,
  Text,
  LogBox,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import MapViewDirections from 'react-native-maps-directions';
import geolib from 'geolib';
import Tts from 'react-native-tts';
import { pointWithinRadius } from '../utils/helper';
import { GOOGLE_API_KEY } from '../constants/constants';

const mode = 'driving';
const MapScreen = () => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState({
    latitude: 22.962267, // replace with your destination latitude
    longitude: 76.050797, // replace with your destination longitude
  });
  const mapRef = useRef(null);
  const markerAnimation = new Animated.Value(0);
  const [arrivalTime, setArrivalTime] = useState(null);
  const [coords, setCoords] = useState([]);
  const [MARKERS, setMARKERS] = useState(null);
  const [destMarker, setDestMarker] = useState('');
  const [startMarker, setStartMarker] = useState('');
  const [distance, setDistance] = useState(null);

  const [steps, setSteps] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [start, setStart] = useState(false);
  const [htmlInstructions, setHtmlInstruction] = useState('');
  const [nextIndexDistance, setNextIndexDistance] = useState('');
  const [inRadius, setInRadius] = useState('');
  useEffect(() => {
    LogBox.ignoreLogs(['new NativeEventEmitter']);
  }, []);

  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS == 'ios') {
        Geolocation.requestAuthorization()
      }
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          Geolocation.getCurrentPosition(
            position => {
              const { latitude, longitude } = position.coords;
              setCurrentLocation({ latitude, longitude });
            },
            error => console.log('Error:', error),
            // {enableHighAccuracy: true, distanceFilter: 10},
          );
        } else {
          console.log('Location permission denied');
        }
      } catch (err) {
        console.warn(err);
      }
    };

    let interval = setInterval(() => {
      requestLocationPermission();
    }, 4000);
    return () => clearInterval(interval);
  }, [currentLocation]);

  useEffect(() => {
    console.log('obj11');
    if (currentLocation) {
      getRoutePoints(currentLocation, destinationLocation, GOOGLE_API_KEY);
    }
    if (currentLocation) {
      setCoords(prev => {
        currentLocation, prev;
      });
    }
    if (start) {
      spechHTML(currentIndex);
    }
  }, [currentLocation]);

  useEffect(() => {
    // Simulating location changes
    // console.log('object');
    // const interval = setInterval(() => {
    //   const newCoordinate = {
    //     latitude: coordinate.latitude + 0.01,
    //     longitude: coordinate.longitude + 0.01,
    //   };
    //   setCoordinate(newCoordinate);
    //   Animated.timing(markerAnimation, {
    //     toValue: 1,
    //     duration: 500,
    //     useNativeDriver: false,
    //   }).start();
    // }, 3000);
    // return () => clearInterval(interval);
  }, []);

  const getRoutePoints = (origin, destination, key) => {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin?.latitude},${origin?.longitude}&destination=${destination?.latitude},${destination?.longitude}&key=${key}&mode=${mode}`;
    fetch(url)
      .then(res => res.json())
      .then(json => {
        setArrivalTime(json?.routes[0]?.legs[0]?.duration?.text);
        setDistance(json?.routes[0]?.legs[0]?.distance?.text);
        if (json.routes.length) {
          var cortemp = decode(json.routes[0].overview_polyline.points);
          var length = cortemp.length - 1;
          var tempMARKERS = [];
          var steps = json.routes[0].legs[0].steps;
          tempMARKERS.push(cortemp[0]);
          tempMARKERS.push(cortemp[length]);
          setSteps(steps);
          setCoords(cortemp);
          setDestMarker(cortemp[length]);
          setStartMarker(cortemp[0]);
        }
      })
      .catch(e => {
        console.log('getRoutePoints error', e);
      });
  };

  const decode = (t, e) => {
    for (
      var n,
      o,
      u = 0,
      l = 0,
      r = 0,
      d = [],
      h = 0,
      i = 0,
      a = null,
      c = Math.pow(10, e || 5);
      u < t.length;

    ) {
      (a = null), (h = 0), (i = 0);
      do (a = t.charCodeAt(u++) - 63), (i |= (31 & a) << h), (h += 5);
      while (a >= 32);
      (n = 1 & i ? ~(i >> 1) : i >> 1), (h = i = 0);
      do (a = t.charCodeAt(u++) - 63), (i |= (31 & a) << h), (h += 5);
      while (a >= 32);
      (o = 1 & i ? ~(i >> 1) : i >> 1),
        (l += n),
        (r += o),
        d.push([l / c, r / c]);
    }
    return (d = d.map(function (t) {
      return {
        latitude: t[0],
        longitude: t[1],
      };
    }));
  };

  const spechHTML = current => {
    const currentIndex = steps[current];
    const nextIndex = steps[current + 1];
    setHtmlInstruction('');
    if (nextIndex) {
      const distance = calculateDistance(
        currentIndex?.start_location?.lat,
        currentIndex?.start_location?.lng,
        nextIndex?.start_location?.lat,
        nextIndex?.start_location?.lng,
      );
      setNextIndexDistance(distance);
      if (distance <= 100) {
        const radius = pointWithinRadius(
          currentLocation,
          currentLocation,
          10000,
        );
        setInRadius(radius);
        const directionString = nextIndex?.html_instructions;
        const simplifiedString = directionString.replace(/<\/?[^>]+(>|$)/g, '');
        if (simplifiedString != MARKERS) {
          setHtmlInstruction(simplifiedString);
          Tts.speak(simplifiedString); // Adjust the speech instruction as needed
          setMARKERS(simplifiedString);
        }
      }
    }
  };

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371; // Radius of the Earth in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c * 1000; // Convert to meters

    return distance;
  }

  function toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  return (
    <View style={styles.container}>
      {currentLocation ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}>
          {currentLocation && startMarker && (
            <Marker.Animated
              coordinate={startMarker}
              pinColor="blue"
              style={{
                transform: [
                  {
                    scale: markerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2],
                    }),
                  },
                ],
              }}
            />
          )}
          {destMarker && <Marker coordinate={destMarker} pinColor="green" />}
          {currentLocation && destinationLocation && (
            <MapViewDirections
              origin={currentLocation}
              destination={destinationLocation}
              apikey={GOOGLE_API_KEY}
              strokeColor="red"
              strokeWidth={5}
              onReady={result => {
                mapRef.current.fitToCoordinates(result.coordinates, {
                  edgePadding: {
                    right: 20,
                    bottom: 20,
                    left: 20,
                    top: 20,
                  },
                });
              }}
              onError={errorMessage => {
                // console.log('GOT AN ERROR');
              }}
            />
          )}
        </MapView>
      ) : (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: 22.7195687,
            longitude: 75.85772580000003,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        />
      )}

      <View
        style={{
          position: 'absolute',
          margin: 20,
          backgroundColor: 'green',
          borderRadius: 5,
          padding: 15,
          width: '70%',
          marginTop: 50,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '500' }}>Distance -</Text>
          <Text style={{ color: 'white' }}> {distance ? distance : 0}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '500' }}>Time - </Text>
          <Text style={{ color: 'white' }}>{arrivalTime ? arrivalTime : 0}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '500' }}>isOn -</Text>
          <Text style={{ color: 'white' }}> {start ? 'Yes' : 'No'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '500' }}>inRadius -</Text>
          <Text style={{ color: 'white' }}> {inRadius ? 'Yes' : 'No'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '500' }}>
            Next Index Distance -
          </Text>
          <Text style={{ color: 'white' }}>
            {nextIndexDistance ? nextIndexDistance.toFixed(2) : 0}
          </Text>
        </View>
        {htmlInstructions && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>
              {htmlInstructions ? htmlInstructions : null}
            </Text>
          </View>
        )}
      </View>

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'blue',
        }}>
        <TouchableOpacity onPress={() => setStart(true)} style={{}}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '500' }}>
            Start With Voice Instruction
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 12,
  },
});

export default MapScreen;
