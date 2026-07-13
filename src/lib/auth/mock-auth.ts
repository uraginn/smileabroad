import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types/models";
import { useEffect, useState } from "react";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  clinic_id?: string;
}

const DEMO_USERS: Record<Role, DemoUser> = {
  clinic_owner: {
    id: "u_owner",
    name: "Dr. M. Yusuf Kurt",
    email: "owner@dtkurt.com",
    role: "clinic_owner",
    clinic_id: "clinic_istanbul",
  },
  clinic_admin: {
    id: "u_owner",
    name: "Clinic Admin",
    email: "admin@bosphorus.com",
    role: "clinic_admin",
    clinic_id: "clinic_istanbul",
  },
  coordinator: {
    id: "u_coord",
    name: "Kaan Demir",
    email: "coord@bosphorus.com",
    role: "coordinator",
    clinic_id: "clinic_istanbul",
  },
  dentist: {
    id: "u_coord",
    name: "Dr. Marco Alvarez",
    email: "dentist@bosphorus.com",
    role: "dentist",
    clinic_id: "clinic_istanbul",
  },
  viewer: {
    id: "u_viewer",
    name: "Clinic Viewer",
    email: "viewer@dtkurt.com",
    role: "viewer",
    clinic_id: "clinic_istanbul",
  },
  sales: {
    id: "u_coord",
    name: "Sales Rep",
    email: "sales@bosphorus.com",
    role: "sales",
    clinic_id: "clinic_istanbul",
  },
  platform_admin: {
    id: "u_admin",
    name: "Platform Admin",
    email: "admin@smileabroad.com",
    role: "platform_admin",
  },
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
    {
      name: "smileabroad-auth-v1",
      version: 3,
      migrate: (persisted) => {
        const state = persisted as Partial<AuthState>;
        if (state.user && state.user.role === ("patient" as Role)) return { ...state, user: null };
        return state.user?.role === "clinic_owner"
          ? { ...state, user: DEMO_USERS.clinic_owner }
          : state;
      },
    },
  ),
);

export const demoUsers = DEMO_USERS;

export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsubscribe = useAuth.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAuth.persist.hasHydrated());
    return unsubscribe;
  }, []);
  return hydrated;
}
