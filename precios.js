/*
  PRECIOS ACONCAGUA
  ------------------
  Para cambiar un precio, editá el número de la derecha (sin puntos ni el símbolo $)
  y guardá. Se actualiza solo en todas las páginas del sitio: home, catálogo
  y la ficha de cada producto.
*/
var PRECIOS = {
  cumbre:  60000,
  duna:    60000,
  glaciar: 60000,
  pampa:   60000,
  noche:   60000
};

/*
  OFERTA DE LANZAMIENTO
  ---------------------
  Precio que aparece tachado al lado del precio actual, con el % de descuento
  calculado solo. Para terminar la oferta de un modelo, poné 0.
*/
var PRECIOS_TACHADOS = {
  cumbre:  100000,
  duna:    100000,
  glaciar: 100000,
  pampa:   100000,
  noche:   100000
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
    var pesos = function (n) { return '$' + fmt.format(n); };
    var each = function (sel, fn) { document.querySelectorAll(sel).forEach(fn); };
    var hayOferta = false;

    Object.keys(PRECIOS).forEach(function (modelo) {
      var precio = PRECIOS[modelo];
      var tachado = PRECIOS_TACHADOS[modelo] || 0;
      var oferta = tachado > precio;
      if (oferta) { hayOferta = true; }

      each('[data-price="' + modelo + '"]', function (el) { el.textContent = pesos(precio); });
      each('[data-price-was="' + modelo + '"]', function (el) { el.textContent = pesos(tachado); });
      each('[data-price-off="' + modelo + '"]', function (el) {
        el.textContent = '−' + Math.round((1 - precio / tachado) * 100) + '%';
      });
      each('[data-offer="' + modelo + '"]', function (el) { el.style.display = oferta ? '' : 'none'; });
    });

    var minimo = Math.min.apply(null, Object.keys(PRECIOS).map(function (m) { return PRECIOS[m]; }));
    each('[data-price-min]', function (el) { el.textContent = pesos(minimo); });
    each('[data-offer-any]', function (el) { el.style.display = hayOferta ? '' : 'none'; });

    each('a[href*="wa.me/"]', function (a) {
      a.setAttribute('href', a.getAttribute('href').replace(/wa\.me\/\d+/, 'wa.me/' + WHATSAPP));
    });
    each('[data-whatsapp]', function (el) { el.textContent = WHATSAPP_VISIBLE; });

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
