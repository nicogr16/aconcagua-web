/*
  BOTÓN DE ARREPENTIMIENTO
  Manda la solicitud al mismo script que registra los pedidos (PEDIDOS_URL, en envios.js),
  que devuelve un código y se lo envía por mail al cliente.
*/
(function () {
  var form = document.querySelector('form[data-arrep]');
  if (!form) { return; }
  var boton = form.querySelector('button[type="submit"]');
  var error = form.querySelector('.ped-error');
  var listo = document.querySelector('.arrep-listo');
  var ultimo = '', ref = '';
  var SIN_SERVICIO = 'No pudimos registrar la solicitud. Probá de nuevo en un momento; si sigue igual, escribinos por WhatsApp al 11 7817-5503.';

  function campo(n) { return form.elements[n].value.trim(); }

  function fallo(texto, nombre) {
    error.textContent = texto;
    if (nombre) {
      form.elements[nombre].setAttribute('aria-invalid', 'true');
      form.elements[nombre].focus();
    }
  }

  form.addEventListener('input', function (e) {
    error.textContent = '';
    e.target.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (boton.disabled) { return; }
    error.textContent = '';
    if (campo('nombre').length < 3) { fallo('Escribí tu nombre y apellido.', 'nombre'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(campo('email'))) { fallo('Revisá el correo electrónico.', 'email'); return; }
    if (campo('celular').replace(/\D/g, '').length < 8) { fallo('Revisá el celular, con código de área.', 'celular'); return; }

    var datos = {
      tipo: 'arrepentimiento',
      nombre: campo('nombre'), email: campo('email'), celular: campo('celular'),
      pedido: campo('pedido'), comentario: campo('comentario'),
      web: form.elements.sitio_extra.value
    };
    /* Mismo envío reintentado = misma referencia, así no se duplica */
    var huella = JSON.stringify(datos);
    if (huella !== ultimo) {
      ultimo = huella;
      ref = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
    datos.ref = ref;

    boton.disabled = true;
    boton.textContent = 'ENVIANDO…';
    var control = ('AbortController' in window) ? new AbortController() : null;
    var reloj = control && setTimeout(function () { control.abort(); }, 30000);

    fetch(PEDIDOS_URL, { method: 'POST', body: JSON.stringify(datos), signal: control ? control.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r.ok || !r.codigo) { throw new Error(r.error || 'respuesta inesperada'); }
        listo.querySelector('[data-codigo]').textContent = r.codigo;
        listo.querySelector('[data-mail]').textContent = r.mail === false
          ? 'No pudimos mandarte el mail: anotá este código. Te vamos a contactar.'
          : 'Te lo mandamos por mail a ' + datos.email + '. Anotalo por las dudas.';
        form.hidden = true;
        listo.hidden = false;
        listo.focus();
      })
      .catch(function () { fallo(SIN_SERVICIO); })
      .finally(function () {
        clearTimeout(reloj);
        boton.disabled = false;
        boton.textContent = 'ENVIAR SOLICITUD';
      });
  });
})();
