document.addEventListener('DOMContentLoaded', () => {
  const botones = document.querySelectorAll('.asiento:not(.ocupado)');
  const inputAsiento = document.getElementById('asientoSeleccionado');
  const texto = document.getElementById('textoAsiento');

  botones.forEach(boton => {
    boton.addEventListener('click', () => {
      document.querySelectorAll('.asiento.seleccionado').forEach(b => b.classList.remove('seleccionado'));
      boton.classList.add('seleccionado');
      inputAsiento.value = boton.dataset.asiento;
      texto.className = 'alert alert-success mt-3 py-2';
      texto.innerHTML = `<i class="bi bi-check-circle me-2"></i>Asiento <strong>${boton.dataset.asiento}</strong> seleccionado.`;
    });
  });
});