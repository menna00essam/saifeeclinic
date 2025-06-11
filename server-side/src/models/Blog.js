
 const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    image: {
      type: String, 
    default: null,

    },
    author: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'author.role',
      },
      role: {
        type: String,
        enum: ['admin', 'doctor'],
        required: true,
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Blog', blogSchema);
