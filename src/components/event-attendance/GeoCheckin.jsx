/**
 * Geo-fence check-in wrapper.
 * Checks user's location vs venue before allowing check-in.
 * Returns { allowed, distance, error } via callback.
 */

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function checkGeofence({ venueLat, venueLng, radiusM }) {
  if (!venueLat || !venueLng) return { allowed: true, distance: null };
  
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ allowed: false, error: "Geolokasi tidak didukung di browser ini." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = calcDistance(pos.coords.latitude, pos.coords.longitude, venueLat, venueLng);
        const radius = radiusM || 200;
        resolve({
          allowed: dist <= radius,
          distance: Math.round(dist),
          error: dist > radius ? `Anda berada ${Math.round(dist)}m dari venue (batas: ${radius}m).` : null,
        });
      },
      () => resolve({ allowed: false, error: "Tidak dapat mendeteksi lokasi Anda. Aktifkan GPS." }),
      { timeout: 8000, maximumAge: 10000 }
    );
  });
}