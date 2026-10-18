
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/movie_booking";

// Các collection được phép truy cập qua API quản trị
const COLLECTIONS = [
  "movies",
  "theaters",
  "rooms",
  "showtimes",
   "tickets",
];

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

// Kiểm tra collection hợp lệ
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

// Lấy danh sách dữ liệu
app.get(
  "/api/admin/:resource",
  getCollection,
  async (req, res, next) => {
    try {
      const data = await req.collection.find({}).toArray();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

// Lấy một bản ghi theo ID
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

// Thêm bản ghi
app.post(
  "/api/admin/:resource",
  getCollection,
  async (req, res, next) => {
    try {
      const document = { ...req.body };
      delete document._id;

      document.createdAt = new Date();
      document.updatedAt = new Date();

      const result = await req.collection.insertOne(document);

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

// Cập nhật bản ghi
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

      const result = await req.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: document }
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

// Xóa bản ghi
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

      const result = await req.collection.deleteOne({
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

// Xử lý lỗi API
app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    message: "Loi may chu",
    error: error.message,
  });
});

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
