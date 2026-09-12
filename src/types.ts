export type PetitionStatus = 'pending' | 'in_progress' | 'action_taken' | 'resolved';

export type IssueCategory = 'water' | 'road' | 'light' | 'health' | 'others';

export interface Comment {
  id: string;
  author: string;
  role: 'citizen' | 'volunteer' | 'admin';
  text: string;
  timestamp: string;
}

export interface UserProfile {
  name: string;
  phone: string;
  wardNo: number;
  avatarUrl: string;
}

export interface Petition {
  id: string;
  trackingNo: string; // e.g. MS-ACH-2026-1001
  title: string;
  description: string;
  formalDraft?: string;
  category: IssueCategory;
  wardNo: number;
  streetName: string;
  citizenName: string;
  avatarUrl?: string;
  phone: string;
  status: PetitionStatus;
  upvotes: number;
  upvotedBySession?: boolean;
  imageUrl?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
  officialNote?: string;
}

export interface WardInfo {
  wardNo: number;
  name: string;
  keyStreets: string[];
  inchargeName: string;
  inchargePhone: string;
  totalIssues: number;
  resolvedIssues: number;
}

export interface Helpline {
  id: string;
  department: string;
  phone: string;
  altPhone?: string;
  timing: string;
  iconName: string;
  address?: string;
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  content: string;
  badge: string;
  isImportant?: boolean;
}

export type EventCategory = 'ward_meeting' | 'sanitation_drive' | 'outreach_program' | 'water_inspection' | 'health_camp' | 'grievance_camp';

export interface CivicEvent {
  id: string;
  title: string;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  wardNo: number; // 0 for all wards
  organizer: string;
  organizerPhone: string;
  description: string;
  attendeesCount: number;
  userRsvp?: boolean;
  badge: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}
