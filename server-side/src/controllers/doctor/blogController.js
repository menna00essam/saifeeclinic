const Blog = require("../../models/Blog");
const User = require("../../models/User");
const cloudinary = require("../../config/cloudinary");

exports.createBlogPost = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const doctorRole = req.user.role;

    if (doctorRole !== "Doctor") {
      return res.status(403).json({
        message: "Access denied: Only doctors can create blog posts.",
      });
    }

    const { title, content } = req.body;

    console.log("Req Body:", req.body);
    console.log("Req File:", req.file);

    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "Title and content are required for a blog post." });
    }

    const existingDoctor = await User.findById(doctorId);
    if (!existingDoctor || existingDoctor.role !== "Doctor") {
      return res.status(404).json({ message: "Doctor not found." });
    }

    let imageUrl = null;

    if (req.file) {
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString(
          "base64"
        )}`,
        {
          folder: "blog_images",
         
        }
      );
      imageUrl = result.secure_url; 
    }

    const newBlogPost = new Blog({
      title,
      content,
      image: imageUrl,
      author: {
        id: doctorId,
        role: doctorRole.toLowerCase(),
      },
    });

    const savedBlogPost = await newBlogPost.save();

    const populatedBlogPost = await Blog.findById(savedBlogPost._id).populate(
      "author.id",
      "first_name last_name email specialty"
    );

    res.status(201).json({
      message: "Blog post created successfully",
      blogPost: populatedBlogPost,
    });
  } catch (error) {
    console.error(error.message);

    if (
      error.message.includes("Only image files are allowed!") ||
      error.message.includes("File too large")
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).send("Server Error");
  }
};

exports.getDoctorBlogPosts = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const doctorRole = req.user.role;

    if (doctorRole !== "Doctor") {
      return res.status(403).json({
        message: "Access denied: Only doctors can view their blog posts.",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipIndex = (page - 1) * limit;

    const blogPosts = await Blog.find({
      "author.id": doctorId,
      "author.role": "doctor",
      isDeleted: false,
    })
      .sort({ publishedAt: -1 }) 
      .skip(skipIndex)
      .limit(limit)
      .populate("author.id", "first_name last_name email specialty"); 

    const totalBlogPosts = await Blog.countDocuments({
      "author.id": doctorId,
      "author.role": "doctor",
      isDeleted: false,
    });

    const totalPages = Math.ceil(totalBlogPosts / limit);

   
    res.json({
      currentPage: page,
      totalPages: totalPages,
      totalBlogPosts: totalBlogPosts,
      blogPosts: blogPosts,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};
