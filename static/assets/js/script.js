window.onload = function() {
  let m=document.querySelector('div#main');
  function getCoords() {
    let dataToSend = {};
    return new Promise(function(resolve,reject) {
      navigator.geolocation.getCurrentPosition(function(pos) {
        if (pos) {
          dataToSend['lat']=pos.coords.latitude;
          dataToSend['lon']=pos.coords.longitude;
          resolve(dataToSend);
        }
        else {
          reject(Error('There was an error getting the position'));
        }
    });
  });
}

let form=document.querySelector('form#nomSearch');

let lat=document.querySelector('input[name=lat]');
let lon=document.querySelector('input[name=lon]');

  getCoords().then(function(response) {
    lat.value=response.lat;
    lon.value=response.lon;
    },
    function(Error) {
      console.log(Error);
    });

    form.addEventListener('submit', handleSubmit);
    let lF=document.querySelector('input#optLoc');

    function handleSubmit(e){
      if (!lat.value||!lon.value) {
        e.preventDefault();
        lF.style.display='inline';
      }
      if (lF.value.length>4) { //zip code or city likely
        form.submit();
      }
    }
}
