function normalizarAsientos(valor) {
  if (Array.isArray(valor)) {
    valor = valor.join(',');
  }

  return [...new Set(
    String(valor || '')
      .split(',')
      .map(asiento => Number.parseInt(asiento, 10))
      .filter(asiento => Number.isInteger(asiento))
  )].sort((a, b) => a - b);
}

function serializarAsientos(asientos) {
  return normalizarAsientos(asientos).join(',');
}

function expandirAsientosReservados(reservas) {
  return [...new Set(
    reservas.flatMap(reserva => normalizarAsientos(reserva.asiento))
  )].sort((a, b) => a - b);
}

function contarAsientos(valor) {
  return normalizarAsientos(valor).length;
}

function calcularMontoReserva(precio, asientos) {
  return Number(precio || 0) * contarAsientos(asientos);
}

function validarCelularPeruano(celular) {
  return /^9\d{8}$/.test(String(celular || '').trim());
}

module.exports = {
  normalizarAsientos,
  serializarAsientos,
  expandirAsientosReservados,
  contarAsientos,
  calcularMontoReserva,
  validarCelularPeruano
};
