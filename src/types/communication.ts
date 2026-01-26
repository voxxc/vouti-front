export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  replyToId?: string;
  replyToContent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: Message;
  createdAt: Date;
  updatedAt: Date;
}
