export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'system';
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}