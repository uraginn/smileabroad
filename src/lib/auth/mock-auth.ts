import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types/models";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  clinic_id?: string;
}

const DEMO_USERS: Record<Role, DemoUser> = {
  patient: { id: "u_patient", name: "Sofia Bennett", email: "sofia@example.com", role: "patient" },
  clinic_owner: { id: "u_owner", name: "Dr. Elif Yılmaz", email: "owner@bosphorus.com", role: "clinic_owner", clinic_id: "clinic_istanbul" },
  clinic_admin: { id: "u_owner", name: "Clinic Admin", email: "admin@bosphorus.com", role: "clinic_admin", clinic_id: "clinic_istanbul" },
  coordinator: { id: "u_coord", name: "Kaan Demir", email: "coord@bosphorus.com", role: "coordinator", clinic_id: "clinic_istanbul" },
  dentist: { id: "u_coord", name: "Dr. Marco Alvarez", email: "dentist@bosphorus.com", role: "dentist", clinic_id: "clinic_istanbul" },
  sales: { id: "u_coord", name: "Sales Rep", email: "sales@bosphorus.com", role: "sales", clinic_id: "clinic_istanbul" },
  platform_admin: { id: "u_admin", name: "Platform Admin", email: "admin@smileabroad.com", role: "platform_admin" },
};

interface AuthState {
  user: DemoUser | null;
  loginAs: (role: Role) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loginAs: (role) => set({ user: DEMO_USERS[role] }),
      logout: () => set({ user: null }),
    }),
    { name: "smileabroad-auth-v1" },
  ),
);

export const demoUsers = DEMO_USERS;
