(function () {
  "use strict";
  var key = window.location.hash.slice(1);
  var api = document.querySelector('meta[name="orders-api"]');
  var apiOrigin = api ? api.content : "";

  window.ordersApi = function (method, path, data, done) {
    var request = new XMLHttpRequest();
    request.open(method, apiOrigin + path);
    request.timeout = 12000;
    request.setRequestHeader("Authorization", "Bearer " + key);
    if (data) request.setRequestHeader("Content-Type", "application/json");
    request.onload = function () {
      var result;
      try { result = JSON.parse(request.responseText); } catch (error) { result = {}; }
      done(request.status, result);
    };
    request.ontimeout = request.onerror = function () { done(0, {}); };
    request.send(data ? JSON.stringify(data) : null);
  };

  window.hasOrderKey = /^[A-Za-z0-9_-]{32}$/.test(key);

  window.orderCells = function (row, order) {
    var date = order.dueDate.split("-").reverse().join("/");
    var closingDate = order.closingDate ? order.closingDate.split("-").reverse().join("/") : "—";
    var notes = (order.notes || "").trim();
    [order.machine, order.size || "—", date, order.customer, order.ncp, closingDate, notes || "—"].forEach(function (value) {
      var cell = row.insertCell();
      cell.textContent = value;
    });
    row.cells[6].classList.toggle("has-notes", notes.length > 0);
    return row;
  };
}());
