(function () {
  "use strict";
  var pageTime = 15000;
  var list = document.getElementById("tv-orders");
  var table = document.getElementById("tv-table");
  var empty = document.getElementById("tv-empty");
  var count = document.getElementById("count");
  var pageLabel = document.getElementById("page");
  var connection = document.getElementById("connection");
  var progress = document.getElementById("progress");
  var orders = [];
  var pending = null;
  var loaded = false;
  var page = 0;
  var started = Date.now();
  var rowLimit = 8;
  var activeBar;

  function pages() { return Math.max(1, Math.ceil(orders.length / rowLimit)); }

  function render() {
    var total = pages();
    list.textContent = "";
    orders.slice(page * rowLimit, (page + 1) * rowLimit).forEach(function (order) {
      window.orderCells(list.insertRow(), order);
    });
    table.hidden = orders.length === 0;
    empty.hidden = orders.length > 0;
    if (loaded) empty.textContent = "Nenhuma ordem em aberto.";
    count.textContent = loaded ? orders.length + (orders.length === 1 ? " ordem em aberto" : " ordens em aberto") : "";
    pageLabel.textContent = total > 1 ? (page + 1) + " / " + total : "";
    progress.textContent = "";
    activeBar = null;
    if (total === 1) return;
    for (var index = 0; index < total; index++) {
      var segment = document.createElement("span");
      var fill = document.createElement("i");
      fill.style.width = index < page ? "100%" : "0%";
      if (index === page) activeBar = fill;
      segment.appendChild(fill);
      progress.appendChild(segment);
    }
  }

  function resize() {
    rowLimit = window.innerHeight < 480 ? 5 : window.innerHeight < 600 ? 6 : 8;
    page = Math.min(page, pages() - 1);
    render();
  }

  function tick() {
    var now = Date.now();
    var elapsed = now - started;
    if (pages() > 1 && elapsed >= pageTime) {
      page = (page + 1) % pages();
      if (page === 0 && pending) {
        orders = pending;
        pending = null;
      }
      started = now;
      elapsed = 0;
      render();
    }
    if (activeBar) activeBar.style.width = Math.min(100, elapsed / pageTime * 100) + "%";
  }

  function sync() {
    window.ordersApi("GET", "/api/painel", null, function (status, result) {
      if (status === 403) {
        orders = [];
        pending = null;
        loaded = false;
        page = 0;
        render();
        empty.textContent = "Abra o link completo do painel.";
        connection.textContent = "";
        return;
      }
      if (status === 200 && Array.isArray(result.orders)) {
        if (!loaded || pages() === 1) {
          var rotating = pages() > 1;
          orders = result.orders;
          pending = null;
          loaded = true;
          if (!rotating && pages() > 1) started = Date.now();
          render();
        } else {
          pending = result.orders;
        }
        connection.textContent = "";
      } else {
        if (!loaded) empty.textContent = "Aguardando conexão…";
        connection.textContent = loaded ? "Sem atualização · exibindo a última lista" : "Tentando reconectar";
      }
      window.setTimeout(sync, 30000);
    });
  }

  if (!window.hasOrderKey) {
    empty.textContent = "Abra o link completo do painel.";
    return;
  }
  resize();
  window.addEventListener("resize", resize);
  window.setInterval(tick, 100);
  sync();
}());
