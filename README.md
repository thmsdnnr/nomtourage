#entourage
===a nightlife app===

TODO
[ ] batch up Db calls so they only fire when you leave the page. Meanwhile just store in an Object
[ ] Other things?!

[ ] Material Design styling
[ ] Focus app -> not just bars, any kind of search
[ ] Save users' last 5 or so search queries and add those to the db
[ ] Maybe have an onboarding box with 'Last X searches on site'

[X] User -> store last search in the Db if registered, fire again on login & take to list page
[X] Search page -> have different page depending on whether or not logged in
[X] Landing page: "Attempt to Geolocate" button, "Range" (in km, can convert to miles), "Zip Code", and finally handle bad input for search.
[X] If geolocation fails have graceful fallback to zip code or city entry.
[X] fix "zip code" (or just have enter city instead)
[X] Two more routes: /mine and /popular
