(function () {
  "use strict";
  var form = document.getElementById("order-form");
  var fields = form.elements;
  var title = document.getElementById("form-title");
  var workspace = document.getElementById("workspace");
  var save = document.getElementById("save");
  var cancel = document.getElementById("cancel");
  var filter = document.getElementById("status-filter");
  var table = document.getElementById("orders");
  var empty = document.getElementById("empty");
  var message = document.getElementById("message");
  var refresh = document.getElementById("refresh");
  var themeToggle = document.getElementById("theme-toggle");
  var themeStorageKey = "ordens-de-producao-tema";
  var orders = [];
  var editing = null;
  var busy = false;

  function setDarkTheme(enabled) {
    document.body.classList.toggle("admin-dark", enabled);
    themeToggle.setAttribute("aria-checked", String(enabled));
  }

  if (themeToggle) {
    try {
      setDarkTheme(window.localStorage.getItem(themeStorageKey) === "escuro");
    } catch (error) {
      setDarkTheme(false);
    }
    themeToggle.onclick = function () {
      var enabled = themeToggle.getAttribute("aria-checked") !== "true";
      setDarkTheme(enabled);
      try {
        window.localStorage.setItem(themeStorageKey, enabled ? "escuro" : "claro");
      } catch (error) {
        // O tema continua disponível com o armazenamento do navegador bloqueado.
      }
    };
  }

  function notify(text, error) {
    message.hidden = !text;
    message.textContent = text;
    message.classList.toggle("error", !!error);
  }

  function clearForm() {
    editing = null;
    form.reset();
    title.textContent = "Nova ordem";
    save.textContent = "Criar ordem";
    cancel.hidden = true;
  }

  function edit(order) {
    if (busy) return;
    editing = order;
    ["machine", "dueDate", "ncp", "customer"].forEach(function (name) {
      fields[name].value = order[name];
    });
    title.textContent = "Editar ordem";
    save.textContent = "Salvar alterações";
    cancel.hidden = false;
    notify("");
    fields.machine.focus();
    form.scrollIntoView({ block: "start" });
  }

  function changeOrder(path, method, data, success, resetForm) {
    if (busy) return;
    busy = true;
    save.disabled = true;
    window.ordersApi(method, path, data, function (status, result) {
      busy = false;
      save.disabled = false;
      if (status !== 200 && status !== 201) {
        notify(result.error || "Falha de conexão. Confira a lista antes de tentar novamente.", true);
        if (status === 0 || status === 409) loadOrders();
        if (status === 409 && resetForm) clearForm();
        return;
      }
      if (resetForm) clearForm();
      notify(success);
      loadOrders();
    });
  }

  function button(label, action) {
    var control = document.createElement("button");
    control.type = "button";
    control.className = "secondary compact";
    control.textContent = label;
    control.onclick = action;
    return control;
  }

  function render() {
    table.textContent = "";
    var completed = filter.value === "completed";
    var visible = orders.filter(function (order) { return !!order.completed === completed; });
    visible.forEach(function (order) {
      var row = window.orderCells(table.insertRow(), order);
      var actions = row.insertCell();
      actions.className = "row-actions";
      actions.appendChild(button("Editar", function () { edit(order); }));
      actions.appendChild(button(completed ? "Reabrir" : "Concluir", function () {
        if (busy || !window.confirm((completed ? "Reabrir" : "Concluir") + " a ordem " + order.ncp + "?")) return;
        changeOrder("/api/ordens/" + order.id, "PATCH",
          { completed: !completed, revision: order.revision },
          completed ? "Ordem reaberta." : "Ordem concluída.", editing && editing.id === order.id);
      }));
    });
    empty.hidden = visible.length > 0;
    empty.textContent = completed ? "Nenhuma ordem concluída." : "Nenhuma ordem em aberto.";
  }

  function loadOrders() {
    if (refresh.disabled) return;
    refresh.disabled = true;
    window.ordersApi("GET", "/api/ordens", null, function (status, result) {
      refresh.disabled = false;
      if (status !== 200 || !Array.isArray(result.orders)) {
        if (status === 403) workspace.hidden = true;
        notify(result.error || "Não foi possível carregar a fila. Atualize a página para tentar novamente.", true);
        return;
      }
      orders = result.orders;
      workspace.hidden = false;
      render();
    });
  }

  form.onsubmit = function (event) {
    event.preventDefault();
    var data = {};
    ["machine", "dueDate", "ncp", "customer"].forEach(function (name) { data[name] = fields[name].value; });
    if (editing) data.revision = editing.revision;
    changeOrder(editing ? "/api/ordens/" + editing.id : "/api/ordens",
      editing ? "PATCH" : "POST", data, editing ? "Ordem atualizada." : "Ordem criada.", true);
  };
  cancel.onclick = clearForm;
  filter.onchange = render;
  refresh.onclick = function () { notify(""); loadOrders(); };
  if (window.hasOrderKey) loadOrders();
  else notify("Abra o link completo de cadastro.", true);
}());
