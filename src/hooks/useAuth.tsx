import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  education: "matric" | "intermediate" | "bachelor" | "master" | "phd" | null;
  province: string | null;
  domicile: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface UserRole {
  role: "admin" | "user" | "expert";
}

interface EducationEntry {
  education_level: string;
  education_field_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: UserRole[];
  isAdmin: boolean;
  isExpert: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata: { 
    full_name: string; 
    date_of_birth?: string; 
    gender?: string; 
    province?: string; 
    domicile?: string;
    educations?: EducationEntry[];
  }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (profileData) {
      setProfile(profileData as UserProfile);
    }
  };

  const fetchRoles = async (userId: string) => {
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (rolesData) {
      setRoles(rolesData as UserRole[]);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRoles(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast.error(error.message);
      return { error };
    }
    toast.success("Signed in successfully!");
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata: {
      full_name: string;
      date_of_birth?: string;
      gender?: string;
      province?: string;
      domicile?: string;
      educations?: EducationEntry[];
    }
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: metadata.full_name,
          date_of_birth: metadata.date_of_birth,
          gender: metadata.gender,
          province: metadata.province,
          domicile: metadata.domicile,
        },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(error.message);
      }
      return { error };
    }

    // Update profile with additional data after signup
    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      // Update basic profile
      await supabase.from("profiles").update({
        full_name: metadata.full_name,
        date_of_birth: metadata.date_of_birth || null,
        gender: metadata.gender as any || null,
        province: metadata.province || null,
        domicile: metadata.domicile || null,
      }).eq("user_id", newUser.id);

      // Insert education entries
      if (metadata.educations && metadata.educations.length > 0) {
        await supabase.from("user_educations").insert(
          metadata.educations.map((e) => ({
            user_id: newUser.id,
            education_level: e.education_level,
            education_field_id: e.education_field_id || null,
          }))
        );
      }

      // Refresh profile to show updated data
      await fetchProfile(newUser.id);
    }

    toast.success("Account created successfully!");
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    // Clear cached query data so the next user on a shared device cannot
    // see the previous user's data hydrated from localStorage.
    try {
      const { queryClient, RQ_PERSIST_KEY } = await import("@/App");
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(RQ_PERSIST_KEY);
      }
    } catch {
      // no-op
    }
    toast.success("Signed out successfully");
  };

  const isAdmin = roles.some((r) => r.role === "admin");
  const isExpert = roles.some((r) => r.role === "expert");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isAdmin,
        isExpert,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
