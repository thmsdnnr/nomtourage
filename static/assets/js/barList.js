window.onload = function() {
  let currentSortKey='visitorCt';   //set sorting defaults
  let currentSortDirection='asc';
  let lastSortKey;
  let visitCt={};
  if(window.INITIAL_STATE.barData){
    window.INITIAL_STATE.barData.forEach((b)=>{visitCt[b.barID]=b.visitorCt}); //assemble visitCt object for merging
  }
  let yelp=window.INITIAL_STATE.data.businesses||window.INITIAL_STATE.data; //this gives us a reference to the object which is what we want
  //merge visitCt data with yelp bar data
  //visitCt data is our application data # of visits mapped to barIDs, since Yelp API forbids caching.

  let chosen=window.INITIAL_STATE.userBars || {};

  //merge visitCt with yelp, joining on 'id', setting value 'visitorCt' or 0 if no match
  mergeObjectsWithKey(yelp,visitCt,'id','visitorCt',0);
  if(chosen!=={}) { mergeObjectsWithValue(yelp,chosen,'id',1,'chosen',0); }

  function mergeObjectsWithKey(a,b,matchKey,updKey,nonceVal) {
    for (aKey in a) {
      if (b.hasOwnProperty(a[aKey][matchKey])) { a[aKey][updKey]=b[a[aKey][matchKey]]; }
      else { a[aKey][updKey]=nonceVal; }
    }
  }

  function mergeObjectsWithValue(a,b,matchKey,matchValue,updKey,nonceVal) {
    for (aKey in a) {
      if (b.hasOwnProperty(a[aKey][matchKey])&&b[a[aKey][matchKey]]===matchValue)
      {
        a[aKey][updKey]=matchValue;
      }
      else
      {
        a[aKey][updKey]=nonceVal;
      }
    }
  }

  let rows=document.querySelectorAll('tr');
  let table=document.querySelector('table');

  function selectBar(e) {
    let row=document.querySelector(`tr#${e.target.id}`);
    if (e.target.checked) {
      chosen[e.target.id]=1;
      row.classList.add('selected');
      postUpdate(e.target.id,'addOne');
      updateRowData(e.target.id,'addOne');
      }
    else {
      delete chosen[e.target.checked];
      row.classList.remove('selected');
      postUpdate(e.target.id,'removeOne');
      updateRowData(e.target.id,'removeOne');
    }
  }

  function postUpdate(id, action) { //updates bar collection and user collection server-side
    let data={barID:id, action:action};
    var xhr = new XMLHttpRequest(),
    method = "POST",
    url = '/update';
    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.send(JSON.stringify(data));
  }

  function updateRowData(id, action) { //update the table row in real-time
    let row=document.querySelector(`tr#${id} td#vCt`);
    let cVal=Number(row.innerHTML);
    if (action==='addOne') {
      cVal+=1;
      row.innerHTML=cVal;
    }
    else if (action=='removeOne') {
      cVal-=1;
      row.innerHTML=cVal;
    }
  }

  function sortAscNum(a,b) {
    if (a[1]>b[1]) { return 1; }
    else if (a[1]<b[1]) { return -1; }
    else { return 0; }
  }

  function sortDescNum(a,b) {
    if (a[1]<b[1]) { return 1; }
    else if (b[1]<a[1]) { return -1; }
    else { return 0; }
  }

  function sortAscText(a,b) {
    if (a[1].toLowerCase()>b[1].toLowerCase()) { return 1; }
    else if (a[1].toLowerCase()<b[1].toLowerCase()) { return -1; }
    else { return 0; }
  }

  function sortDescText(a,b) {
    if (a[1].toLowerCase()<b[1].toLowerCase()) { return 1; }
    else if (b[1].toLowerCase()<a[1].toLowerCase()) { return -1; }
    else { return 0; }
  }

  function sortList(unSrt,key,direction='asc') {
    //given data <unSrt>, sort by <key> in <direction>
    //returns 3D array with each element having [ID,sortedKey,data] so the sorted-by-key can be read by reading array data in order
    let sArr=[];
    unSrt.forEach((poll)=>{ sArr.push([poll['_id'],poll[key],poll]); });
    if (key==='pollName'||key==='username') { (direction==='asc') ? sArr=sArr.sort(sortAscText) : sArr=sArr.sort(sortDescText); }
    else { (direction==='asc') ? sArr=sArr.sort(sortAscNum) : sArr=sArr.sort(sortDescNum); }
    return sArr;
  }

  let headers=document.querySelectorAll('span.header');
    headers.forEach(h=>h.addEventListener('click',headerSort));
    function headerSort(e){
      if (e) {
        lastSortKey=currentSortKey;
        currentSortKey=e.target.id;
      }
      (currentSortDirection==='asc') ? currentSortDirection='desc' : currentSortDirection='asc';
      let sorted=sortList(yelp,currentSortKey,currentSortDirection);
      generateRows(sorted);
      updateHeadersSorting();
    }

    function customizeHeaders() {
      let tHeadRow=document.querySelector('table#bars thead tr');
      if (window.INITIAL_STATE.user==='') { //not logged in
        let chosen=document.querySelector('td#chosen');
        let distance=document.querySelector('td#distance');
        let nameDesc=document.querySelector('td#nameDesc');
        nameDesc.colSpan=4;
        tHeadRow.removeChild(chosen);
        tHeadRow.removeChild(distance);
    }
  }

    function generateRows(sRows) {
      let tBody=document.querySelector('table#bars tbody');
      tBody.innerHTML=null;
      for (var i=0;i<sRows.length;i++){
        let row=document.createElement('tr');
        row.id=sRows[i][2]['id'];
        let c='';
        (sRows[i][2]['chosen']) ? c='checked' : c='';
        if (window.INITIAL_STATE.user==='') { //not logged in
          row.innerHTML+=`<td id="vCt" colspan="2">${sRows[i][2]['visitorCt']}</td>`;
          //row.innerHTML+=`<td></td>`; //don't add the circles
          row.innerHTML+=`<td><img src="${sRows[i][2]['image_url']}" class="barImg"></td>`;
          row.innerHTML+=`<td><span id="name"><a href="${sRows[i][2]['url']}">${sRows[i][2]['name']}</a></span>`;
          row.innerHTML+=`<span id="review">${sRows[i][2]['snippet_text'].split(" ").slice(0,15).join(" ")+'...'}</span></td>`;
          row.innerHTML+=`<td><span id="rate">${sRows[i][2]['rating']}</span> <span id="min">[${sRows[i][2]['review_count']}]</span></td>`;
        }
        else { //logged in
          row.innerHTML+=`<td id="vCt">${sRows[i][2]['visitorCt']}</td>`;
          row.innerHTML+=`<td><div class="circles"><div class="button"><label class="button"><input type="checkbox" id="${sRows[i][2]['id']}" class="light" ${c}><div class="light"></div></label></div></td>`;
          row.innerHTML+=`<td><img src="${sRows[i][2]['image_url']}" class="barImg"></td>`;
          row.innerHTML+=`<td><span id="name"><a href="${sRows[i][2]['url']}">${sRows[i][2]['name']}</a></span>`;
          row.innerHTML+=`<span id="review">${sRows[i][2]['snippet_text'].split(" ").slice(0,15).join(" ")+'...'}</span></td>`;
          row.innerHTML+=`<td><span id="rate">${sRows[i][2]['rating']}</span> <span id="min">[${sRows[i][2]['review_count']}]</span></td>`;
          if (!isNaN(sRows[i][2]['distance'])) {
            row.innerHTML+=`<td>${(sRows[i][2]['distance']/1000).toFixed(2)}</td></tr>`;
          }
          else {
            row.innerHTML+=`<td>can't tell'</td></tr>`;
          }
        }
      tBody.appendChild(row);
      }
      let selections=document.querySelectorAll('input.light');
      selections.forEach(s=>s.addEventListener('click',selectBar));
  }

    function updateHeadersSorting() {
      let now=document.querySelector(`span#${currentSortKey}`);
      let then=document.querySelector(`span#${lastSortKey}`);
      let arrow;
      (currentSortDirection==='asc') ? arrow='↑' : arrow='↓';
      now.textContent=`${now.dataset.title} ${arrow}`;
      if (then&&now!==then) {
        then.textContent=`${then.dataset.title}`;
      }
    }

  //generate headers and rows with default values
    headerSort();
    updateHeadersSorting();
    customizeHeaders();
}
