jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
}));
