import React from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '300px'
};

interface MapComponentProps {
  center: { lat: number; lng: number };
  markers?: { position: { lat: number; lng: number }; label?: string; icon?: string }[];
  directions?: google.maps.DirectionsResult | null;
}

const MapComponent: React.FC<MapComponentProps> = ({ center, markers, directions }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [map, setMap] = React.useState<google.maps.Map | null>(null);

  const onLoad = React.useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = React.useCallback(function callback() {
    setMap(null);
  }, []);

  if (!isLoaded) return <div className="h-[300px] bg-stone-100 rounded-2xl animate-pulse flex items-center justify-center text-stone-400">Loading Map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          {
            "featureType": "all",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#141414" }]
          },
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{ "color": "#e9e9e9" }]
          }
        ]
      }}
    >
      {markers?.map((marker, index) => (
        <Marker 
          key={index} 
          position={marker.position} 
          label={marker.label}
          icon={marker.icon}
        />
      ))}
      {directions && <DirectionsRenderer directions={directions} />}
    </GoogleMap>
  );
};

export default React.memo(MapComponent);
