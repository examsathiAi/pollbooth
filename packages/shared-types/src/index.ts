export type PollSummary = {
  id: string;
  question: string;
  category?: string | null;
};

export type UserSummary = {
  id: string;
  username?: string | null;
  city?: string | null;
};
