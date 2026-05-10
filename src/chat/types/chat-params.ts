export interface StartNewChatParams {
  userId: string;
  type: 'direct';
  message: string;
  initiateMeeting: boolean;
}
