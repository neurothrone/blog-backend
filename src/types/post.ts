import Comment from "./comment";

type Post = {
  slug: string;
  title: string;
  content: string;
  upvotes: number;
  upvoteIds: string[];
  comments: Comment[]
};

export default Post;
