var Ajax = function(options){
	//console.log('ok, got a query for ' + options.url);
	var request = new XMLHttpRequest();
	var url = options.url;
	var successCb = options.success;
	var failCb = options.fail;

	request.open('GET', url, true);

	request.onload = function() {
	  if (request.status >= 200 && request.status < 400) {
	    //console.log('Success!')
	    var data = JSON.parse(request.responseText);
	    //console.log(data);
	    successCb(data);
	  } else {
	    //console.log('We reached our target server, but it returned an error');
	    failCb(request.status);
	  }
	};

	request.onerror = function() {
	  console.log('failed, connection issue');
	  failCb(request.status);
	};

	request.send();
}

var getEl = function(el){
	var sel = el.substring(1,el.length);
	if(el.charAt(0)==='#'){
		return document.getElementById(sel);
	}else if(el.charAt(0)==='.'){
		return document.getElementByClassName(sel);
	}
}

var addClass = function(el, clazz){
	if (el.classList){
		el.classList.add(clazz);
	}else{
		el.className += ' ' + clazz;
	}
  	return el;
}

var newEl = function (tagName, className, container) {

	var el = document.createElement(tagName);
	el.className = className;

	if (container) {
		container.appendChild(el);
	}

	return el;
}
