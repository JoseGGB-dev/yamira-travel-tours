document.addEventListener('DOMContentLoaded', () => {
  const botones = document.querySelectorAll('.asiento:not(.ocupado):not(.fuera-rango)');
  const inputAsiento = document.getElementById('asientoSeleccionado');
  const inputCantidad = document.getElementById('cantidadAsientos');
  const texto = document.getElementById('textoAsiento');
  const resumen = document.getElementById('resumenSeleccion');
  const total = document.getElementById('totalReserva');
  const celular = document.getElementById('celularReserva');
  const errorCelular = document.getElementById('errorCelular');
  const form = document.getElementById('formReserva');
  const precio = Number(form?.dataset.precio || 0);
  let seleccionados = inputAsiento.value
    ? inputAsiento.value.split(',').map(Number).filter(Number.isInteger)
    : [];

  function cantidadElegida() {
    return Number.parseInt(inputCantidad.value, 10) || 1;
  }

  function pintarSeleccion() {
    document.querySelectorAll('.asiento.seleccionado').forEach(boton => {
      boton.classList.remove('seleccionado');
    });

    seleccionados.forEach(numero => {
      const boton = document.querySelector(`.asiento[data-asiento="${numero}"]`);
      if (boton) boton.classList.add('seleccionado');
    });

    inputAsiento.value = seleccionados.join(',');
    resumen.textContent = seleccionados.length ? seleccionados.join(', ') : 'Ninguno';
    total.textContent = `S/ ${(precio * cantidadElegida()).toFixed(2)}`;

    if (seleccionados.length === 0) {
      texto.className = 'alert alert-warning mt-3 py-2';
      texto.innerHTML = '<i class="bi bi-cursor me-2"></i>Selecciona los asientos disponibles en el mapa.';
      return;
    }

    const faltantes = cantidadElegida() - seleccionados.length;
    if (faltantes === 0) {
      texto.className = 'alert alert-success mt-3 py-2';
      texto.innerHTML = `<i class="bi bi-check-circle me-2"></i>Asientos seleccionados: <strong>${seleccionados.join(', ')}</strong>.`;
    } else {
      texto.className = 'alert alert-info mt-3 py-2';
      texto.innerHTML = `<i class="bi bi-info-circle me-2"></i>Te falta seleccionar <strong>${faltantes}</strong> asiento(s).`;
    }
  }

  function validarCelular() {
    const valido = /^9\d{8}$/.test(celular.value.trim());
    celular.classList.toggle('is-invalid', celular.value.length > 0 && !valido);
    errorCelular.classList.toggle('d-none', valido || celular.value.length === 0);
    return valido;
  }

  botones.forEach(boton => {
    boton.addEventListener('click', () => {
      const numero = Number.parseInt(boton.dataset.asiento, 10);
      const existe = seleccionados.includes(numero);

      if (existe) {
        seleccionados = seleccionados.filter(asiento => asiento !== numero);
      } else {
        if (seleccionados.length >= cantidadElegida()) {
          texto.className = 'alert alert-danger mt-3 py-2';
          texto.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>Solo puedes seleccionar ${cantidadElegida()} asiento(s).`;
          return;
        }
        seleccionados.push(numero);
      }

      seleccionados.sort((a, b) => a - b);
      pintarSeleccion();
    });
  });

  inputCantidad.addEventListener('change', () => {
    const cantidad = cantidadElegida();
    if (seleccionados.length > cantidad) {
      seleccionados = seleccionados.slice(0, cantidad);
    }
    pintarSeleccion();
  });

  celular.addEventListener('input', () => {
    celular.value = celular.value.replace(/\D/g, '').slice(0, 9);
    validarCelular();
  });

  form.addEventListener('submit', event => {
    if (seleccionados.length !== cantidadElegida()) {
      event.preventDefault();
      texto.className = 'alert alert-danger mt-3 py-2';
      texto.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>Debes seleccionar exactamente ${cantidadElegida()} asiento(s).`;
      return;
    }

    if (!validarCelular()) {
      event.preventDefault();
      celular.focus();
    }
  });

  pintarSeleccion();
});
