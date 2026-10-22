
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/movie_booking";

// ========================================
// 1. MIDDLEWARE
// ========================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// 2. CẤU HÌNH UPLOAD POSTER
// ========================================

const uploadDir = path.join(
  __dirname,
  "../uploads/posters"
);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const filename =
      `poster-${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    cb(null, filename);
  },
});

const uploadPoster = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP"
        )
      );
    }

    cb(null, true);
  },
});

// Cho phép trình duyệt xem ảnh đã upload
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "../uploads")
  )
);

// ========================================
// 3. COLLECTION HỢP LỆ
// ========================================

const COLLECTIONS = [
  "movies",
  "theaters",
  "rooms",
  "showtimes",
  "tickets",
  "users",
];

// ========================================
// 4. API TRANG CHỦ VÀ HEALTH CHECK
// ========================================

app.get("/", (req, res) => {
  res.json({
    message: "Backend dat ve xem phim dang hoat dong!",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// ========================================
// 5. UPLOAD POSTER PHIM
// ========================================

app.post(
  "/api/admin/movies/upload",
  uploadPoster.single("poster"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message: "Vui lòng chọn ảnh poster",
      });
    }

    const posterUrl =
      `/uploads/posters/${req.file.filename}`;

    res.status(201).json({
      message: "Upload poster thành công",
      data: {
        filename: req.file.filename,
        posterUrl,
        imageUrl: `http://localhost:${PORT}${posterUrl}`,
      },
    });
  }
);

// ========================================
// 6. MIDDLEWARE KIỂM TRA COLLECTION
// ========================================

function getCollection(req, res, next) {
  const name = req.params.resource;

  if (!COLLECTIONS.includes(name)) {
    return res.status(404).json({
      message: "API khong ton tai",
    });
  }

  req.collection = mongoose.connection.collection(name);
  next();
}

// ========================================
// 7. LẤY DANH SÁCH
// ========================================

app.get(
  "/api/admin/:resource",
  getCollection,
  async (req, res, next) => {
    try {
      const data = await req.collection
        .find({})
        .toArray();

      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// 8. LẤY CHI TIẾT THEO ID
// ========================================

app.get(
  "/api/admin/:resource/:id",
  getCollection,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "ID khong hop le",
        });
      }

      const data = await req.collection.findOne({
        _id: new mongoose.Types.ObjectId(id),
      });

      if (!data) {
        return res.status(404).json({
          message: "Khong tim thay du lieu",
        });
      }

      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// 9. THÊM DỮ LIỆU
// ========================================

app.post(
  "/api/admin/:resource",
  getCollection,
  async (req, res, next) => {
    try {
      const document = { ...req.body };

      delete document._id;

      document.createdAt = new Date();
      document.updatedAt = new Date();

      const result =
        await req.collection.insertOne(document);

      const data = await req.collection.findOne({
        _id: result.insertedId,
      });

      res.status(201).json({
        message: "Tao du lieu thanh cong",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// 10. CẬP NHẬT DỮ LIỆU
// ========================================

app.put(
  "/api/admin/:resource/:id",
  getCollection,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "ID khong hop le",
        });
      }

      const document = { ...req.body };

      delete document._id;
      delete document.createdAt;

      document.updatedAt = new Date();

      const result =
        await req.collection.updateOne(
          {
            _id: new mongoose.Types.ObjectId(id),
          },
          {
            $set: document,
          }
        );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          message: "Khong tim thay du lieu",
        });
      }

      const data = await req.collection.findOne({
        _id: new mongoose.Types.ObjectId(id),
      });

      res.json({
        message: "Cap nhat thanh cong",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// 11. XÓA DỮ LIỆU
// ========================================

app.delete(
  "/api/admin/:resource/:id",
  getCollection,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: "ID khong hop le",
        });
      }

      const result =
        await req.collection.deleteOne({
          _id: new mongoose.Types.ObjectId(id),
        });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Khong tim thay du lieu",
        });
      }

      res.json({
        message: "Xoa du lieu thanh cong",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// 12. XỬ LÝ LỖI
// ========================================

app.use((error, req, res, next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "Ảnh không được vượt quá 5 MB",
      });
    }

    return res.status(400).json({
      message: "Lỗi khi tải ảnh lên",
    });
  }

  if (
    error.message ===
    "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP"
  ) {
    return res.status(400).json({
      message: error.message,
    });
  }

  res.status(500).json({
    message: "Loi may chu",
    error: error.message,
  });
});

// ========================================
// 13. KHỞI ĐỘNG SERVER
// ========================================

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("Da ket noi MongoDB thanh cong!");

    app.listen(PORT, () => {
      console.log(
        `Backend dang chay tai http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Khong the ket noi MongoDB:",
      error.message
    );

    process.exit(1);
  }
}

startServer();