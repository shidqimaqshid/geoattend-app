
import React, { useEffect, useRef, useState } from 'react';
import { Coordinates } from '../types';

interface MapPickerProps {
  initialCenter: Coordinates | null;
  onConfirm: (coords: Coordinates) => void;
  onCancel: () => void;
}

export const MapPicker: React.FC<MapPickerProps> = ({ initialCenter, onConfirm, onCancel }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(initialCenter);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!(window as any).L) return;
    const L = (window as any).L;

    if (mapRef.current && !mapInstanceRef.current) {
      const defaultLat = -6.2088;
      const defaultLng = 106.8456;
      const startLat = initialCenter ? initialCenter.latitude : defaultLat;
      const startLng = initialCenter ? initialCenter.longitude : defaultLng;
      const startZoom = initialCenter ? 18 : 13;

      const map = L.map(mapRef.current).setView([startLat, startLng], startZoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);

      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #2563eb; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); position: relative;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
               </div>`,
        iconSize: [24, 24], iconAnchor: [12, 12]
      });

      const updateMarker = (lat: number, lng: number) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
        }
        setSelectedCoords({ latitude: lat, longitude: lng });
      };

      map.on('click', (e: any) => updateMarker(e.latlng.lat, e.latlng.lng));

      map.on('locationfound', (e: any) => {
          setIsLocating(false);
          updateMarker(e.latlng.lat, e.latlng.lng); // This ensures the marker moves to device position
          map.flyTo(e.latlng, 18);
      });

      map.on('locationerror', () => setIsLocating(false));

      if (initialCenter) {
          markerRef.current = L.marker([startLat, startLng], { icon }).addTo(map);
      } else {
          setIsLocating(true);
          map.locate({ setView: true, maxZoom: 18 });
      }

      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    }
    
    return () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    }
  }, []);

  const handleManualLocate = () => {
      if (mapInstanceRef.current) {
          setIsLocating(true);
          mapInstanceRef.current.locate({ setView: true, maxZoom: 18 });
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[500px] animate-fade-in-up">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
                <h3 className="font-bold text-gray-800">Tentukan Lokasi Kelas</h3>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Ketuk peta untuk memberi titik</p>
            </div>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-2 text-2xl leading-none">&times;</button>
        </div>
        <div className="flex-1 relative bg-gray-100">
            <div ref={mapRef} className="absolute inset-0 z-0" />
            <button onClick={handleManualLocate} className="absolute bottom-4 right-4 z-10 bg-white p-3 rounded-full shadow-lg text-gray-700 flex items-center justify-center border border-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isLocating ? 'animate-spin text-blue-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
        </div>
        <div className="p-4 border-t border-gray-100 flex flex-col gap-3 bg-white">
            {selectedCoords && (
                <div className="text-xs font-mono text-center text-gray-500 bg-gray-50 py-1 rounded">
                    Koordinat Terpilih: {selectedCoords.latitude.toFixed(6)}, {selectedCoords.longitude.toFixed(6)}
                </div>
            )}
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg text-sm transition-colors border">Batal</button>
                <button onClick={() => selectedCoords && onConfirm(selectedCoords)} disabled={!selectedCoords} className="flex-[2] py-3 text-white font-bold rounded-lg text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300">Konfirmasi Titik Lokasi</button>
            </div>
        </div>
      </div>
    </div>
  );
};
