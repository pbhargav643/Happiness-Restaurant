import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Development storage path: frontend/public/images/menu/
const UPLOAD_DIR = path.resolve(__dirname, '../../../frontend/public/images/menu');

// Ensure upload directory exists safely
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const rawBase = path.basename(file.originalname, ext);

    // Sanitize base name to lowercase alphanumeric + hyphens (never trust user input)
    let safeBase = rawBase
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    if (!safeBase) {
      safeBase = 'menu-item';
    }

    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(3).toString('hex');
    const safeFilename = `${safeBase}-${timestamp}-${randomHex}${ext}`;

    cb(null, safeFilename);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimetype = (file.mimetype || '').toLowerCase();

  // Explicit security blocks
  if (ext === '.svg' || mimetype === 'image/svg+xml') {
    const err = new Error('SVG format is not allowed for security reasons. Please upload JPG, PNG, or WEBP.');
    err.statusCode = 400;
    return cb(err, false);
  }

  if (ext === '.gif' || mimetype === 'image/gif') {
    const err = new Error('GIF format is not supported. Please upload JPG, PNG, or WEBP.');
    err.statusCode = 400;
    return cb(err, false);
  }

  if (
    ext === '.exe' ||
    ext === '.js' ||
    ext === '.html' ||
    ext === '.htm' ||
    ext === '.php' ||
    ext === '.sh' ||
    ext === '.bat' ||
    ext === '.cmd'
  ) {
    const err = new Error('Executable and script files are strictly prohibited.');
    err.statusCode = 400;
    return cb(err, false);
  }

  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mimetype)) {
    const err = new Error('Invalid file format. Only JPG, JPEG, PNG, and WEBP images are supported.');
    err.statusCode = 400;
    return cb(err, false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});

/**
 * Express middleware for menu image upload
 */
export const handleImageUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds the 5 MB limit. Please select an image under 5 MB.',
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      }

      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Image upload failed. Please verify format and size.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Please choose a valid image file.',
      });
    }

    next();
  });
};

export default handleImageUpload;
