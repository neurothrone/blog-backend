import express from "express";
import { MongoClient, ServerApiVersion } from "mongodb";

const app = express();

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/api/posts", async (req, res) => {
  await client.connect();
  const db = client.db("BlogDB");
  const posts = await db.collection("posts").find().toArray();
  res.json(posts);
});

app.get("/api/posts/:slug", async (req, res) => {
  const { slug } = req.params;

  await client.connect();
  const db = client.db("BlogDB");

  const post = await db.collection("posts").findOne({ slug });
  if (!post) {
    res.status(404).send("post not found");
    return
  }

  res.json(post);
});

app.post("/api/posts", (req, res) => {
  const { title, content } = req.body;
  res.send(req.body);
});

app.post("/api/posts/:slug/upvote", async (req, res) => {
  const { slug } = req.params;

  await client.connect();
  const db = client.db("BlogDB");

  const post = await db.collection("posts").findOne({ slug });
  if (!post) {
    res.status(404).send("post not found");
    return
  }

  post.upvotes += 1;
  await db.collection("posts").updateOne({ slug }, { $set: post });

  res.json(post);
});

app.post("/api/posts/:slug/comments", async (req, res) => {
  const { slug } = req.params;

  await client.connect();
  const db = client.db("BlogDB");

  const post = await db.collection("posts").findOne({ slug });
  if (!post) {
    res.status(404).send("post not found");
    return
  }

  const { comment } = req.body;
  if (!comment) {
    res.status(400).send("comment is required");
    return;
  }

  await db.collection("posts").updateOne({ slug }, { $push: { comments: comment } });

  post.comments.push(comment);
  res.json(post);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
