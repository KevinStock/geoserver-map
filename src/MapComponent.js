import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const MapComponent = () => {
    const [bbox, setBbox] = useState(null);
    const [currentLatLng, setCurrentLatLng] = useState(null);
    const [elevation, setElevation] = useState(null);
    const [elevationError, setElevationError] = useState(null);
    const [showAirports, setShowAirports] = useState(true);
    const debounceTimeout = useRef(null);

    const wmtsUrlBaseLayer = `https://127.0.0.1:51200/geoserver/gwc/service/wmts?service=WMTS&request=GetTile&version=1.1.1&layer=NOMS:BlueMarbleA&style=generic&tilematrixset=EPSG:4326&tilematrix=EPSG:4326:{z}&tilerow={y}&tilecol={x}&format=image/png`;
    const wmtsUrlOverlayLayer = `https://127.0.0.1:51200/geoserver/gwc/service/wmts?service=WMTS&request=GetTile&version=1.1.1&layer=NOMS:Airports&style=default&ENV=cycleId%3A2006%3Blength%3A0%3Brwy_width%3A0%3BtypeA%3A1%3BtypeB%3A1%3BtypeC%3A1%3BtypeD%3A1%3B&tilematrixset=EPSG:4326&tilematrix=EPSG:4326:{z}&tilerow={y}&tilecol={x}&format=image/png`;
    const elevationEndpoint = "https://127.0.0.1:51100/elevation/v1/elevation";
    const jwtToken = "your_token"; // Replace with your actual JWT token

    const fetchElevation = async (lat, lng) => {
        try {
            const url = `${elevationEndpoint}?latitude=${lat}&longitude=${lng}&unit=feet`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            setElevation(data.elevation);
            setElevationError(null);
        } catch (error) {
            console.error('Error fetching elevation:', error);
            setElevationError('Failed to fetch elevation data.');
            setElevation(null);
        }
    };

    const debounceFetchElevation = (lat, lng) => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            fetchElevation(lat, lng);
        }, 500);
    };

    const MapEventHandler = () => {
        const map = useMapEvents({
            moveend: () => {
                if (debounceTimeout.current) {
                    clearTimeout(debounceTimeout.current);
                }
                debounceTimeout.current = setTimeout(() => {
                    const bounds = map.getBounds();
                    const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
                    setBbox(bbox);
                }, 250);
            },
            mousemove: (e) => {
                const latLng = e.latlng;
                setCurrentLatLng(latLng);
                debounceFetchElevation(latLng.lat, latLng.lng);
            },
        });

        useEffect(() => {
            const initialBounds = map.getBounds();
            const initialBbox = `${initialBounds.getWest()},${initialBounds.getSouth()},${initialBounds.getEast()},${initialBounds.getNorth()}`;
            setBbox(initialBbox);
        }, [map]);

        return null;
    };

    return (
        <div>
            <MapContainer
                center={[0, 0]}
                zoom={2}
                style={{ height: "100vh", width: "100%" }}
                scrollWheelZoom={true}
                dragging={true}
                inertia={true}
                inertiaDeceleration={3000}
                minZoom={0}
                maxZoom={18}
                crs={L.CRS.EPSG4326}
            >
                <MapEventHandler />
                {/* BlueMarbleA Base WMTS Layer */}
                <TileLayer
                    url={wmtsUrlBaseLayer}
                    attribution="&copy; GeoServer"
                    tileSize={256}
                    tms={false}
                    version="1.1.1"
                />
                {/* Airports Overlay WMTS Layer (Conditional Rendering) */}
                {showAirports && (
                    <TileLayer
                        url={wmtsUrlOverlayLayer}
                        attribution="&copy; GeoServer"
                        tileSize={256}
                        tms={false}
                        version="1.1.1"
                        opacity={0.6}
                    />
                )}
            </MapContainer>
            {currentLatLng && (
                <div style={{
                    position: 'fixed',
                    bottom: 10,
                    left: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    boxShadow: '0px 0px 6px rgba(0, 0, 0, 0.2)',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '14px',
                    color: '#333',
                    zIndex: 1000
                }}>
                    <div>Latitude: {currentLatLng.lat.toFixed(5)}, Longitude: {currentLatLng.lng.toFixed(5)}</div>
                    {elevationError ? (
                        <div style={{ color: 'red' }}>{elevationError}</div>
                    ) : (
                        <div>Elevation: {elevation !== null ? `${elevation.toFixed(2)} feet` : 'Loading...'}</div>
                    )}
                </div>
            )}

            <button
                onClick={() => setShowAirports(!showAirports)}
                style={{
                    position: 'fixed',
                    top: 80,
                    left: 10,
                    zIndex: 1000,
                    padding: '10px 15px',
                    backgroundColor: '#007BFF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                {showAirports ? 'Hide Airports' : 'Show Airports'}
            </button>
        </div>
    );
};

export default MapComponent;
