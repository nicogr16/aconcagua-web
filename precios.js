/*
  PRECIOS ACONCAGUA
  ------------------
  Para cambiar un precio, editá el número de la derecha (sin puntos ni el símbolo $)
  y guardá. Se actualiza solo en todas las páginas del sitio: home, catálogo
  y la ficha de cada producto.
*/
var PRECIOS = {
  cumbre:  99900,
  duna:    99900,
  glaciar: 79900,
  pampa:   89900,
  noche:   89900
};

(function () {
  var fmt = new Intl.NumberFormat('es-AR');
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-price]').forEach(function (el) {
      var precio = PRECIOS[el.getAttribute('data-price')];
      if (precio != null) {
        el.textContent = '$' + fmt.format(precio);
      }
    });
  });
})();
