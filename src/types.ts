export type RootStackParamList = {
  // ... existing types ...
  CreateActualCost: {
    taskId: string;
    verifiedAssignmentId: string;
    onComplete?: () => void;
  };
  // ... rest of existing types ...
}; 