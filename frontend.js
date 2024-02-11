let map;
let jobLocations = [];
let technicianLocation;

async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");

  map = new Map(document.getElementById("map"), {
    center: { lat: 28.535, lng: 77.391 },
    zoom: 8,
  });
}

initMap();

function markLocation(type) {
  const locationInput = document.getElementById(`${type}Location`).value;
  if (locationInput.trim() !== "") {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: locationInput }, (results, status) => {
      if (status === 'OK') {
        const marker = new google.maps.Marker({
          map: map,
          position: results[0].geometry.location,
          label: type.charAt(0).toUpperCase(),
        });

        if (type === 'job') {
          jobLocations.push({ lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() });
        } else if (type === 'technician') {
          technicianLocation = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() };
        }
        clearInputField(`${type}Location`);
      } else {
        alert('Geocode was not successful for the following reason: ' + status);
      }
    });
  }
}

async function planRoute() {
    const technicianId = document.getElementById('technicianId').value;
    if (technicianLocation && jobLocations.length > 0 && technicianId.trim() !== "") {
      // Create a DirectionsService and a DirectionsRenderer
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
      });
  
      // Combine technicianLocation and jobLocations into waypoints
      const waypoints = [technicianLocation, ...jobLocations];
  
      // Create a request object for the DirectionsService
      const request = {
        origin: waypoints.shift(),
        destination: waypoints.pop(),
        waypoints: waypoints.map(location => ({ location, stopover: true })),
        travelMode: google.maps.TravelMode.DRIVING,
      };
  
      // Make the DirectionsService request
      directionsService.route(request, async function (result, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          // Display the route on the map
          directionsRenderer.setDirections(result);
  
          // Draw arrows along each step of the route
          const route = result.routes[0];
          for (let i = 0; i < route.legs.length; i++) {
            const steps = route.legs[i].steps;
            for (let j = 0; j < steps.length; j++) {
              const step = steps[j];
              const path = google.maps.geometry.encoding.decodePath(step.polyline.points);
              drawArrows(path, map);
            }
          }
  
          // Update the map bounds to fit the entire route
          const bounds = new google.maps.LatLngBounds();
          result.routes[0].legs.forEach(leg => {
            leg.steps.forEach(step => {
              bounds.extend(step.start_location);
              bounds.extend(step.end_location);
            });
          });
          map.fitBounds(bounds);
  
          // Send data to the backend (Node.js server)
          const data = {
            technicianId,
            technicianLocation,
            jobLocations,
          };
  
          try {
            const response = await fetch('https://route-rider.onrender.com/planRoute', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            });
  
            const result = await response.json();
            alert(result.message);
            clearInputField('technicianId');
          } catch (error) {
            console.error('Error:', error);
          }
        } else {
          alert('Error calculating the route. Please try again.');
        }
      });
    } else {
      alert('Please mark technician and job locations, and enter technician ID.');
    }
  }
  function drawArrows(path, map) {
    for (let i = 0; i < path.length - 1; i++) {
        const heading = google.maps.geometry.spherical.computeHeading(path[i], path[i + 1]);
        const arrowSymbol = {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 0.8,
            rotation: heading,
        };

        const arrow = new google.maps.Marker({
            position: path[i],
            icon: arrowSymbol,
            map: map,
        });
    }
}
function clearInputField(fieldId) {
  document.getElementById(fieldId).value = '';
}