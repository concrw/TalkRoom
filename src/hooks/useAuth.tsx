import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any | null }>;
  signInWithGoogle: () => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const ensureProfile = async (u: User, name?: string) => {
    try {
      const avatarFromMeta =
        (u.user_metadata?.avatar_url as string) ||
        (u.user_metadata?.picture as string) ||
        (u.user_metadata?.avatar as string) ||
        undefined;
      const defaultName =
        name ||
        (u.user_metadata?.full_name as string) ||
        (u.user_metadata?.name as string) ||
        (u.email?.split("@")[0] || `사용자-${u.id.slice(-6)}`);

      const { data: existing } = await supabase
        .from("users")
        .select("id, name")
        .eq("id", u.id)
        .maybeSingle();

      if (!existing) {
        await supabase
          .from("users")
          .insert([{ id: u.id, name: defaultName, ...(avatarFromMeta ? { avatar_url: avatarFromMeta } : {}) }] as any);
      } else if (avatarFromMeta) {
        // Best-effort: set avatar if missing or update to latest
        await supabase.from("users").update({ avatar_url: avatarFromMeta } as any).eq("id", u.id);
      }
    } catch {
      // noop
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(() => {
          ensureProfile(newSession.user!).catch(() => {});
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setTimeout(() => {
          ensureProfile(session.user!).catch(() => {});
        }, 0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      let message = error.message;
      // 더 친절한 한국어 에러 메시지
      if (error.message.includes("Invalid login credentials")) {
        message = "이메일 또는 비밀번호가 올바르지 않습니다. 회원가입을 먼저 해주세요.";
      } else if (error.message.includes("Email not confirmed")) {
        message = "이메일 인증이 필요합니다. 이메일을 확인해주세요.";
      }
      toast({ title: "로그인 실패", description: message, variant: "destructive" });
    } else {
      toast({ title: "로그인 성공", description: "환영합니다!" });
    }
    return { error };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: name ? { name } : undefined,
      },
    });
    if (error) {
      let message = error.message;
      // 더 친절한 한국어 에러 메시지
      if (error.message.includes("Password should be at least")) {
        message = "비밀번호는 최소 6자 이상이어야 합니다.";
      } else if (error.message.includes("User already registered")) {
        message = "이미 가입된 이메일입니다. 로그인을 시도해주세요.";
      } else if (error.message.includes("Invalid email")) {
        message = "올바른 이메일 형식이 아닙니다.";
      }
      toast({ title: "회원가입 실패", description: message, variant: "destructive" });
    } else {
      if (data.user) {
        setTimeout(() => {
          ensureProfile(data.user as User, name).catch(() => {});
        }, 0);
      }
      // 이메일 인증이 필요한 경우와 아닌 경우 구분
      const needsConfirmation = data.user && !data.session;
      if (needsConfirmation) {
        toast({ title: "회원가입 완료", description: "이메일 인증 링크가 발송되었습니다. 메일함을 확인해주세요." });
      } else {
        toast({ title: "회원가입 완료", description: "환영합니다! 자동으로 로그인되었습니다." });
      }
    }
    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    });
    if (error) {
      toast({ title: "Google 로그인 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Google 로그인 진행", description: "브라우저로 이동합니다." });
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "로그아웃", description: "다음에 또 만나요!" });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
