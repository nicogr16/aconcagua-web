/*
  PEDIDOS, ENVÍOS Y PAGO ACONCAGUA
  --------------------------------
  Acá se editan los costos de envío, el alias para transferir y la conexión con la
  planilla de pedidos. El formulario de cada ficha y la tabla de envíos de
  Preguntas frecuentes se arman solos con estos datos.

  Los costos de envío son por un par, por Correo Argentino (PAQ.AR Clásico).
  Cuando el Correo actualice sus tarifas, cambiá los números de abajo (sin puntos
  ni el símbolo $) y también los de Codigo.gs, que controla los precios de los pedidos.
*/

/*
  Dirección del script de Google que lee el stock y registra los pedidos (termina en /exec).
  Mientras esté vacía, la web no toma pedidos: muestra el total y deriva a WhatsApp.
*/
var PEDIDOS_URL = 'https://script.google.com/macros/s/AKfycbyZRbcKjtYJsoLHRk9_eNUrQHInrIYO4DqXvu6d5ky0_avm3DduBXsYoJA8cPI1DY2e5g/exec';

/* Alias para cobrar por transferencia */
var ALIAS_TRANSFERENCIA = 'aconcagua.fit';

/* Retiro en persona sin costo. Para dejar de ofrecerlo, poné RETIRO_GRATIS = false */
var RETIRO_GRATIS = true;
var RETIRO_ZONA = 'Ciudad Evita, La Matanza';

/*
  Costo de envío por zona, para UN par.
  domicilio: Correo Argentino lo lleva a la casa del cliente.
  sucursal:  el cliente lo retira en una sucursal del Correo.
*/
var ENVIO_ZONAS = {
  amba:   { domicilio:  9000, sucursal: 6000 },  /* CABA y Gran Buenos Aires */
  centro: { domicilio: 11000, sucursal: 7000 },  /* La Plata e interior de Buenos Aires, Córdoba, Santa Fe, Entre Ríos y La Pampa */
  norte:  { domicilio: 12000, sucursal: 8000 },  /* Cuyo, Tucumán, Catamarca, Santiago, NEA, Neuquén y Río Negro */
  lejos:  { domicilio: 12000, sucursal: 8000 }   /* Salta, Jujuy, Chubut, Santa Cruz y Tierra del Fuego */
};

/* ---- No hace falta tocar nada de acá para abajo ---- */

/* Zona del Correo de cada destino */
var ENVIO_DESTINOS = [
  ['caba',       'Ciudad de Buenos Aires (CABA)',                        'amba'],
  ['gba',        'Gran Buenos Aires (conurbano, Pilar, Escobar, Zárate…)', 'amba'],
  ['pba',        'Buenos Aires: La Plata, Luján, Costa e interior',      'centro'],
  ['catamarca',  'Catamarca',           'norte'],
  ['chaco',      'Chaco',               'norte'],
  ['chubut',     'Chubut',              'lejos'],
  ['cordoba',    'Córdoba',             'centro'],
  ['corrientes', 'Corrientes',          'norte'],
  ['entrerios',  'Entre Ríos',          'centro'],
  ['formosa',    'Formosa',             'norte'],
  ['jujuy',      'Jujuy',               'lejos'],
  ['lapampa',    'La Pampa',            'centro'],
  ['larioja',    'La Rioja',            'norte'],
  ['mendoza',    'Mendoza',             'norte'],
  ['misiones',   'Misiones',            'norte'],
  ['neuquen',    'Neuquén',             'norte'],
  ['rionegro',   'Río Negro',           'norte'],
  ['salta',      'Salta',               'lejos'],
  ['sanjuan',    'San Juan',            'norte'],
  ['sanluis',    'San Luis',            'norte'],
  ['santacruz',  'Santa Cruz',          'lejos'],
  ['santafe',    'Santa Fe',            'centro'],
  ['santiago',   'Santiago del Estero', 'norte'],
  ['tdf',        'Tierra del Fuego',    'lejos'],
  ['tucuman',    'Tucumán',             'norte']
];

var ENVIO_ZONA_NOMBRES = {
  amba:   'CABA y Gran Buenos Aires',
  centro: 'La Plata e interior de Buenos Aires, Córdoba, Santa Fe, Entre Ríos y La Pampa',
  norte:  'Mendoza, San Juan, San Luis, La Rioja, Catamarca, Tucumán, Santiago del Estero, Chaco, Corrientes, Misiones, Formosa, Neuquén y Río Negro',
  lejos:  'Salta, Jujuy, Chubut, Santa Cruz y Tierra del Fuego'
};

(function () {
  var fmt = new Intl.NumberFormat('es-AR');
  var pesos = function (n) { return '$' + fmt.format(n); };
  var ENTREGAS = {
    domicilio: 'Envío a domicilio',
    sucursal:  'Envío a sucursal del Correo',
    retiro:    'Retiro en persona'
  };
  var GUARDADO = 'aconcagua-pedido';
  var DOS_DIAS = 48 * 3600 * 1000;

  function destino(id) {
    for (var i = 0; i < ENVIO_DESTINOS.length; i++) {
      if (ENVIO_DESTINOS[i][0] === id) { return ENVIO_DESTINOS[i]; }
    }
    return null;
  }

  /* Costo del envío; null si todavía falta elegir el destino */
  function costoEnvio(entrega, destinoId) {
    if (entrega === 'retiro') { return 0; }
    var d = destino(destinoId);
    var zona = d && ENVIO_ZONAS[d[2]];
    return zona ? zona[entrega] : null;
  }

  function desde(entrega) {
    var min = Infinity;
    Object.keys(ENVIO_ZONAS).forEach(function (z) { min = Math.min(min, ENVIO_ZONAS[z][entrega]); });
    return min;
  }

  function copiarAlias(boton) {
    var listo = function () {
      var antes = boton.textContent;
      boton.textContent = '¡Copiado!';
      avisar('Alias copiado: ' + ALIAS_TRANSFERENCIA, 'ok');
      setTimeout(function () { boton.textContent = antes; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ALIAS_TRANSFERENCIA).then(listo, function () {});
    } else {
      var t = document.createElement('textarea');
      t.value = ALIAS_TRANSFERENCIA;
      t.setAttribute('readonly', '');
      t.style.position = 'absolute';
      t.style.left = '-9999px';
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); listo(); } catch (e) { /* sin portapapeles */ }
      document.body.removeChild(t);
    }
  }

  function enlaceWhatsApp(texto) {
    var numero = (typeof WHATSAPP !== 'undefined') ? WHATSAPP : '';
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
  }

  function pedirJSON(url, opciones, espera) {
    var control = ('AbortController' in window) ? new AbortController() : null;
    var reloj = control && setTimeout(function () { control.abort(); }, espera);
    if (control) { opciones.signal = control.signal; }
    return fetch(url, opciones).then(function (r) {
      if (!r.ok) { throw new Error('HTTP ' + r.status); }
      return r.json();
    }).finally(function () { clearTimeout(reloj); });
  }

  /*
    Datos de despacho: los mismos que pide MiCorreo para cargar un envío.
    grupo: cuándo se pide ('todos', 'envio' = domicilio o sucursal, 'domicilio', 'sucursal').
    La provincia no se repite: sale del destino elegido.
  */
  var CAMPOS = [
    { id: 'nombre',        grupo: 'todos',     texto: 'Nombre y apellido',    auto: 'name',          max: 80 },
    { id: 'area',          grupo: 'todos',     texto: 'Área (sin 0)',         auto: 'tel-area-code', max: 5,  tipo: 'tel', teclado: 'numeric', ancho: 't2' },
    { id: 'celular',       grupo: 'todos',     texto: 'Celular (sin 15)',     auto: 'tel-local',     max: 12, tipo: 'tel', teclado: 'numeric', ancho: 't4' },
    { id: 'email',         grupo: 'envio',     texto: 'Correo electrónico',   auto: 'email',         max: 100, tipo: 'email' },
    { id: 'localidad',     grupo: 'domicilio', texto: 'Localidad o barrio',   max: 60, ancho: 't4', ayuda: 'Escribí y elegí' },
    { id: 'cp',            grupo: 'domicilio', texto: 'Cód. postal',          auto: 'postal-code',   max: 8,  ancho: 't2' },
    { id: 'calle',         grupo: 'domicilio', texto: 'Calle',                auto: 'address-line1', max: 70, ancho: 't4' },
    { id: 'altura',        grupo: 'domicilio', texto: 'Número',               max: 8,  ancho: 't2', ayuda: 'o S/N' },
    { id: 'piso',          grupo: 'domicilio', texto: 'Piso, depto o referencia (opcional)', auto: 'address-line2', max: 40, opcional: true },
    { id: 'sucursal',      grupo: 'sucursal',  texto: 'Sucursal del Correo donde lo retirás', max: 120 },
    { id: 'observaciones', grupo: 'todos',     texto: 'Observaciones (opcional)', max: 200, area: true, opcional: true }
  ];

  function bloqueDatos() {
    var campos = CAMPOS.map(function (c) {
      /* La sucursal se elige con el buscador; el valor viaja en un campo oculto */
      if (c.id === 'sucursal') {
        return '<div class="ped-input ped-suc" data-grupo="sucursal"><span id="suc-titulo">' + c.texto + '</span>' +
          '<div class="ped-suc-buscar"><input type="search" data-suc-texto aria-labelledby="suc-titulo" aria-describedby="suc-estado" ' +
          'placeholder="Código postal, localidad o calle" autocomplete="off" enterkeyhint="search" maxlength="60">' +
          '<button type="button" class="ped-ubicacion">Usar mi ubicación</button></div>' +
          '<p class="ped-suc-estado" id="suc-estado" aria-live="polite"></p>' +
          '<ul class="ped-suc-lista" hidden></ul><div class="ped-suc-elegida" hidden></div>' +
          '<input type="hidden" name="sucursal"></div>';
      }
      var atributos = ' name="' + c.id + '" maxlength="' + c.max + '"' +
        (c.auto ? ' autocomplete="' + c.auto + '"' : '') +
        (c.teclado ? ' inputmode="' + c.teclado + '"' : '') +
        (c.ayuda ? ' placeholder="' + c.ayuda + '"' : '') +
        (c.opcional ? '' : ' required');
      var control = c.area ? '<textarea rows="2"' + atributos + '></textarea>'
        : '<input type="' + (c.tipo || 'text') + '"' + atributos + '>';
      return '<label class="ped-input ' + (c.ancho || '') + '" data-grupo="' + c.grupo + '"><span>' + c.texto + '</span>' + control + '</label>';
    }).join('');
    var bloque = document.createElement('fieldset');
    bloque.className = 'ped-datos';
    /* La casilla "sitio_extra" está fuera de la vista: solo la completan los robots */
    bloque.innerHTML = '<legend class="ped-label">Tus datos</legend><div class="ped-campos">' + campos +
      '</div><input class="ped-trampa" type="text" name="sitio_extra" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="ped-privacidad">Usamos estos datos solo para preparar y enviar tu pedido.</p>';
    return bloque;
  }

  /* Nombre de la provincia tal como figura en MiCorreo */
  function provincia(d) {
    if (d[0] === 'caba') { return 'Capital Federal'; }
    if (d[0] === 'gba' || d[0] === 'pba') { return 'Buenos Aires'; }
    return d[1];
  }

  /* Área y número sin 0 ni 15: juntos son 10 dígitos. Devuelve null si no cierra. */
  function telefono(area, numero) {
    var a = area.replace(/\D/g, '').replace(/^0+/, '');
    var n = numero.replace(/\D/g, '');
    if (a.length + n.length === 12 && n.indexOf('15') === 0) { n = n.slice(2); }
    return a.length >= 2 && a.length + n.length === 10 ? a + ' ' + n : null;
  }

  /* Aviso flotante, uno por vez. El error además queda escrito junto al campo */
  var avisoCaja, avisoReloj;
  function avisar(texto, tipo) {
    if (!avisoCaja) {
      avisoCaja = document.createElement('div');
      avisoCaja.className = 'toast';
      avisoCaja.setAttribute('role', 'status');
      avisoCaja.addEventListener('click', function () { avisoCaja.classList.remove('visible'); });
      document.body.appendChild(avisoCaja);
    }
    clearTimeout(avisoReloj);
    avisoCaja.setAttribute('data-tipo', tipo || 'info');
    avisoCaja.textContent = texto;
    avisoCaja.classList.add('visible');
    avisoReloj = setTimeout(function () { avisoCaja.classList.remove('visible'); }, tipo === 'error' ? 6000 : 3500);
  }

  function plano(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  var localidadesPedidas;
  function cargarLocalidades() {
    if (!localidadesPedidas) { localidadesPedidas = pedirJSON('localidades.json', {}, 15000); }
    return localidadesPedidas;
  }

  /*
    Localidad con búsqueda, según el destino elegido (lista oficial Georef).
    Solo se acepta una opción de la lista o, si no figura, que el cliente lo confirme.
  */
  function buscador(input, destinoActual) {
    var lista = document.createElement('ul');
    lista.className = 'ped-lista';
    lista.id = 'lista-localidades';
    lista.setAttribute('role', 'listbox');
    lista.setAttribute('aria-label', 'Localidades');
    lista.hidden = true;
    input.parentNode.appendChild(lista);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-controls', lista.id);
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('autocomplete', 'off');

    var datos = null, fallo = false, opciones = [], activa = -1, aceptado = '';

    cargarLocalidades().then(function (d) {
      datos = d;
      if (document.activeElement === input) { abrir(); }
    }).catch(function () { fallo = true; });

    function delDestino() { return (datos && datos[destinoActual()]) || []; }
    function nombreDe(item) { return typeof item === 'string' ? item : item[0]; }
    function buscarExacta(texto) {
      var q = plano(texto);
      return q ? delDestino().filter(function (item) { return plano(nombreDe(item)) === q; })[0] : undefined;
    }

    function cerrar() {
      lista.hidden = true;
      activa = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function elegir(texto) {
      input.value = aceptado = texto.slice(0, 60);
      cerrar();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function resaltar(i) {
      activa = i;
      Array.prototype.forEach.call(lista.children, function (li, k) {
        li.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
      input.setAttribute('aria-activedescendant', lista.children[i].id);
      lista.children[i].scrollIntoView({ block: 'nearest' });
    }

    function abrir() {
      if (!datos || !destinoActual()) { cerrar(); return; }
      var q = plano(input.value);
      var primeras = [], resto = [];
      delDestino().forEach(function (item) {
        var n = plano(nombreDe(item));
        if (n.indexOf(q) === 0) { primeras.push(item); }
        else if (n.indexOf(q) > 0 || (typeof item !== 'string' && plano(item[1]).indexOf(q) === 0)) { resto.push(item); }
      });
      opciones = primeras.concat(resto).slice(0, 40).map(function (item) {
        return { valor: nombreDe(item), texto: nombreDe(item), extra: typeof item === 'string' ? '' : item[1] };
      });
      if (q.length >= 3 && !buscarExacta(input.value)) {
        var escrito = input.value.trim();
        opciones.push({ valor: escrito, texto: 'No está en la lista: usar «' + escrito + '»', extra: '' });
      }
      lista.textContent = '';
      opciones.forEach(function (o, i) {
        var li = document.createElement('li');
        li.id = 'loc-' + i;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        li.textContent = o.texto;
        if (o.extra) {
          var s = document.createElement('small');
          s.textContent = o.extra;
          li.appendChild(s);
        }
        /* pointerdown: que el campo no pierda el foco antes del toque */
        li.addEventListener('pointerdown', function (e) { e.preventDefault(); });
        li.addEventListener('click', function (e) { e.preventDefault(); elegir(o.valor); });
        lista.appendChild(li);
      });
      lista.hidden = !opciones.length;
      input.setAttribute('aria-expanded', opciones.length ? 'true' : 'false');
      activa = -1;
    }

    input.addEventListener('focus', abrir);
    input.addEventListener('input', function () { aceptado = ''; abrir(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (lista.hidden) { abrir(); return; }
        var n = opciones.length;
        resaltar(e.key === 'ArrowDown' ? (activa + 1) % n : (activa <= 0 ? n : activa) - 1);
      } else if (e.key === 'Enter' && !lista.hidden) {
        e.preventDefault();
        elegir(opciones[Math.max(activa, 0)].valor);
      } else if (e.key === 'Escape') {
        cerrar();
      }
    });
    input.addEventListener('blur', function () {
      /* Si lo escrito coincide con una localidad, se toma la forma oficial */
      var item = buscarExacta(input.value);
      if (item) { input.value = aceptado = nombreDe(item); }
      cerrar();
    });

    return {
      valida: function () {
        if (fallo || !datos) { return input.value.trim().length >= 2; }
        var item = buscarExacta(input.value);
        if (item) { input.value = aceptado = nombreDe(item); }
        return aceptado !== '' && aceptado === input.value;
      },
      limpiar: function () { input.value = ''; aceptado = ''; cerrar(); }
    };
  }

  var sucursalesPedidas;
  function cargarSucursales() {
    if (!sucursalesPedidas) {
      sucursalesPedidas = pedirJSON('sucursales.json', {}, 20000).catch(function (e) {
        sucursalesPedidas = null;
        throw e;
      });
    }
    return sucursalesPedidas;
  }

  /* El Correo publica todo en mayúsculas */
  function bonito(s) {
    return String(s).toLowerCase().replace(/(^|[\s(\/.-])([a-záéíóúñü])/g, function (t, a, b) { return a + b.toUpperCase(); });
  }

  function kilometros(a, b, c, d) {
    var R = Math.PI / 180;
    var x = Math.sin((c - a) * R / 2), y = Math.sin((d - b) * R / 2);
    return 12742 * Math.asin(Math.sqrt(x * x + Math.cos(a * R) * Math.cos(c * R) * y * y));
  }

  function distancia(km) {
    return km < 1 ? 'a ' + Math.max(1, Math.round(km * 10)) * 100 + ' m' : 'a ' + km.toFixed(km < 10 ? 1 : 0).replace('.', ',') + ' km';
  }

  /*
    Buscador de sucursales del Correo (sucursales.json): por código postal o ubicación
    muestra las más cercanas; por texto, las que coinciden. La ubicación del cliente
    se usa solo en su navegador para ordenar la lista: no se envía ni se guarda.
    Cada punto: [nombre, dirección, localidad, provincia, lat, lng, horario, tipo, destino]
  */
  function selectorSucursal(caja, destinoActual, alElegir) {
    var texto = caja.querySelector('[data-suc-texto]');
    var ubicar = caja.querySelector('.ped-ubicacion');
    var estado = caja.querySelector('.ped-suc-estado');
    var lista = caja.querySelector('.ped-suc-lista');
    var elegida = caja.querySelector('.ped-suc-elegida');
    var oculto = caja.querySelector('input[type="hidden"]');
    var buscarCaja = caja.querySelector('.ped-suc-buscar');
    var datos = null, manual = false, punto = null, reloj;

    function cargar() {
      if (datos || manual) { return; }
      cargarSucursales().then(function (d) {
        datos = d;
        if (texto.value.trim()) { buscar(); }
      }).catch(function () {
        /* Sin la lista, el cliente la escribe a mano y elige el destino como siempre */
        manual = true;
        ubicar.hidden = true;
        texto.placeholder = 'Nombre de la sucursal, o calle y localidad';
        texto.maxLength = 120;
        estado.textContent = 'No pudimos cargar la lista: escribí la sucursal donde querés retirarlo.';
        oculto.value = texto.value.trim();
        alElegir();
      });
    }

    function elemento(etiqueta, clase, contenido) {
      var el = document.createElement(etiqueta);
      if (clase) { el.className = clase; }
      if (contenido) { el.textContent = contenido; }
      return el;
    }

    function lugarDe(s) {
      return s[3] === 'C' ? 'CABA' : bonito(s[2]) + ', ' + datos.provincias[s[3]];
    }

    function ficha(s, km) {
      var f = document.createDocumentFragment();
      var titulo = elemento('strong', '', (s[7] ? 'Punto Correo ' : 'Sucursal ') + bonito(s[0]));
      if (km != null) { titulo.appendChild(elemento('em', '', distancia(km))); }
      f.appendChild(titulo);
      f.appendChild(elemento('small', '', bonito(s[1]) + ' · ' + lugarDe(s)));
      if (s[6]) { f.appendChild(elemento('small', '', 'Horario: ' + s[6].toLowerCase())); }
      return f;
    }

    function elegir(s) {
      punto = s;
      oculto.value = ((s[7] ? 'PUNTO CORREO ' : 'SUCURSAL ') + s[0] + ' — ' + s[1] + ', ' + lugarDe(s)).slice(0, 120);
      elegida.textContent = '';
      var info = elemento('div');
      info.appendChild(ficha(s));
      var otra = elemento('button', 'ped-copiar', 'Cambiar');
      otra.type = 'button';
      otra.addEventListener('click', function () {
        soltar();
        alElegir();
        texto.focus();
      });
      elegida.appendChild(info);
      elegida.appendChild(otra);
      elegida.hidden = false;
      buscarCaja.hidden = lista.hidden = estado.hidden = true;
      alElegir();
    }

    function soltar() {
      punto = null;
      oculto.value = '';
      elegida.hidden = true;
      buscarCaja.hidden = estado.hidden = false;
      lista.hidden = !lista.children.length;
    }

    function mostrar(resultados, mensaje) {
      estado.textContent = mensaje;
      lista.textContent = '';
      resultados.forEach(function (r) {
        var li = document.createElement('li');
        var boton = elemento('button');
        boton.type = 'button';
        boton.appendChild(ficha(r.s, r.km));
        boton.addEventListener('click', function () { elegir(r.s); });
        li.appendChild(boton);
        lista.appendChild(li);
      });
      lista.hidden = !resultados.length;
      lista.scrollTop = 0;
    }

    function cercanas(lat, lng, desdeDonde) {
      var orden = datos.suc.filter(function (s) { return s[4] != null; }).map(function (s) {
        return { s: s, km: kilometros(lat, lng, s[4], s[5]) };
      }).sort(function (a, b) { return a.km - b.km; });
      mostrar(orden.slice(0, 8), 'Las más cercanas ' + desdeDonde + ' (distancia aproximada, en línea recta):');
    }

    function porCodigo(cp) {
      if (cp >= 1000 && cp <= 1499) {
        mostrar([], 'En Capital el código postal no alcanza para ubicarte: tocá «Usar mi ubicación» o escribí tu barrio o calle.');
        return;
      }
      /* Si ese código no figura, sirve uno pegado */
      for (var d = 0; d <= 3; d++) {
        var c = datos.cp[cp - d] || datos.cp[cp + d];
        if (c) { cercanas(c[0], c[1], 'al código postal ' + cp); return; }
      }
      mostrar([], 'No tenemos ubicado ese código postal. Probá con el nombre de tu localidad.');
    }

    function buscar() {
      var v = texto.value.trim();
      if (!datos || manual) { return; }
      var cp = /^(?:[a-z]\s?)?(\d{4})(?:\s?[a-z]{3})?$/i.exec(v);
      if (cp) { porCodigo(Number(cp[1])); return; }
      var q = plano(v);
      if (q.length < 3) {
        mostrar([], v ? 'Escribí al menos 3 letras, o los 4 números del código postal.' : '');
        return;
      }
      var palabras = q.split(' ');
      var destino = destinoActual();
      var halladas = datos.suc.filter(function (s) {
        if (!s.indice) { s.indice = plano([s[0], s[1], s[2], datos.provincias[s[3]], s[3] === 'C' ? 'caba' : ''].join(' ')); }
        return palabras.every(function (p) { return s.indice.indexOf(p) >= 0; });
      });
      /* Primero las del destino elegido y las de la localidad escrita; sucursales antes que puntos */
      var peso = function (s) {
        return (s[8] === destino ? 0 : 2) + (plano(s[2]).indexOf(q) === 0 || plano(s[0]).indexOf(q) === 0 ? 0 : 1);
      };
      halladas.sort(function (a, b) { return peso(a) - peso(b) || a[7] - b[7] || a[0].localeCompare(b[0]); });
      mostrar(halladas.slice(0, 30).map(function (s) { return { s: s }; }),
        !halladas.length ? 'No encontramos sucursales con «' + v + '». Probá con tu código postal.'
          : halladas.length > 30 ? 'Hay ' + halladas.length + ' resultados: sumá la calle o la localidad para afinar.'
            : halladas.length === 1 ? '1 resultado:' : halladas.length + ' resultados:');
    }

    texto.addEventListener('focus', cargar);
    texto.addEventListener('input', function () {
      if (manual) { oculto.value = texto.value.trim(); return; }
      cargar();
      clearTimeout(reloj);
      reloj = setTimeout(buscar, 200);
    });
    texto.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || manual) { return; }
      e.preventDefault(); /* Enter busca; no envía el pedido */
      clearTimeout(reloj);
      buscar();
      var primero = lista.querySelector('button');
      if (primero) { primero.focus(); }
    });

    if (!navigator.geolocation) { ubicar.hidden = true; }
    ubicar.addEventListener('click', function () {
      estado.textContent = 'Buscando tu ubicación…';
      ubicar.disabled = true;
      var sinUbicacion = function () {
        ubicar.disabled = false;
        estado.textContent = 'No pudimos usar tu ubicación. Escribí tu código postal, localidad o calle.';
      };
      navigator.geolocation.getCurrentPosition(function (p) {
        cargarSucursales().then(function (d) {
          datos = d;
          ubicar.disabled = false;
          texto.value = '';
          cercanas(p.coords.latitude, p.coords.longitude, 'a vos');
        }).catch(sinUbicacion);
      }, sinUbicacion, { timeout: 12000, maximumAge: 600000 });
    });

    return {
      cargar: cargar,
      manual: function () { return manual; },
      destino: function () { return punto ? punto[8] : ''; },
      foco: function () { return texto; },
      limpiar: function () {
        texto.value = '';
        mostrar([], '');
        soltar();
        if (manual) { oculto.value = ''; }
      }
    };
  }

  /* Correos mal tipeados más comunes */
  var DOMINIOS = {
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com',
    'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gamil.com': 'gmail.com', 'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'outlok.com': 'outlook.com', 'yaho.com': 'yahoo.com'
  };

  /* Caracteres que cada campo descarta mientras se escribe */
  var FILTROS = {
    area: /[^\d]/g, celular: /[^\d\s-]/g, cp: /[^a-z\d]/gi,
    nombre: /[0-9@#$%^&*()_+=\[\]{}<>\\\/|;:!?",]/g
  };

  /* Mensaje de error de un campo con algo escrito, o '' si está bien */
  function revisar(id, v, area, destinoId) {
    if (id === 'nombre' && !/\S{2,}\s+\S{2,}/.test(v)) { return 'Escribí nombre y apellido.'; }
    if (id === 'area' && !/^0?[1-9]\d{1,3}$/.test(v)) { return 'El código de área tiene de 2 a 4 números, por ejemplo 11 o 351.'; }
    if (id === 'celular' && !telefono(area, v)) { return 'Revisá el celular: área más número son 10 dígitos, sin 0 y sin 15.'; }
    if (id === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) { return 'Revisá el correo electrónico.'; }
      var partes = v.split('@');
      var bueno = DOMINIOS[partes[1].toLowerCase()];
      if (bueno) { return '¿Quisiste decir ' + partes[0] + '@' + bueno + '? Corregilo para seguir.'; }
    }
    if (id === 'cp') {
      var m = /^(?:[a-z](\d{4})[a-z]{3}|(\d{4}))$/i.exec(v);
      var num = m ? Number(m[1] || m[2]) : 0;
      if (num < 1000 || num > 9431) { return 'Revisá el código postal: son 4 números, por ejemplo 5000.'; }
      if (destinoId === 'caba' && num > 1499) { return 'Ese código postal no es de la Ciudad de Buenos Aires. Revisá el código o el destino.'; }
    }
    if (id === 'calle' && v.length < 2) { return 'Escribí el nombre de la calle.'; }
    if (id === 'altura' && !/^(\d{1,6}\s?[a-z]?|s\/?n|km\s?\d+)$/i.test(v)) { return 'Poné el número de la calle, o S/N si no tiene.'; }
    if (id === 'sucursal' && v.length < 5) { return 'Indicá la sucursal: nombre, o calle y localidad.'; }
    return '';
  }

  /* El último pedido queda en el navegador del cliente, por si la página se recarga al ir al banco */
  function leerGuardado() {
    try {
      var g = JSON.parse(localStorage.getItem(GUARDADO));
      return g && Date.now() - g.fecha < DOS_DIAS ? g : null;
    } catch (e) { return null; }
  }
  function guardar(pedido) {
    try {
      if (pedido) { localStorage.setItem(GUARDADO, JSON.stringify(pedido)); }
      else { localStorage.removeItem(GUARDADO); }
    } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }

  function initPedido(form) {
    var modelo = form.getAttribute('data-pedido');
    var nombre = form.getAttribute('data-nombre') || modelo.toUpperCase();
    var precio = (typeof PRECIOS !== 'undefined' && PRECIOS[modelo]) || 0;
    var select = form.querySelector('select[name="destino"]');
    var campoDestino = form.querySelector('[data-ped-destino]');
    var boton = form.querySelector('[data-ped-enviar]');
    var consulta = form.querySelector('[data-ped-consulta]');
    var aviso = form.querySelector('[data-ped-aviso]');
    var pasos = form.querySelector('[data-ped-pago]');
    var error = form.querySelector('[data-ped-error]');
    var lugarError = { padre: error.parentNode, antes: boton };

    /* 'cargando': consultando stock · 'listo': toma pedidos · 'consulta': solo WhatsApp */
    var modo = PEDIDOS_URL ? 'cargando' : 'consulta';
    var disponibles = null;
    var enviando = false;
    var ultimoEnviado = '', ref = '';

    form.noValidate = true;

    ENVIO_DESTINOS.forEach(function (d) {
      var op = document.createElement('option');
      op.value = d[0];
      op.textContent = d[1];
      select.appendChild(op);
    });

    if (!RETIRO_GRATIS) {
      var opRetiro = form.querySelector('[data-ped-opcion="retiro"]');
      if (opRetiro) { opRetiro.parentNode.removeChild(opRetiro); }
    }

    /* Largo de plantilla por talle, leído de la tabla de talles de la misma ficha */
    var plantillas = {};
    var tablaTalles = document.querySelector('.size-mini');
    if (tablaTalles) {
      var celdas = tablaTalles.querySelectorAll('tbody td');
      tablaTalles.querySelectorAll('thead th[scope="col"]').forEach(function (th, i) {
        if (celdas[i]) { plantillas[th.textContent.trim()] = celdas[i].textContent.trim(); }
      });
    }
    var talles = form.querySelector('.ped-talles');
    var pista = document.createElement('p');
    pista.className = 'ped-plantilla';
    pista.setAttribute('aria-live', 'polite');
    talles.insertAdjacentElement('afterend', pista);

    var datos = bloqueDatos();
    form.querySelector('.ped-resumen').insertAdjacentElement('beforebegin', datos);
    var localidad = buscador(form.elements.localidad, function () { return select.value; });
    var sucursal = selectorSucursal(datos.querySelector('.ped-suc'), function () { return select.value; },
      function () { limpiarError(); actualizar(); });

    function valor(nombreCampo) {
      var marcado = form.querySelector('input[name="' + nombreCampo + '"]:checked:not(:disabled)');
      return marcado ? marcado.value : '';
    }

    function dato(id) { return form.elements[id].value.trim(); }

    function pide(campo, entrega) {
      return campo.grupo === 'todos' || campo.grupo === entrega || (campo.grupo === 'envio' && entrega !== 'retiro');
    }

    /* Marca los talles sin stock y agrega los que haya en la planilla y no estén en la ficha */
    function aplicarStock(lista) {
      disponibles = lista.map(String);
      disponibles.forEach(function (t) {
        if (talles.querySelector('input[value="' + Number(t) + '"]')) { return; }
        var chip = document.createElement('label');
        chip.className = 'ped-chip';
        chip.innerHTML = '<input type="radio" name="talle" value="' + Number(t) + '"><span>' + Number(t) + '</span>';
        talles.appendChild(chip);
      });
      talles.querySelectorAll('input').forEach(function (r) {
        var hay = disponibles.indexOf(r.value) >= 0;
        r.disabled = !hay;
        if (!hay) { r.checked = false; }
        r.setAttribute('aria-label', 'Talle ' + r.value + (hay ? '' : ', sin stock'));
        r.parentNode.title = hay ? '' : 'Sin stock';
      });
    }

    function textoConsulta(talle, entrega, envio) {
      var t = '¡Hola! Quiero consultar por las Aconcagua ' + nombre + (talle ? ', talle ' + talle : '') + '.';
      if (talle && envio != null) {
        t += '\n' + ENTREGAS[entrega] + '. Total: ' + pesos(precio + envio) + '.';
      }
      return t;
    }

    function faltante() {
      if (!valor('talle')) {
        return { texto: 'Elegí tu talle para seguir.', foco: talles.querySelector('input:not(:disabled)') };
      }
      var entrega = valor('entrega');
      /* Con la lista de sucursales, el destino sale de la sucursal elegida */
      var porLista = entrega === 'sucursal' && !sucursal.manual();
      if (entrega !== 'retiro' && !porLista && !select.value) { return { texto: 'Elegí a dónde te lo enviamos.', foco: select }; }
      for (var i = 0; i < CAMPOS.length; i++) {
        var c = CAMPOS[i];
        if (!pide(c, entrega)) { continue; }
        var v = dato(c.id);
        var el = c.id === 'sucursal' ? sucursal.foco() : form.elements[c.id];
        if (!v && c.id === 'sucursal' && porLista) { return { texto: 'Buscá tu sucursal y tocá una de la lista.', foco: el }; }
        if (!v && !c.opcional) { return { texto: 'Completá este campo: ' + c.texto + '.', foco: el }; }
        if (!v) { continue; }
        var mal = revisar(c.id, v, dato('area'), select.value);
        if (!mal && c.id === 'localidad' && !localidad.valida()) { mal = 'Elegí tu localidad de la lista.'; }
        if (mal) { return { texto: mal, foco: el }; }
      }
      return null;
    }

    function actualizar() {
      var talle = valor('talle');
      var entrega = valor('entrega') || 'domicilio';
      var porLista = entrega === 'sucursal' && !sucursal.manual();
      if (porLista && sucursal.destino()) { select.value = sucursal.destino(); }
      var envio = porLista && !sucursal.destino() ? null : costoEnvio(entrega, select.value);
      var agotado = modo === 'listo' && !disponibles.length;
      var tomaPedidos = modo !== 'consulta' && !agotado;

      if (entrega === 'sucursal') { sucursal.cargar(); }
      campoDestino.hidden = entrega === 'retiro' || (porLista && modo !== 'consulta');
      CAMPOS.forEach(function (c) { form.elements[c.id].parentNode.hidden = !pide(c, entrega); });
      datos.hidden = !tomaPedidos;
      boton.hidden = !tomaPedidos;
      pasos.hidden = !tomaPedidos;
      boton.disabled = enviando || modo === 'cargando';
      boton.textContent = enviando ? 'ENVIANDO TU PEDIDO…' : 'CONFIRMAR PEDIDO';
      consulta.hidden = tomaPedidos;
      consulta.querySelector('span').textContent = agotado ? 'AVISAME CUANDO HAYA' : 'CONSULTAR POR WHATSAPP';
      consulta.href = enlaceWhatsApp(textoConsulta(talle, entrega, envio));
      aviso.hidden = tomaPedidos;
      aviso.textContent = agotado
        ? 'Por ahora no queda stock de este modelo.'
        : 'Escribinos por WhatsApp para confirmar stock y hacer tu pedido.';

      if (modo === 'cargando') {
        pista.textContent = 'Consultando los talles en stock…';
      } else if (talle) {
        pista.textContent = 'Talle ' + talle + (plantillas[talle] ? ': plantilla de ' + plantillas[talle] + ' cm.' : '.');
      } else {
        pista.textContent = (modo === 'listo' ? 'Los talles en gris no tienen stock. ' : '') +
          'Medí tu pie y sumale entre 0,5 y 1 cm: ese es el largo de plantilla que te conviene.';
      }

      ['domicilio', 'sucursal'].forEach(function (tipo) {
        var el = form.querySelector('[data-ped-costo="' + tipo + '"]');
        if (!el) { return; }
        var sinElegir = tipo === 'sucursal' && entrega === 'sucursal' && !sucursal.manual() && !sucursal.destino();
        var c = sinElegir ? null : costoEnvio(tipo, select.value);
        el.textContent = c == null ? 'desde ' + pesos(desde(tipo)) : pesos(c);
      });

      form.querySelector('[data-ped-producto]').textContent = pesos(precio);
      form.querySelector('[data-ped-envio]').textContent =
        entrega === 'retiro' ? 'Sin costo' : (envio == null ? (porLista ? 'Elegí la sucursal' : 'Elegí el destino') : pesos(envio));
      form.querySelector('[data-ped-total]').textContent = envio == null ? '—' : pesos(precio + envio);
    }

    function limpiarError() {
      error.textContent = '';
      form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    }

    /* La columna fija no deja llevar la vista hasta algo que quedó arriba: se suelta */
    function llevarVista(elemento) {
      var columna = form.closest('.detail');
      if (columna) { columna.style.position = 'static'; }
      elemento.scrollIntoView({ block: 'center' });
    }

    function marcarError(f) {
      /* El aviso va pegado al campo que falta; si comparte renglón, debajo del renglón */
      var fin = { area: 'celular', localidad: 'cp', calle: 'altura' }[f.foco.name];
      var ancla = (fin ? form.elements[fin] : f.foco).closest('.ped-input, .ped-field, fieldset');
      ancla.insertAdjacentElement('afterend', error);
      error.textContent = f.texto;
      avisar(f.texto, 'error');
      f.foco.setAttribute('aria-invalid', 'true');
      f.foco.focus({ preventScroll: true });
      llevarVista(f.foco);
    }

    function errorGeneral(texto) {
      lugarError.padre.insertBefore(error, lugarError.antes);
      error.textContent = texto;
      avisar(texto, 'error');
    }

    function datosPedido() {
      var entrega = valor('entrega');
      var p = {
        modelo: modelo,
        talle: Number(valor('talle')),
        entrega: entrega,
        precio: precio,
        envio: costoEnvio(entrega, select.value),
        nombre: dato('nombre'),
        celular: telefono(dato('area'), dato('celular')),
        observaciones: dato('observaciones'),
        web: form.elements.sitio_extra.value
      };
      if (entrega !== 'retiro') {
        p.email = dato('email');
        p.provincia = provincia(destino(select.value));
      }
      if (entrega === 'domicilio') {
        p.localidad = dato('localidad');
        p.direccion = dato('calle') + ' ' + dato('altura').toUpperCase() + (dato('piso') ? ', ' + dato('piso') : '');
        p.cp = dato('cp').replace(/\s/g, '').toUpperCase();
      }
      if (entrega === 'sucursal') { p.sucursal = dato('sucursal'); }
      return p;
    }

    /* Pantalla final: total, alias y mensaje de WhatsApp para mandar el comprobante */
    function mostrarConfirmacion(p) {
      var mensaje = [
        '¡Hola! Te envío el comprobante de mi pedido ' + p.numero + '.',
        'Nombre: ' + p.cliente,
        'Producto: Aconcagua ' + nombre + ', talle ' + p.talle,
        'Total: ' + pesos(p.total),
        '(Adjunto el comprobante abajo)'
      ].join('\n');

      var panel = document.createElement('div');
      panel.className = 'ped-listo';
      panel.setAttribute('tabindex', '-1');
      panel.innerHTML =
        '<h2 class="ped-titulo">¡Pedido registrado!</h2>' +
        '<p class="ped-numero">Pedido N° <strong data-v="numero"></strong></p>' +
        '<p class="ped-detalle" data-v="detalle"></p>' +
        '<dl class="ped-resumen"><div class="ped-total"><dt>Total a transferir</dt><dd data-v="total"></dd></div></dl>' +
        '<div class="ped-alias"><span>Alias</span> <strong data-v="alias"></strong> <button type="button" class="ped-copiar">Copiar alias</button></div>' +
        '<ol class="ped-pasos"><li>Transferí el total a ese alias.</li><li>Tocá el botón de abajo: se abre WhatsApp con el mensaje listo.</li>' +
        '<li>Envialo y adjuntá el comprobante en el mismo chat.</li></ol>' +
        '<a class="btn-primary" target="_blank" rel="noopener" data-v="whatsapp"></a>' +
        '<button type="button" class="ped-nuevo">Hacer otro pedido</button>';

      var poner = function (v, texto) { panel.querySelector('[data-v="' + v + '"]').textContent = texto; };
      poner('numero', p.numero);
      poner('detalle', nombre + ', talle ' + p.talle + ' · ' + ENTREGAS[p.entrega]);
      poner('total', pesos(p.total));
      poner('alias', ALIAS_TRANSFERENCIA);

      var enlace = panel.querySelector('[data-v="whatsapp"]');
      enlace.href = enlaceWhatsApp(mensaje);
      var icono = consulta.querySelector('svg');
      if (icono) { enlace.appendChild(icono.cloneNode(true)); }
      enlace.appendChild(document.createTextNode(' ENVIAR COMPROBANTE'));

      panel.querySelector('.ped-copiar').addEventListener('click', function () { copiarAlias(this); });
      panel.querySelector('.ped-nuevo').addEventListener('click', function () {
        guardar(null);
        form.classList.remove('ped-ok');
        form.removeChild(panel);
        actualizar();
      });

      form.appendChild(panel);
      form.classList.add('ped-ok');
      return panel;
    }

    function enviar() {
      var pedido = datosPedido();
      /* Mismo pedido reintentado = misma referencia, así no se duplica */
      var huella = JSON.stringify(pedido);
      if (huella !== ultimoEnviado) {
        ultimoEnviado = huella;
        ref = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      }
      pedido.ref = ref;

      enviando = true;
      actualizar();

      /* El cuerpo va como texto simple: así Google lo acepta desde otro dominio */
      pedirJSON(PEDIDOS_URL, { method: 'POST', body: JSON.stringify(pedido) }, 30000).then(function (r) {
        enviando = false;
        if (r.ok && r.numero) {
          var registro = {
            numero: r.numero, modelo: modelo, talle: pedido.talle, entrega: pedido.entrega,
            total: pedido.precio + pedido.envio, cliente: pedido.nombre, fecha: Date.now()
          };
          guardar(registro);
          avisar('Pedido ' + r.numero + ' registrado. Falta transferir y mandar el comprobante.', 'ok');
          ultimoEnviado = '';
          form.reset();
          localidad.limpiar();
          sucursal.limpiar();
          actualizar();
          var panel = mostrarConfirmacion(registro);
          llevarVista(panel);
          panel.focus({ preventScroll: true });
          return;
        }
        if (r.error === 'stock' && r.stock) {
          aplicarStock(r.stock[modelo] || []);
          actualizar();
          errorGeneral('Ese talle se acaba de agotar. Elegí otro.');
          return;
        }
        throw new Error(r.error || 'respuesta inesperada');
      }).catch(function () {
        enviando = false;
        actualizar();
        errorGeneral('No pudimos registrar el pedido. Probá de nuevo en un momento; si sigue igual, escribinos por WhatsApp. No transfieras todavía.');
        consulta.hidden = false;
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (enviando || modo !== 'listo') { return; }
      limpiarError();
      actualizar(); /* por si el navegador autocompletó campos sin avisar */
      var f = faltante();
      if (f) { marcarError(f); return; }
      enviar();
    });
    form.addEventListener('input', function (e) {
      var filtro = FILTROS[e.target.name];
      if (filtro) {
        var limpio = e.target.value.replace(filtro, '');
        if (limpio !== e.target.value) { e.target.value = limpio; }
      }
      limpiarError();
      actualizar();
    });
    /* Al salir de un campo con algo escrito, avisa enseguida si está mal */
    form.addEventListener('focusout', function (e) {
      var el = e.target;
      if (!el.name || !el.closest('.ped-datos') || !el.value.trim()) { return; }
      var mal = el.name === 'celular' && !dato('area') ? '' : revisar(el.name, el.value.trim(), dato('area'), select.value);
      if (mal) { el.setAttribute('aria-invalid', 'true'); avisar(mal, 'error'); }
    });
    /* Otro destino, otra lista de localidades */
    select.addEventListener('change', function () { localidad.limpiar(); });
    form.addEventListener('change', actualizar);

    actualizar();
    columnaFija(form);

    var previo = leerGuardado();
    if (previo && previo.modelo === modelo) { mostrarConfirmacion(previo); }

    if (modo === 'cargando') {
      talles.querySelectorAll('input').forEach(function (r) { r.disabled = true; });
      pedirJSON(PEDIDOS_URL, { method: 'GET' }, 15000).then(function (r) {
        if (!r.ok || !r.stock) { throw new Error('sin stock'); }
        modo = 'listo';
        aplicarStock(r.stock[modelo] || []);
        actualizar();
      }).catch(function () {
        modo = 'consulta';
        talles.querySelectorAll('input').forEach(function (r) { r.disabled = false; });
        actualizar();
      });
    }
  }

  /*
    En escritorio la columna de la ficha queda fija al bajar. Con el formulario es más alta
    que la pantalla: así se desplaza hasta que el formulario entra entero y queda fija ahí,
    para que el botón de pedido siga a la vista mientras se miran las fotos.
  */
  function columnaFija(form) {
    var columna = form.closest('.detail');
    if (!columna) { return; }
    var ARRIBA = 104, MARGEN = 24;
    var ajustar = function () {
      if (getComputedStyle(columna).position !== 'sticky') { columna.style.top = ''; return; }
      var finFormulario = form.offsetTop + form.offsetHeight;
      columna.style.top = Math.min(ARRIBA, window.innerHeight - finFormulario - MARGEN) + 'px';
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    if ('ResizeObserver' in window) { new ResizeObserver(ajustar).observe(columna); }
  }

  /* Tabla de costos para Preguntas frecuentes */
  function initTabla(contenedor) {
    /* Las zonas que cuestan lo mismo van juntas en una sola fila */
    var grupos = [];
    Object.keys(ENVIO_ZONAS).forEach(function (z) {
      var t = ENVIO_ZONAS[z];
      var g = grupos.filter(function (x) { return x.domicilio === t.domicilio && x.sucursal === t.sucursal; })[0];
      if (g) { g.nombres.push(ENVIO_ZONA_NOMBRES[z]); }
      else { grupos.push({ domicilio: t.domicilio, sucursal: t.sucursal, nombres: [ENVIO_ZONA_NOMBRES[z]] }); }
    });
    var filas = grupos.map(function (g) {
      var nombre = g.nombres.map(function (n, i) {
        return i < g.nombres.length - 1 ? n.replace(/ y ([^,]+)$/, ', $1') : n;
      }).join(', ');
      return '<tr><th scope="row">' + nombre + '</th><td>' + pesos(g.domicilio) +
        '</td><td>' + pesos(g.sucursal) + '</td></tr>';
    }).join('');
    if (RETIRO_GRATIS) {
      filas += '<tr><th scope="row">Retiro en persona en ' + RETIRO_ZONA + '</th><td colspan="2">Sin costo</td></tr>';
    }
    contenedor.innerHTML = '<table class="size-table envio-table"><caption>Costo de envío por par (Correo Argentino, 2 a 5 días hábiles)</caption>' +
      '<thead><tr><th scope="col">Destino</th><th scope="col">A domicilio</th><th scope="col">A sucursal</th></tr></thead>' +
      '<tbody>' + filas + '</tbody></table>';
  }

  function init() {
    document.querySelectorAll('[data-retiro-zona]').forEach(function (el) { el.textContent = RETIRO_ZONA; });
    document.querySelectorAll('[data-si-retiro]').forEach(function (el) { el.hidden = !RETIRO_GRATIS; });
    document.querySelectorAll('form[data-pedido]').forEach(initPedido);
    document.querySelectorAll('[data-tabla-envios]').forEach(initTabla);
    document.querySelectorAll('[data-alias]').forEach(function (el) { el.textContent = ALIAS_TRANSFERENCIA; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
