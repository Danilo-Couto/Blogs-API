const { Op } = require('sequelize');
const { BlogPosts, sequelize } = require('../models');
const { PostsCategories, User, Category } = require('../models');

const createPost = async (req, res, next) => {
    try {
        const { title, content, categoryIds } = req.body;   
        const { id } = req.tokenData;
        
        await sequelize.transaction(async (t) => {
        const newPost = await BlogPosts.create({ title, content, userId: id }, { transaction: t });

        await Promise.all(categoryIds.map(async (categoryId) => {
           await PostsCategories
            .create({ postId: newPost.id, categoryId }, { transaction: t });            
            }));
        return res.status(201).json(newPost);
        });
    } catch (error) {
        if (error.name === 'SequelizeForeignKeyConstraintError') { 
            error.message = '"categoryIds" not found';
            error.statusCode = 400;
        }
        next(error); 
    }
};

const getAllPosts = async (req, res, next) => {
    try {
        const posts = await BlogPosts.findAll({
         include: [
         { model: User, as: 'user', attributes: { exclude: ['password'] } },
         { model: Category, as: 'categories', through: { attributes: [] } },
        ], 
        });
        return res.status(200).json(posts);
    } catch (error) {
        next(error);      
    }
};

const getPostById = async (req, res, next) => {
    const id = req.params;
    try {
        const post = await BlogPosts.findOne({ where: id,
         include: [
         { model: User, as: 'user', attributes: { exclude: ['password'] } },
         { model: Category, as: 'categories', through: { attributes: [] } },
        ], 
        });
        if (post === null) return res.status(404).json({ message: 'Post does not exist' }); 
        
        return res.status(200).json(post);
    } catch (error) {
        next(error);      
    }
};

const editPost = async (req, res, next) => {
    const { id } = req.params;
    const { title, content } = req.body;
    
    try {
        const post = await BlogPosts.findByPk(id);
        post.title = title; 
        post.content = content;
        await post.save();    

        const editedPost = await BlogPosts.findOne({
          where: { id },
            attributes: ['title', 'content', 'userId'],
          include: [{ model: Category, as: 'categories', through: { attributes: [] } },
            ] });
        return res.status(200).json(editedPost);
    } catch (error) {
          next(error);      
    } 
};

const deletePost = async (req, res, next) => {
    try {
        const id = req.params;
  
        await BlogPosts.destroy({ where: id });
      
        return res.status(204).end();
    } catch (error) {
        next(error);      
    }
};

const getSearchedPost = async (req, res, next) => {
    // https://sequelize.org/docs/v6/core-concepts/model-querying-basics/#operators
    try {
        const { q } = req.query; 
        const postAll = await BlogPosts.findAll({
          include: 
            [{ model: User, as: 'user', attributes: { exclude: 'password' } },
            { model: Category, as: 'categories', through: { attributes: [] } }],
        });
        if (q.length === 0) return res.status(200).json(postAll);
        const post = await BlogPosts.findAll({
          where: { [Op.or]: [{ title: q }, { content: q }] },
          include: 
            [{ model: User, as: 'user', attributes: { exclude: 'password' } },
            { model: Category, as: 'categories', through: { attributes: [] } }],
        });
        return res.status(200).json(post);
      } catch (error) {
        next(error);
      }
    };

module.exports = {
    createPost,
    getAllPosts,
    getPostById,
    editPost,
    deletePost,
    getSearchedPost,
};
