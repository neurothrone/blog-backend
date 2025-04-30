import Comment from "./comment";

type Post = {
  slug: string;
  title: string;
  content: string;
  upvotes: number;
  comments: Comment[]
};

export default Post;
