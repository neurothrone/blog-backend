import express from "express";
import dotenv from "dotenv";
import admin from "firebase-admin";
import slugify from "slugify";
import { Db, MongoClient, ServerApiVersion } from "mongodb";
import type Post from "./types/post";
import fs from "fs";

dotenv.config();

const firebaseCredentials = JSON.parse(fs.readFileSync("./firebase-credentials.json", "utf8"));
admin.initializeApp({
  credential: admin.credential.cert(firebaseCredentials),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const app = express();
app.use(express.json());

let db: Db;

async function connectToDatabase() {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  await client.connect();
  db = client.db("BlogDB");
}

async function main() {
  await connectToDatabase();
  app.listen(3000, () => {
    console.log("Server is running on port 3000");
  });
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/api/posts", async (req, res) => {
  const posts = await db.collection("posts").find().toArray();
  res.json(posts);
});

app.get("/api/posts/:slug", async (req, res) => {
  const { slug } = req.params;

  const post = await db.collection("posts").findOne({ slug });
  if (!post) {
    res.status(404).send("post not found");
    return
  }

  res.json(post);
});

app.post("/api/posts", async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    res.status(400).send("title and content are required");
    return;
  }

  const post: Post = {
    title,
    content,
    slug: slugify(title, { lower: true }),
    upvotes: 0,
    comments: []
  }

  const createdPost = await db.collection("posts").insertOne(post);
  if (!createdPost) {
    res.status(500).send("error creating post");
    return;
  }

  res.json(post);
});

app.post("/api/posts/:slug/upvote", async (req, res) => {
  const { slug } = req.params;

  const updatedPost = await db
    .collection("posts")
    .findOneAndUpdate(
      { slug },
      { $inc: { upvotes: 1 }, },
      { returnDocument: "after" }
    )

  if (!updatedPost) {
    res.status(404).send("post not found");
    return
  }

  res.json(updatedPost);
});

app.post("/api/posts/:slug/comments", async (req, res) => {
  const { slug } = req.params;
  const { postedBy, text } = req.body;

  if (!postedBy || !text) {
    res.status(400).send("postedBy and text are required");
    return;
  }
  const comment = { postedBy, text };

  const updatedPost = await db.collection("posts").findOneAndUpdate(
    { slug },
    // @ts-ignore - MongoDB $push operator type definition issue
    { $push: { comments: { $each: [comment] } } },
    { returnDocument: "after" }
  )

  if (!updatedPost) {
    res.status(404).send("post not found");
    return
  }

  res.json(updatedPost);
});

main();
