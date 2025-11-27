export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  imageUrl?: string;
  createdAt: Date;
  likes: number;
  comments: number;
  isLiked: boolean;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  imageUrl?: string;
  isJoined: boolean;
}

export interface TabItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}