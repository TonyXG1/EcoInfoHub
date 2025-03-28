import express from "express";
import db from "mysql2";

const router = express.Router();
let loggedUser = null;
export default (db) => {
  // Middleware to check if the user is an admin
  router.use((req, res, next) => {
    loggedUser = req.loggedUser;
    if (!loggedUser || !loggedUser.isAdmin) {
      return res.status(403).send("<h1>Access Denied</h1>");
    }
    next();
  });

  router.get("/dashboard", (req, res) => {
    const loadNewsSql =
      "SELECT posts.id, title, type, content, date_created, username as creator from posts JOIN users ON users.id = creator_id";
    try {
      db.query(loadNewsSql, (err, results) => {
        const formattedPosts = results.map((post) => {
          const date = new Date(post.date_created);
          const day = date.getUTCDate();
          const month = date.toLocaleString("en-GB", { month: "long" });
          const year = date.getUTCFullYear();

          return {
            ...post,
            date_created: `${day} ${month} ${year}`,
          };
        });

        res.render("admin/dashboard.ejs", {
          loggedUser,
          posts: formattedPosts,
        });
      });
    } catch (error) {
      console.error("Error loading news:", err);
      return res
        .status(500)
        .send("An error occurred while loading the dashboard.");
    }
  });

  router.get("/add-news", (req, res) => {
    res.render("admin/add_news.ejs", { error: null, success: null });
  });

  router.post("/add-news", (req, res) => {
    const { title, type, content } = req.body;

    if (!title || !type || !content) {
      return res.render("admin/add_news.ejs", {
        error: "All fields are required!",
        success: null,
      });
    }

    const sql =
      "INSERT INTO posts (title, type, content, creator_id) VALUES (?, ?, ?, ?)";
    try {
      db.query(sql, [title, type, content, loggedUser.id], (err) => {
        res.render("admin/add_news.ejs", {
          error: null,
          success: "Новината беше успешно добавена!",
        });
      });
    } catch (error) {
      console.error("Error adding news:", error);
      res.render("admin/add_news.ejs", {
        error: "Неуспешно добавяне на новина!",
        success: null,
      });
    }
  });

  router.get("/edit/:id", (req, res) => {
    const postId = req.params.id;
    const loadPostSql =
      "SELECT posts.id, title, type, content, username as creator FROM posts JOIN users ON users.id = posts.creator_id WHERE posts.id = ?;";

    try {
      db.query(loadPostSql, [postId], (err, results) => {
        if (results.length > 0) {
          const post = results[0];
          res.render("admin/edit_news.ejs", {
            post: post,
          });
        } else {
          res.status(404).send("Post not found");
        }
      });
    } catch (error) {
      console.error("Error loading post: ", error);
      res.render("admin/edit_news.ejs", {
        error: "Неуспешно обновяване на новина",
      });
    }
  });

  router.post("/edit/:id", (req, res) => {
    const postId = req.params.id;
    const updatedBlog = req.body;

    if (!updatedBlog.title || !updatedBlog.content || !updatedBlog.type) {
      return res.render("admin/edit_news.ejs", {
        error: "Всички полета са задължителни!",
        success: null,
        post: { ...updatedBlog, id: postId },
      });
    }
    const updateSql =
      "UPDATE posts SET title = ?, content = ?, type = ? WHERE id = ?";
    try {
      db.query(
        updateSql,
        [updatedBlog.title, updatedBlog.content, updatedBlog.type, postId],
        (err) => {
          if (err) {
            console.error("Error updating post:", err);
            return res.render("admin/edit_news.ejs", {
              error: "Неуспешно редактиране на новина!",
              post: { ...updatedBlog, id: postId },
            });
          }

          res.render("admin/edit_news.ejs", {
            success: "Новината беше успешно редактирана!",
            post: { ...updatedBlog, id: postId },
          });
        }
      );
    } catch (error) {
      console.error("Unexpected error:", error);
      res.render("admin/edit_news.ejs", {
        error: "Неуспешно редактиране на новина!",
        post: { ...updatedBlog, id: postId },
      });
    }
  });

  router.get("/delete/:id", (req, res) => {
    const postId = req.params.id;
    const deletePostSql = "DELETE from posts WHERE id = ?;";

    try {
      db.query(deletePostSql, [postId], (err, results) => {
        if (results.affectedRows === 0) {
          return res.render("admin/dashboard.ejs", {
            success: null,
            error: "Новината не беше намерена или вече е изтрита"
          })
        }
        return res.render("admin/dashboard.ejs", {
          success: `Новина номер ${postId} бе изтрита успешно.`,
          error: null
        })
      });
    } catch (error) {
      console.error("Error deleting post: ", error);
      return res.render("admin/dashboard.ejs", {
        success: null,
        error: "Неуспешно изтриване на новината"
      })
    }
  });

  return router;
};
