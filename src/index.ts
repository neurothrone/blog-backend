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

app.use(async function (req, res, next) {
  const token = req.headers.authorization;

  if (token) {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } else {
    res.sendStatus(400);
  }
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
    upvoteIds: [],
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
  if (!req.user) {
    res.status(401).send("unauthorized");
    return;
  }

  const { slug } = req.params;
  const { uid } = req.user;

  const post = await db.collection("posts").findOne({ slug });
  if (!post) {
    res.status(404).send("post not found");
    return;
  }

  const upvoteIds = post.upvoteIds || [];
  const canUpvote = uid && !upvoteIds.includes(uid);
  if (!canUpvote) {
    res.status(403).send("user not authorized to upvote");
    return;
  }

  const updatedPost = await db
    .collection("posts")
    .findOneAndUpdate(
      { slug },
      {
        $inc: { upvotes: 1 },
        // @ts-ignore - MongoDB $push operator type definition issue
        $push: { upvoteIds: uid }
      },
      { returnDocument: "after" }
    )

  if (!updatedPost) {
    res.status(400).send("error upvoting post");
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
