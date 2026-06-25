# Yamira Travel Tours - Backend + Landing 3D integrada

## Enfoque usado
Se mantuvo el backend Express + MySQL + EJS como base principal para no romper reservas, pagos, panel admin, reportes ni carga de voucher.
El frontend de Lovable se adaptó a EJS/CSS/JS estático, usando sus imágenes y estilo visual 3D.

## Archivos principales modificados
- `server.js`: agrega variables globales para las vistas (`brandName`, `whatsappAdmin`, `whatsappUrl`).
- `views/index.ejs`: nueva landing 3D integrada con viajes reales desde MySQL.
- `views/partials/header.ejs`: navbar con logo Yamira Travel Tours y enlaces reales.
- `views/partials/footer.ejs`: footer con marca, rutas, WhatsApp y contacto.
- `views/turismo.ejs`: usa imágenes locales del frontend Lovable.
- `public/css/estilos.css`: estilos 3D, glassmorphism, tarjetas flotantes, hero, galería y navbar.
- `public/js/landing.js`: efecto navbar al hacer scroll y parallax ligero.

## Nuevos assets
- `public/img/logo-yamira.png`
- `public/img/landing/hero-mountains.jpg`
- `public/img/landing/cajatambo.jpg`
- `public/img/landing/uramasa.jpg`
- `public/img/landing/termales.jpg`
- `public/img/landing/trekking.jpg`
- `public/img/landing/mirador.jpg`
- `public/img/landing/bus.jpg`

## Comandos
```bash
npm install
npm run dev
```

Abrir:
```bash
http://localhost:3000
```

## Pruebas recomendadas
1. Entrar a `/` y revisar que cargue la landing 3D con logo Yamira.
2. Clic en “Reservar viaje” y confirmar que abre `/viajes`.
3. Clic en “Ver destinos” y confirmar que abre `/turismo`.
4. Entrar a `/viajes`, elegir un viaje y reservar asiento.
5. Subir voucher desde `/pago/:codigo`.
6. Entrar a `/admin/login` y revisar dashboard, viajes, reservas y reportes.
7. Cancelar una reserva y confirmar que el asiento vuelve a quedar libre.

## Actualización: aviso al cliente al confirmar pago

Se agregó una pantalla nueva después de confirmar un pago desde el panel admin.

Flujo:
1. Admin entra a `/admin/dashboard` o al detalle de un viaje.
2. En pagos pendientes aparece el botón `Confirmar y avisar`.
3. Al confirmar, el sistema actualiza:
   - `pagos.estado = 'confirmado'`
   - `reservas.estado = 'pagado'`
4. Luego muestra una pantalla con el mensaje listo para el cliente.
5. El admin presiona `Enviar WhatsApp al cliente` y se abre WhatsApp con el mensaje preparado.

Nota: el envío 100% automático por WhatsApp requiere WhatsApp Business API o un bot conectado. Esta versión usa enlace oficial `wa.me`, que es más simple y no necesita credenciales adicionales.
