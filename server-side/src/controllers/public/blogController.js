const Blog = require('../../models/Blog');
const User = require('../../models/User');
const { responseHandler } = require('../../utils/responseHandler');

// Get all published blogs

const getAllBlogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      tag, 
      author, 
      sort = 'latest'
    } = req.query;

    const filter = {
      is_published: true,
      is_deleted: false
    };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (tag) {
      filter.tags = { $in: [tag] };
    }

    if (author) {
      const authorUser = await User.findById(author);
      if (authorUser) {
        filter.author_id = author;
      }
    }

    let sortOption = {};
    switch (sort) {
      case 'latest':
        sortOption = { published_at: -1 };
        break;
      case 'oldest':
        sortOption = { published_at: 1 };
        break;
      case 'title':
        sortOption = { title: 1 };
        break;
      default:
        sortOption = { published_at: -1 };
    }

    const blogs = await Blog.find(filter)
      .populate('author_id', 'first_name last_name doctor_profile.specialization')
      .select('title content tags image_url published_at author_id')
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Blog.countDocuments(filter);

    const transformedBlogs = blogs.map(blog => ({
      _id: blog._id,
      title: blog.title,
      excerpt: blog.content.substring(0, 200) + '...',
      tags: blog.tags,
      image_url: blog.image_url,
      published_at: blog.published_at,
      author: {
        id: blog.author_id._id,
        name: `${blog.author_id.first_name} ${blog.author_id.last_name}`,
        specialization: blog.author_id.doctor_profile?.specialization || 'Admin'
      }
    }));

    return responseHandler.success(res, {
      blogs: transformedBlogs,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_blogs: total,
        per_page: parseInt(limit)
      }
    }, 'Blogs retrieved successfully');

  } catch (error) {
    console.error('Get all blogs error:', error);
    return responseHandler.error(res, 'Failed to retrieve blogs', 500);
  }
};

/**
 * Get blog by ID
 */
const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findOne({
      _id: id,
      is_published: true,
      is_deleted: false
    })
    .populate('author_id', 'first_name last_name doctor_profile.specialization doctor_profile.biography')
    .select('title content tags image_url published_at author_id updatedAt');

    if (!blog) {
      return responseHandler.error(res, 'Blog not found', 404);
    }

    const relatedBlogs = await Blog.find({
      _id: { $ne: blog._id },
      is_published: true,
      is_deleted: false,
      $or: [
        { tags: { $in: blog.tags } },
        { author_id: blog.author_id._id }
      ]
    })
    .populate('author_id', 'first_name last_name')
    .select('title image_url published_at author_id')
    .limit(4)
    .sort({ published_at: -1 });

    const blogData = {
      _id: blog._id,
      title: blog.title,
      content: blog.content,
      tags: blog.tags,
      image_url: blog.image_url,
      published_at: blog.published_at,
      updated_at: blog.updatedAt,
      author: {
        id: blog.author_id._id,
        name: `${blog.author_id.first_name} ${blog.author_id.last_name}`,
        specialization: blog.author_id.doctor_profile?.specialization || 'Admin',
        biography: blog.author_id.doctor_profile?.biography || ''
      },
      related_blogs: relatedBlogs.map(relatedBlog => ({
        _id: relatedBlog._id,
        title: relatedBlog.title,
        image_url: relatedBlog.image_url,
        published_at: relatedBlog.published_at,
        author_name: `${relatedBlog.author_id.first_name} ${relatedBlog.author_id.last_name}`
      }))
    };

    return responseHandler.success(res, blogData, 'Blog retrieved successfully');

  } catch (error) {
    console.error('Get blog by ID error:', error);
    return responseHandler.error(res, 'Failed to retrieve blog', 500);
  }
};

/**
 * Get blogs by author
 */
const getBlogsByAuthor = async (req, res) => {
  try {
    const { authorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const author = await User.findOne({
      _id: authorId,
      role: { $in: ['Doctor', 'Admin'] },
      is_deleted: false
    }).select('first_name last_name doctor_profile.specialization');

    if (!author) {
      return responseHandler.error(res, 'Author not found', 404);
    }

    const blogs = await Blog.find({
      author_id: authorId,
      is_published: true,
      is_deleted: false
    })
    .select('title content tags image_url published_at')
    .sort({ published_at: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Blog.countDocuments({
      author_id: authorId,
      is_published: true,
      is_deleted: false
    });

    const transformedBlogs = blogs.map(blog => ({
      _id: blog._id,
      title: blog.title,
      excerpt: blog.content.substring(0, 200) + '...',
      tags: blog.tags,
      image_url: blog.image_url,
      published_at: blog.published_at
    }));

    return responseHandler.success(res, {
      author: {
        id: author._id,
        name: `${author.first_name} ${author.last_name}`,
        specialization: author.doctor_profile?.specialization || 'Admin'
      },
      blogs: transformedBlogs,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_blogs: total,
        per_page: parseInt(limit)
      }
    }, 'Author blogs retrieved successfully');

  } catch (error) {
    console.error('Get blogs by author error:', error);
    return responseHandler.error(res, 'Failed to retrieve author blogs', 500);
  }
};

/**
 * Get blogs by tag
 */
const getBlogsByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const blogs = await Blog.find({
      tags: { $in: [tag] },
      is_published: true,
      is_deleted: false
    })
    .populate('author_id', 'first_name last_name doctor_profile.specialization')
    .select('title content tags image_url published_at author_id')
    .sort({ published_at: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Blog.countDocuments({
      tags: { $in: [tag] },
      is_published: true,
      is_deleted: false
    });

    const transformedBlogs = blogs.map(blog => ({
      _id: blog._id,
      title: blog.title,
      excerpt: blog.content.substring(0, 200) + '...',
      tags: blog.tags,
      image_url: blog.image_url,
      published_at: blog.published_at,
      author: {
        id: blog.author_id._id,
        name: `${blog.author_id.first_name} ${blog.author_id.last_name}`,
        specialization: blog.author_id.doctor_profile?.specialization || 'Admin'
      }
    }));

    return responseHandler.success(res, {
      tag: tag,
      blogs: transformedBlogs,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_blogs: total,
        per_page: parseInt(limit)
      }
    }, `Blogs with tag "${tag}" retrieved successfully`);

  } catch (error) {
    console.error('Get blogs by tag error:', error);
    return responseHandler.error(res, 'Failed to retrieve blogs by tag', 500);
  }
};

/**
 * Get popular tags
 */
const getPopularTags = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const tags = await Blog.aggregate([
      {
        $match: {
          is_published: true,
          is_deleted: false
        }
      },
      {
        $unwind: '$tags'
      },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          tag: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    return responseHandler.success(res, tags, 'Popular tags retrieved successfully');

  } catch (error) {
    console.error('Get popular tags error:', error);
    return responseHandler.error(res, 'Failed to retrieve popular tags', 500);
  }
};

/**
 * Get featured blogs
 */
const getFeaturedBlogs = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const featuredBlogs = await Blog.find({
      is_published: true,
      is_deleted: false
    })
    .populate('author_id', 'first_name last_name doctor_profile.specialization')
    .select('title content tags image_url published_at author_id')
    .sort({ published_at: -1 })
    .limit(parseInt(limit));

    const transformedBlogs = featuredBlogs.map(blog => ({
      _id: blog._id,
      title: blog.title,
      excerpt: blog.content.substring(0, 150) + '...',
      tags: blog.tags,
      image_url: blog.image_url,
      published_at: blog.published_at,
      author: {
        id: blog.author_id._id,
        name: `${blog.author_id.first_name} ${blog.author_id.last_name}`,
        specialization: blog.author_id.doctor_profile?.specialization || 'Admin'
      }
    }));

    return responseHandler.success(res, transformedBlogs, 'Featured blogs retrieved successfully');

  } catch (error) {
    console.error('Get featured blogs error:', error);
    return responseHandler.error(res, 'Failed to retrieve featured blogs', 500);
  }
};

/**
 * Search blogs
 */
const searchBlogs = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || q.trim().length === 0) {
      return responseHandler.error(res, 'Search query is required', 400);
    }

    const searchQuery = q.trim();
    
    const filter = {
      is_published: true,
      is_deleted: false,
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { content: { $regex: searchQuery, $options: 'i' } },
        { tags: { $in: [new RegExp(searchQuery, 'i')] } }
      ]
    };

    const blogs = await Blog.find(filter)
      .populate('author_id', 'first_name last_name doctor_profile.specialization')
      .select('title content tags image_url published_at author_id')
      .sort({ published_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Blog.countDocuments(filter);

    const transformedBlogs = blogs.map(blog => {
      const title = highlightSearchTerm(blog.title, searchQuery);
      const excerpt = highlightSearchTerm(
        blog.content.substring(0, 200) + '...',
        searchQuery
      );

      return {
        _id: blog._id,
        title: title,
        excerpt: excerpt,
        tags: blog.tags,
        image_url: blog.image_url,
        published_at: blog.published_at,
        author: {
          id: blog.author_id._id,
          name: `${blog.author_id.first_name} ${blog.author_id.last_name}`,
          specialization: blog.author_id.doctor_profile?.specialization || 'Admin'
        }
      };
    });

    return responseHandler.success(res, {
      search_query: searchQuery,
      blogs: transformedBlogs,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_results: total,
        per_page: parseInt(limit)
      }
    }, `Search results for "${searchQuery}"`);

  } catch (error) {
    console.error('Search blogs error:', error);
    return responseHandler.error(res, 'Failed to search blogs', 500);
  }
};

/**
 * Get blog categories/specializations
 */
const getBlogCategories = async (req, res) => {
  try {
    const categories = await Blog.aggregate([
      {
        $match: {
          is_published: true,
          is_deleted: false
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'author_id',
          foreignField: '_id',
          as: 'author'
        }
      },
      {
        $unwind: '$author'
      },
      {
        $group: {
          _id: '$author.doctor_profile.specialization',
          count: { $sum: 1 },
          latest_blog: { $last: '$published_at' }
        }
      },
      {
        $project: {
          category: { $ifNull: ['$_id', 'year'] },
          count: 1,
          latest_blog: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return responseHandler.success(res, categories, 'Blog categories retrieved successfully');

  } catch (error) {
    console.error('Get blog categories error:', error);
    return responseHandler.error(res, 'Failed to retrieve blog categories', 500);
  }
};

//Helper function to highlight search terms

const highlightSearchTerm = (text, searchTerm) => {
  if (!searchTerm || !text) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

module.exports = {
  getAllBlogs,
  getBlogById,
  getBlogsByAuthor,
  getBlogsByTag,
  getPopularTags,
  getFeaturedBlogs,
  searchBlogs,
  getBlogCategories
};