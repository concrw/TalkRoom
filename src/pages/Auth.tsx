import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const { session, signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "로그인 / 회원가입 - TALKROOM";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "TALKROOM 계정으로 로그인하거나 회원가입하세요.");
  }, []);

  useEffect(() => {
    if (session) {
      navigate("/", { replace: true });
    }
  }, [session, navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <article className="w-full max-w-md p-6 border rounded-lg bg-card text-card-foreground">
        <h1 className="text-2xl font-semibold mb-4">TALKROOM</h1>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="signup">회원가입</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => { await signInWithGoogle(); }}
              aria-label="Google로 로그인"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border mr-2">G</span>
              Google로 로그인
            </Button>
            <div className="flex items-center gap-2 my-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">또는</span>
              <Separator className="flex-1" />
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await signIn(email, password);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full">로그인</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => { await signInWithGoogle(); }}
              aria-label="Google로 회원가입"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border mr-2">G</span>
              Google로 회원가입
            </Button>
            <div className="flex items-center gap-2 my-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">또는</span>
              <Separator className="flex-1" />
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (password.length < 6) {
                  toast({
                    title: "비밀번호 길이 오류",
                    description: "비밀번호는 최소 6자 이상이어야 합니다.",
                    variant: "destructive",
                  });
                  return;
                }
                if (password !== passwordConfirm) {
                  toast({
                    title: "비밀번호 불일치",
                    description: "비밀번호가 일치하지 않습니다.",
                    variant: "destructive",
                  });
                  return;
                }
                await signUp(email, password, name);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input id="name" value={name} onChange={(e)=>setName(e.target.value)} placeholder="닉네임 또는 이름" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">이메일</Label>
                <Input id="email2" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password2"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
                <div className="relative">
                  <Input
                    id="passwordConfirm"
                    type={showPasswordConfirm ? "text" : "password"}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPasswordConfirm ? "비밀번호 확인 숨기기" : "비밀번호 확인 보기"}
                  >
                    {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full">회원가입</Button>
              <p className="text-xs text-muted-foreground">회원가입 시 인증 메일을 확인해야 할 수 있습니다.</p>
            </form>
          </TabsContent>
        </Tabs>
      </article>
    </main>
  );
};

export default Auth;
