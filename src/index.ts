import express from "express";
import posts from "./data/posts";
import Comment from "./types/comment";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/api/posts", (req, res) => {
  res.json(posts);
});

app.post("/api/posts", (req, res) => {
  const { title, content } = req.body;
  res.send(req.body);
});

app.post("/api/posts/:slug/upvote", (req, res) => {
  const { slug } = req.params;

  const post = posts.find(post => post.slug === slug);
  if (!post) {
    res.status(404).send("post not found");
    return;
  }

  post.upvotes += 1;
  res.json(post);
});

app.post("/api/posts/:slug/comments", (req, res) => {
  const { slug } = req.params;

  const post = posts.find(post => post.slug === slug);
  if (!post) {
    res.status(404).send("post not found");
    return;
  }

  const { comment }: { comment: Comment } = req.body;
  if (!comment) {
    res.status(400).send("comment is required");
    return;
  }

  post.comments.push(comment);
  res.json(post);
});

app.get("/api/posts/:slug", (req, res) => {
  const { slug } = req.params;
  res.send("post by slug");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
