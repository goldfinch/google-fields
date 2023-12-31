(function ($) {
  window.googleFieldsInit = () => {
    // console.log('google init')
  };

  function updateMapFields(map, latLng, latitude, longitude, zoomField) {
    latitude.value = latLng.lat();
    longitude.value = latLng.lng();
    zoomField.value = map.getZoom();
  }

  function findOnMap(map, marker, e, latitude, longitude, zoomField) {
    const field = $(e.currentTarget);
    const searchQuery = field.val();

    if (searchQuery) {
      geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: searchQuery }, (result, status) => {
        $(e).removeClass('ggp-place-found');
        $(e).removeClass('ggp-place-failed');

        if (google.maps.GeocoderStatus.OK === status) {
          const { location } = result[0].geometry;
          marker.setPosition(location);
          map.panTo(location);

          $(e.currentTarget).addClass('ggp-place-found');
          clearTimeout(window.placeFoundTimeout);
          window.placeFoundTimeout = setTimeout(
            () => $(e.currentTarget).removeClass('ggp-place-found'),
            1000,
          );

          updateMapFields(map, location, latitude, longitude, zoomField);
        } else {
          console.warn(`Find a place: ${searchQuery} not found`);

          $(e.currentTarget).addClass('ggp-place-failed');
          clearTimeout(window.placeFailedTimeout);
          window.placeFailedTimeout = setTimeout(
            () => $(e.currentTarget).removeClass('ggp-place-failed'),
            1000,
          );
        }
      });
    }

    e.preventDefault();
    e.stopPropagation();
  }

  function reloadPlaceData() {
    $('[data-goldfinch-google-place-field]').each((i, e) => {
      const v = $(e).find('[data-goldfinch-place="data"]');

      if (v.length && v.val()) {
        const json = JSON.parse(
          $(e).find('[data-goldfinch-place="data"]').val(),
        );

        const preview = $(e).find('[data-goldfinch-place="preview"]');

        preview.addClass('ggp__preview--display');

        const content = $('<ul>');

        json.address_components.forEach((i, k) => {
          let label = i.types.join();

          if (i.types.includes('subpremise')) {
            label = 'Subpremise';
          } else if (i.types.includes('street_number')) {
            label = 'Street number';
          } else if (i.types.includes('route')) {
            label = 'Street name';
          } else if (i.types.includes('locality')) {
            label = 'Suburb';
          } else if (i.types.includes('sublocality')) {
            label = 'Subarea';
          } else if (i.types.includes('administrative_area_level_1')) {
            label = 'Region';
          } else if (i.types.includes('administrative_area_level_2')) {
            label = 'District';
          } else if (i.types.includes('country')) {
            label = 'Country';
          } else if (i.types.includes('postal_code')) {
            label = 'Postcode';
          }

          content.append(`<li><b>${label}</b>: ${i.long_name}</li>`);
        });

        const { location } = json.geometry;

        content.append(`<li><b>Latitude</b>: ${location.lat}</li>`);
        content.append(`<li><b>Longitude</b>: ${location.lng}</li>`);
        content.append(
          `<li><a target="_blank" href="https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}">Open Google Maps</a></li>`,
        );

        preview.html(content);
      }
    });
  }

  $(document).ready(() => {
    reloadPlaceData();
  });

  $('.cms-edit-form').entwine({
    onmatch(e) {
      this._super(e);
    },
    onunmatch(e) {
      this._super(e);
    },
    onaftersubmitform(event, data) {
      reloadPlaceData();
    },
  });

  $.entwine('ss', ($) => {
    $('[data-goldfinch-google-place-field]').entwine({
      onmatch() {
        const address = $(this).find('[data-goldfinch-place="address"]')[0];
        const data = $(this).find('[data-goldfinch-place="data"]')[0];
        const settings = JSON.parse($(address).attr('data-settings'));

        const options = {
          componentRestrictions: { country: settings.country },
          fields: ['address_components', 'geometry', 'name'],
          strictBounds: false,
        };

        const autocomplete = new google.maps.places.Autocomplete(
          address,
          options,
        );

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();

          data.value = JSON.stringify(place);

          reloadPlaceData();
        });
      },
    });
    $('[data-goldfinch-google-map-field]').entwine({
      onmatch() {
        const latitude = $(this).find('[data-goldfinch-map="latitude"]')[0];
        const longitude = $(this).find('[data-goldfinch-map="longitude"]')[0];
        const zoomField = $(this).find('[data-goldfinch-map="zoom"]')[0];
        const frame = $(this).find('[data-goldfinch-map="frame"]')[0];
        const search = $(this).find('[data-goldfinch-map="search"]')[0];
        const settings = JSON.parse($(frame).attr('data-settings'));

        let lat = parseFloat(latitude.value);
        let lng = parseFloat(longitude.value);
        let zoom = parseFloat(zoomField.value);

        // defaults
        if (!zoom) zoom = settings.zoom;
        if (!lat) lat = settings.lat;
        if (!lng) lng = settings.lng;

        const map = new google.maps.Map(frame, {
          center: { lat, lng },
          zoom,
          gestureHandling: 'cooperative',
          fullscreenControl: false,
          mapTypeControl: false,
          clickableIcons: false,
          rotateControl: false,
          scaleControl: false,
          streetViewControl: false,
          zoomControl: false,
        });

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
        });

        google.maps.event.addListener(map, 'zoom_changed', (event) => {
          zoomField.value = map.getZoom();
        });

        google.maps.event.addListener(map, 'click', (event) => {
          marker.setPosition(event.latLng);
          map.panTo(event.latLng);

          updateMapFields(map, event.latLng, latitude, longitude, zoomField);
        });

        $(search).on({
          change: search,
          keydown: (e) => {
            if (e.which == 13) {
              findOnMap(map, marker, e, latitude, longitude, zoomField);
            }
          },
        });
      },
    });
  });
})(jQuery);
