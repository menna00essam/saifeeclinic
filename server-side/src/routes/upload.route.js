const express = require("express");
const router = express.Router();
const { parser } = require("../config/cloudinary");

// Single file upload

router.post("/upload", parser.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No file uploaded",
        data: null,
      });
    }

    res.status(200).json({
      status: "success",
      message: "File uploaded successfully",
      data: {
        imageUrl: req.file.path,
        publicId: req.file.filename,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      status: "error",
      message: "Upload failed",
      error: error.message,
      data: null,
    });
  }
});

// Multiple files upload
router.post("/upload-multiple", parser.array("images", 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No files uploaded",
        data: null,
      });
    }

    const uploadedFiles = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
    }));

    res.status(200).json({
      status: "success",
      message: "Files uploaded successfully",
      data: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      status: "error",
      message: "Upload failed",
      error: error.message,
      data: null,
    });
  }
});

module.exports = router;
