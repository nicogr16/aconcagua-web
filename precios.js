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

/*
  WHATSAPP
  --------
  Si cambia el número, editá estas dos líneas y se actualiza en todos los botones del sitio.
  WHATSAPP: solo números, con código de país (54) y el 9 de celular.
  WHATSAPP_VISIBLE: cómo se muestra escrito en la sección de contacto.
*/
var WHATSAPP = '5491178175503';
var WHATSAPP_VISIBLE = '+54 9 11 7817-5503';

/* ---- No hace falta tocar nada de acá para abajo ---- */
(function () {
  function init() {
    var fmt = new Intl.NumberFormat('es-AR');

    document.querySelectorAll('[data-price]').forEach(function (el) {
      var precio = PRECIOS[el.getAttribute('data-price')];
      if (precio != null) {
        el.textContent = '$' + fmt.format(precio);
      }
    });

    document.querySelectorAll('a[href*="wa.me/"]').forEach(function (a) {
      a.setAttribute('href', a.getAttribute('href').replace(/wa\.me\/\d+/, 'wa.me/' + WHATSAPP));
    });
    document.querySelectorAll('[data-whatsapp]').forEach(function (el) {
      el.textContent = WHATSAPP_VISIBLE;
    });

    /* Datos estructurados para Google: agrega el precio vigente a la ficha del producto */
    var ld = document.getElementById('ld-producto');
    if (ld) {
      try {
        var data = JSON.parse(ld.textContent);
        var precio = PRECIOS[ld.getAttribute('data-modelo')];
        (data['@graph'] || []).forEach(function (nodo) {
          if (nodo['@type'] === 'Product' && precio != null) {
            nodo.offers = {
              '@type': 'Offer',
              price: precio,
              priceCurrency: 'ARS',
              url: nodo.url,
              seller: { '@type': 'Organization', name: 'Aconcagua' }
            };
          }
        });
        ld.textContent = JSON.stringify(data);
      } catch (e) { /* si el bloque no se puede leer, la página sigue funcionando igual */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
