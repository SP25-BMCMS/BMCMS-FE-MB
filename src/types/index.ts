export type ResidentBottomTabParamList = {
  Home: undefined;
  Property: undefined;
  Notification: undefined;
  Account: undefined;
};

export type StaffBottomTabParamList = {
  TaskAssignment: undefined;
  StaffAssign: undefined;
  Notification: undefined;
  Account: undefined;
};

export type BottomTabParamList = ResidentBottomTabParamList & StaffBottomTabParamList;

export type RootStackParamList = {
  MainApp: undefined;
  SignIn: undefined;
  SignUp: undefined;
  OTPScreen: {
    userType: "resident" | "staff";
    identifier: string;
    onVerificationSuccess?: () => void;
  };
  More: undefined;
  PropertyDetail: undefined;
  RepairInside: { property?: Property };
  RepairOutside: { property?: Property };
  RepairReview: { 
    property: Property; 
    description: string; 
    images: string[]; 
    buildingDetailId?: string;
    selectedRoom?: keyof typeof CRACK_POSITIONS | keyof typeof OUTDOOR_CRACK_POSITIONS;
    selectedPosition?: string;
    isPrivatesAsset?: boolean;
  };
  RepairSuccess: undefined;
  MyReport: undefined;
  WorkProgress: {
    crackReportId: string;
  };
  ResidentInspection: {
    task_assignment_id: string;
  };
  StaffProfile: undefined;
  TaskDetail: {
    assignmentId: string;
  };
  StaffTaskDetail: {
    assignmentId: string;
  };
  CreateTaskAssignment: undefined;
  CreateInspection: { 
    taskDetail: TaskAssignmentDetail;
  };
  CreateResidentInspection: { 
    taskDetail: TaskAssignmentDetail;
  };
  CreateStaffInspection: { 
    taskDetail: TaskAssignmentDetail;
  };
  CreateLocation: {
    onGoBack?: () => void;
    initialData: {
      buildingDetailId: string;
      inspection_id: string;
    };
  };
  EditLocation: {
    locationId: string;
    onGoBack?: () => void;
  };
  InspectionList: {
    taskAssignmentId: string;
    taskDescription: string;
  };
  StaffInspectionList: {
    taskAssignmentId: string;
    taskDescription: string;
  };
  InspectionDetail: {
    inspection: Inspection;
  };
  StaffInspectionDetail: {
    inspection: Inspection;
  };
  ChatBot: undefined;
  ChatHistory: undefined;
  LocationDetail: {
    locationDetailId: string;
  };
  MaintenanceHistory: {
    scheduleJobId: string;
    buildingName?: string;
  };
  StaffMaintenanceHistory: undefined;
  TechnicalRecord: {
    buildingId: string;
    buildingName?: string;
  };
  CreateActualCost: { 
    taskId: string;
    verifiedAssignmentId: string;
    onComplete?: () => void;
  };
};
//residents
export interface Resident {
  id?: string;
  phone: number;
  name: string;
  property: Property[];
  otp: string;
}
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  username: string;
  statusCode: number;
  message: string;
  accountStatus: string;
  role: 'resident' | 'staff';
}
export interface LoginPayload {
  phone: string;
  password: string;
}

export interface StaffLoginPayload {
  username: string;
  password: string;
}

export interface SignupResponse {
  isSuccess: boolean;
  message: string;
  data: {
    phone: string;
  };
}

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
  phone: string;
  role: 'Resident' | 'Staff';
  dateOfBirth: string; // ISO format
  gender: 'Male' | 'Female' | 'Other';
}

export interface VerifyOTPPayload {
  email: string;
  otp: string;
  userData: {
    username: string;
    email: string;
    password: string;
    phone: string;
    role: 'Resident' | 'Staff';
    dateOfBirth: string;
    gender: 'Male' | 'Female' | 'Other';
  };
}

export interface VerifyOTPResponse {
  isSuccess: boolean;
  message: string;
  data?: {
    email: string; 
  };
}
export interface Staff {
  id?: string;
  email: string;
  name: string;
  otp: string;
}

export interface WorkingPosition {
  positionId: string;
  positionName: string | number;
  description: string;
}

export interface Department {
  departmentId: string;
  departmentName: string;
  description: string;
  area: string;
}

export interface StaffDetails {
  userId: string;
  username: string;
  email: string;
  phone: string;
  role: 'Staff';
  dateOfBirth: string;
  gender: string;
  userDetails: {
    positionId: string;
    departmentId: string;
    position: WorkingPosition;
    department: Department;
  };
  accountStatus: string;
}

export interface WorkingPositionResponse {
  workingPositions: WorkingPosition[];
}

export interface DepartmentResponse {
  isSuccess: boolean;
  message: string;
  data: Department[];
}

export interface StaffDetailsResponse {
  isSuccess: boolean;
  message: string;
  data: StaffDetails;
}

//Apartment
export interface Property {
  building: string;
  numberFloor: number;
  description: string;
  unit: string;
  status: string;
  area: string;
  buildingDetailId?: string;
  buildingDetails?: Array<{
    buildingDetailId: string;
    name: string;
  }>;
}

export interface Apartment {
  apartmentName: string;
  apartmentId?: string;
  buildingId: string;
  building?:{
    name:string;
    description:string;
  }
}

export interface PropertyDetailResponse {
  isSuccess: boolean;
  message: string;
  data: {
    apartmentName: string;
    apartmentId: string;
    buildingDetails: {
      buildingDetailId: string;
      name: string;
      building: {
        buildingId: string;
        name: string;
        description: string;
        numberFloor: number;
        imageCover: string;
        areaId: string;
        Status: string;
        area: {
          areaId: string;
          name: string;
          description: string;
          createdAt: string;
          updatedAt: string;
        };
      }
    }
  }
}

export interface PropertyDetail {
  building: string;
  numberFloor: number;
  description: string;
  unit: string;
  status: string;
  area: string;
  apartmentId: string;
  buildingName: string;
  buildingId?: string;
  type?: string;
  owner?: string;
  registrationDate?: string;
  buildingDetailId?: string;
  buildingDetails?: Array<{
    buildingDetailId: string;
    name: string;
  }>;
}

// Crack Reporting Types
export interface CrackReportPayload {
  buildingDetailId: string;
  description: string;
  position?: string;
  files: string[];
  isPrivatesAsset?: boolean;
}

export interface CrackDetails {
  crackDetailsId: string;
  crackReportId: string;
  photoUrl: string;
  severity: 'Low' | 'Medium' | 'High';
  aiDetectionUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrackReport {
  crackReportId: string;
  buildingDetailId: string;
  description: string;
  isPrivatesAsset: boolean;
  position: string;
  status: string;
  reportedBy: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrackReportResponse {
  isSuccess: boolean;
  message: string;
  data: Array<{
    crackReport: CrackReport;
    crackDetails: CrackDetails[];
  }>;
}

// Positions for crack reporting
export const CRACK_POSITIONS = {
  KITCHEN: {
    WALL: 'kitchen/wall',
    FLOOR: 'kitchen/floor',
    CEILING: 'kitchen/ceiling',
  },
  LIVING_ROOM: {
    WALL: 'living-room/wall',
    FLOOR: 'living-room/floor',
    CEILING: 'living-room/ceiling',
  },
  BEDROOM: {
    WALL: 'bedroom/wall',
    FLOOR: 'bedroom/floor',
    CEILING: 'bedroom/ceiling',
  },
  BATHROOM: {
    WALL: 'bathroom/wall',
    FLOOR: 'bathroom/floor',
    CEILING: 'bathroom/ceiling',
  }
};

// Positions for outdoor crack reporting
export const OUTDOOR_CRACK_POSITIONS = {
  BUILDING_EXTERIOR: {
    WALL: 'exterior/building/1/wall',
    FOUNDATION: 'exterior/building/ground/foundation',
    ROOF: 'exterior/building/top/roof',
  },
  COMMON_AREA: {
    STAIRS: 'common/building/1/stairs',
    CORRIDOR: 'common/building/1/corridor',
    LOBBY: 'common/building/ground/lobby',
  },
  PARKING: {
    SURFACE: 'parking/area/ground/surface',
    PILLAR: 'parking/area/1/pillar',
    CEILING: 'parking/area/1/ceiling',
  },
  LANDSCAPE: {
    PAVEMENT: 'landscape/garden/ground/pavement',
    FENCE: 'landscape/perimeter/ground/fence',
    POOL: 'landscape/amenity/ground/pool',
  }
};

// Task Types
export interface Task {
  task_id: string;
  description: string;
  status: 'Pending' | 'Assigned' | 'InProgress' | 'Completed' | 'Canceled';
  created_at: string;
  updated_at: string;
  crack_id: string;
  schedule_job_id: string;
}

export interface TaskListResponse {
  statusCode: number;
  message: string;
  data: Task[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TaskDetailResponse {
  statusCode: number;
  message: string;
  data: Task;
}

export interface TaskAssignment {
  assignment_id: string;
  task_id: string;
  employee_id: string;
  description: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Canceled';
  created_at: string;
  updated_at: string;
  task?: Task;
}

export interface TaskAssignmentResponse {
  statusCode: number;
  message: string;
  data: TaskAssignment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TaskAssignmentByUserResponse {
  statusCode: number;
  message: string;
  data: TaskAssignment[];
}

// Task Assignment Detail Types
export interface ReportedBy {
  userId: string;
  username: string;
}

export interface VerifiedBy {
  userId: string;
  username: string;
}

export interface CrackDetailInfo {
  crackDetailsId: string;
  crackReportId: string;
  photoUrl: string;
  severity: 'Low' | 'Medium' | 'High';
  aiDetectionUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrackReportInfo {
  crackReportId: string;
  buildingDetailId: string;
  description: string;
  isPrivatesAsset: boolean;
  position: string;
  status: string;
  reportedBy: ReportedBy;
  verifiedBy?: VerifiedBy;
  createdAt: string;
  updatedAt: string;
  crackDetails: CrackDetailInfo[];
}

export interface CrackInfoResponse {
  isSuccess: boolean;
  message: string;
  data: CrackReportInfo[];
}

export interface TaskAssignmentDetail {
  assignment_id: string;
  task_id: string;
  employee_id: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  task: Task;
  crackInfo: CrackInfoResponse;
  employee?: {
    employee_id: string;
    username: string;
  };
  building?: {
    buildingId: string;
    name: string;
    description: string;
    Warranty_date: string;
    area: {
      name: string;
    };
  };
}

export interface TaskAssignmentDetailResponse {
  success: boolean;
  message: string;
  data: TaskAssignmentDetail;
}

// Inspection Types
export interface Inspection {
  inspection_id: string;
  task_assignment_id: string;
  inspected_by: string;
  image_urls: string[];
  description: string;
  created_at: string;
  updated_at: string;
  total_cost: string;
  taskAssignment?: TaskAssignment;
  repairMaterials?: RepairMaterial[];
}

export interface InspectionListResponse {
  statusCode: number;
  message: string;
  data: Inspection[];
  total: number;
}

export interface InspectionsByTaskResponse {
  statusCode: number;
  message: string;
  data: Inspection[];
}

// Material Types
export interface Material {
  material_id: string;
  name: string;
  description: string;
  unit_price: string;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface MaterialListResponse {
  isSuccess: boolean;
  message: string;
  data: {
    data: Material[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  };
}

export interface RepairMaterial {
  repair_material_id?: string;
  material_id: string;
  quantity: number;
  unit_cost?: string;
  total_cost?: string;
  created_at?: string;
  updated_at?: string;
  inspection_id?: string;
}

export interface LocationData {
  buildingDetailId: string;
  inspection_id: string;
  roomNumber: string;
  floorNumber: number;
  areaType: 'Floor' | 'Wall' | 'Ceiling' | 'column' | 'Other';
  description: string;
  crackRecords: CrackRecord[];
  buildingDetail?: {
    buildingDetailId: string;
    buildingId: string;
    name: string;
    total_apartments: number;
    createdAt: string;
    updatedAt: string;
  };
}

export interface InspectionDetailResponse {
  isSuccess: boolean;
  message: string;
  data: {
    inspection_id: string;
    task_assignment_id: string;
    inspected_by: string;
    image_urls: string[];
    description: string;
    created_at: string;
    updated_at: string;
    total_cost: string;
    taskAssignment: {
      assignment_id: string;
      task_id: string;
      employee_id: string;
      description: string;
      status: string;
      created_at: string;
      updated_at: string;
      task: {
        task_id: string;
        description: string;
        status: string;
        created_at: string;
        updated_at: string;
        crack_id: string;
        schedule_job_id: string;
      };
    };
    crackInfo: {
      isSuccess: boolean;
      message: string;
      data: Array<{
        crackReportId: string;
        buildingDetailId: string;
        description: string;
        isPrivatesAsset: boolean;
        position: string | null;
        status: string;
        reportedBy: {
          userId: string;
          username: string;
        };
        verifiedBy: {
          userId: string;
          username: string;
        };
        createdAt: string;
        updatedAt: string;
        crackDetails: any[];
      }>;
    };
  };
}

// CrackRecord Types
export interface CrackRecord {
  crackRecordId: string;
  locationDetailId: string;
  crackType: 'Vertical' | 'Horizontal' | 'Diagonal' | 'Structural' | 'NonStructural';
  length: number;
  width: number;
  depth: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrackRecordPayload {
  locationDetailId: string;
  crackType: 'Vertical' | 'Horizontal' | 'Diagonal' | 'Structural' | 'NonStructural';
  length: number;
  width: number;
  depth: number;
  description: string;
}

export interface CrackRecordResponse {
  statusCode: number;
  message: string;
  data: CrackRecord;
}

export interface CrackRecordListResponse {
  statusCode: number;
  message: string;
  data: CrackRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Feedback Types
export interface Feedback {
  feedback_id: string;
  task_id: string;
  feedback_by: string;
  comments: string;
  rating: number;
  created_at: string;
  updated_at: string;
  status: string;
}

export interface FeedbackResponse {
  isSuccess: boolean;
  message: string;
  data: Feedback[];
}

export interface FeedbackPayload {
  task_id: string;
  comments: string;
  rating: number;
}

