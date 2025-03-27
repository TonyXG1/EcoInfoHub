import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();
const port = 3000;
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  // password: '1547',
  database: "EcoInfoHub",
});

db.connect((err) => {
  if (err) {
    console.error("Connection error", err.stack);
    return;
  }
  console.log("Connected to MySQL database");
});

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

let loggedUser = null;
let posts = null;

app.use((req, res, next) => {
  req.loggedUser = loggedUser;
  next();
});

app.use("/admin", adminRoutes(db));

app.get("/", (req, res) => {
  res.render("index.ejs", { loggedUser });
  console.log(loggedUser);
});

app.get("/news", (req, res) => {
  const loadNewsSql =
    "SELECT posts.id, title, type, content, date_created, username as creator from posts JOIN users ON users.id = creator_id";

  try {
    db.query(loadNewsSql, (err, results) => {
      if (err) {
        throw err;
      }
      //TODO FIX THE DATE
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
      posts = formattedPosts;
      //console.log(posts);
      res.render("news.ejs", { loggedUser, posts });
    });
  } catch (err) {
    console.error("Error loading news: ", err);
    res.render("news.ejs", { loggedUser, posts });
  }
});

app.get("/news/:id", (req, res) => {
  const postId = req.params.id;
  const loadPostSql =
    "SELECT posts.id, title, type, content, username, date_created FROM posts JOIN users ON users.id = posts.creator_id WHERE posts.id = ?;";
  try {
    db.query(loadPostSql, [postId], (err, results) => {
      if (err) {
        throw err;
      }
      if (results.length > 0) {
        const post = results[0];
        const date = new Date(post.date_created);
        const day = date.getUTCDate();
        const month = date.toLocaleString("en-GB", { month: "long" });
        const year = date.getUTCFullYear();

        let category;
        switch (post.type) {
          case 1:
            category = "Почва";
            break;
          case 2:
            category = "Вода";
            break;
          case 3:
            category = "Въздух";
            break;
          default:
            category = "Друго";
            break;
        }
        const formattedPost = {
          ...post,
          type: category,
          date_created: `${day} ${month} ${year}`,
        };

        res.render("post.ejs", { loggedUser, post: formattedPost });
      } else {
        res.status(404).send("Post not found");
      }
    });
  } catch (error) {
    console.error("Error loading post: ", error);
    res.render("post.ejs", { loggedUser, posts });
  }
});

app.get("/monitor", (req, res) => {
  res.render("monitor.ejs", { loggedUser });
});

app.get("/surveys", (req, res) => {
  res.render("surveys.ejs", { loggedUser });
});

app.get("/links", (req, res) => {
  res.render("links.ejs", { loggedUser });
});

app.get("/help", (req, res) => {
  res.render("help.ejs", { loggedUser });
});

//LOGIN FUNCTIONALITY
app.get("/login", (req, res) => {
  if (loggedUser) res.redirect("/");
  res.render("login.ejs", {
    error: null,
  });
});

app.post("/login", (req, res) => {
  const username = req.body.username.trim();
  const password = req.body.password.trim();
  if (!username || !password) {
    res.render("login.ejs", { error: "All fields are required!" });
  }
  const sql = "SELECT * from users WHERE username = ? AND password = ?;";
  try {
    db.query(sql, [username, password], (err, results) => {
      if (err) throw err;
      console.log(results);
      if (results.length > 0) {
        const user = results[0];
        loggedUser = {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin,
        };
        /*res.send(`<h1>Welcome, ${user.username}!</h1> 
                    <p>${
                      user.isAdmin
                        ? "You are an Admin."
                        : "You are a regular user."
                    }</p>`);*/

        res.redirect("/");
      } else {
        res.render("login.ejs", { error: "Invalid username or password." });
      }
    });
  } catch (err) {
    console.error("Error during login query:", err);
    res.render("login.ejs", { error: "Error logging in." });
  }
});

app.get("/logout", (req, res) => {
  loggedUser = null;
  res.redirect("/");
});

//REGISTER FUNCTIONALITY
app.get("/register", (req, res) => {
  res.render("register.ejs", {
    error: null,
    success: null,
  });
});

app.post("/register", (req, res) => {
  const username = req.body.username.trim();
  const password = req.body.password.trim();

  if (!username || !password) {
    return res.render("register.ejs", {
      error: "All fields are required!",
      success: null,
    });
  }

  try {
    const checkUserSql = "SELECT * from users WHERE username = ?;";
    db.query(checkUserSql, [username], (err, results) => {
      if (err) {
        console.error("Error checking user:", err);
        return res.render("register.ejs", {
          error: "An error occurred while checking the username.",
          success: null,
        });
      }

      if (results.length > 0) {
        return res.render("register.ejs", {
          error: "Username already exists!",
          success: null,
        });
      }

      const insertUserSql =
        "INSERT INTO users (username, password) VALUES (?, ?)";
      db.query(insertUserSql, [username, password], (err) => {
        if (err) {
          console.error("Error inserting user:", err);
          return res.render("register.ejs", {
            error: "An error occurred while registering the user.",
            success: null,
          });
        }

        res.render("register.ejs", {
          error: null,
          success: "Registration successful! You can now log in.",
        });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.render("register.ejs", {
      error: "An unexpected error occurred.",
      success: null,
    });
  }
});

app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});
