const Blog = require("../../models/Blog");
const { responseHandler } = require("../../utils/responseHandler");

const addBlog = async (req, res) => {
  try {
    const { title, content, image, author } = req.body;

    if (!title || !content || !author || !author.id || !author.role) {
      return responseHandler.error(res, "Missing required fields", 400);
    }

    const newBlog = new Blog({
      title,
      content,
      image: image || null,
      author: {
        id: author.id,
        role: author.role,
      },
    });

    const savedBlog = await newBlog.save();
    return responseHandler.success(
      res,
      savedBlog,
      "Blog created successfully",
      201
    );
  } catch (error) {
    console.error("Error creating blog:", error);
    return responseHandler.error(res, "Failed to create blog", 500, error);
  }
};

const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ isDeleted: false })
      .sort({ publishedAt: -1 })
      .populate("author.id", "name email");

    return responseHandler.success(
      res,
      { blogs, count: blogs.length },
      "Blogs retrieved successfully"
    );
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return responseHandler.error(res, "Failed to fetch blogs", 500, error);
  }
};

const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findOne({ _id: id, isDeleted: false }).populate(
      "author.id",
      "name email"
    );

    if (!blog) {
      return responseHandler.error(res, "Blog not found", 404);
    }

    return responseHandler.success(res, blog, "Blog retrieved successfully");
  } catch (error) {
    console.error("Error fetching blog:", error);
    return responseHandler.error(res, "Failed to fetch blog", 500, error);
  }
};

const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBlog = await Blog.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!deletedBlog) {
      return responseHandler.error(res, "Blog not found", 404);
    }

    return responseHandler.success(
      res,
      deletedBlog,
      "Blog deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting blog:", error);
    return responseHandler.error(res, "Failed to delete blog", 500, error);
  }
};
module.exports = {
  addBlog,
  getAllBlogs,
  getBlogById,
  deleteBlog,
};
