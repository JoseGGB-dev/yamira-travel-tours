const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/vouchers'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nombreUnico = 'voucher-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, nombreUnico);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // máximo 5 MB
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Solo se aceptan imágenes JPG/PNG o PDF.'));
    }
  }
});

module.exports = upload;