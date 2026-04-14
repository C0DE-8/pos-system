const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadsRoot = path.join(process.cwd(), "uploads");
const businessesDir = path.join(uploadsRoot, "businesses");
const branchesDir = path.join(uploadsRoot, "branches");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

ensureDir(uploadsRoot);
ensureDir(businessesDir);
ensureDir(branchesDir);

function sanitizeName(value = "", fallback = "image") {
  const clean = String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || fallback;
}

const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp"
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isBusinessLogo = file.fieldname === "logo";
    cb(null, isBusinessLogo ? businessesDir : branchesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    const baseName = file.fieldname === "logo"
      ? sanitizeName(req.body?.name, "business")
      : sanitizeName(req.body?.name, "branch");
    cb(null, `${baseName}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error("Only png, jpg, jpeg, and webp images are allowed"));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});

const uploadBusinessLogo = upload.single("logo");
const uploadBranchImage = upload.single("image");

module.exports = {
  uploadBusinessLogo,
  uploadBranchImage
};
