import multer from 'multer';
import logger from '../utils/logger.js';

// Maintain original behavior: diskStorage with empty config uses system temp directory
const storage = multer.diskStorage({});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Wrap the single method to add logging without changing behavior
const originalSingle = upload.single.bind(upload);
upload.single = (fieldname) => {
  return (req, res, next) => {
    logger.debug("Multer: Starting file upload", {
      fieldname,
      userId: req.auth?.()?.userId || 'anonymous',
    });

    originalSingle(fieldname)(req, res, (err) => {
      if (err) {
        logger.error("Multer upload error", err, {
          fieldname,
          userId: req.auth?.()?.userId || 'anonymous',
        });
        return res.status(400).json({ success: false, message: err.message });
      }
      
      if (req.file) {
        logger.info("File uploaded successfully via Multer", {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: req.file.path,
          userId: req.auth?.()?.userId || 'anonymous',
        });
      } else {
        logger.debug("Multer: No file in request", { fieldname });
      }
      
      next();
    });
  };
};

export default upload;
