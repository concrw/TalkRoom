import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import TalkRoomsList from "./pages/TalkRoomsList";
import MyRooms from "./pages/MyRooms";
import JoinRoom from "./pages/JoinRoom";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFail from "./pages/PaymentFail";
import Review from "./pages/Review";
import DailyMissions from "./pages/DailyMissions";
import RoomDetail from "./pages/RoomDetail";
import TrainingCourse from "./pages/TrainingCourse";
import Daily from "./pages/Daily";
import Notifications from "./pages/Notifications";
import CreateRoom from "./pages/CreateRoom";
import EditRoom from "./pages/EditRoom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import BottomNav from "./components/BottomNav";
import OfflineNotice from "./components/OfflineNotice";
import GlobalAppEffects from "./components/GlobalAppEffects";
import ErrorBoundary from "./components/ErrorBoundary";
import Explore from "./pages/Explore";
import Schedule from "./pages/Schedule";
import Profile from "./pages/Profile";
import Community from "./pages/Community";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <GlobalAppEffects />
        <AuthProvider>
          <BrowserRouter>
            <OfflineNotice />
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/login" element={<Auth />} />
            <Route path="/auth/signup" element={<Auth />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/talk-rooms" element={<TalkRoomsList />} />
            <Route path="/rooms/:id" element={<RoomDetail />} />
            <Route path="/my-rooms" element={<ProtectedRoute><MyRooms /></ProtectedRoute>} />
            <Route path="/rooms/:id/join" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
            <Route path="/create-room" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
            <Route path="/edit-room/:id" element={<ProtectedRoute><EditRoom /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
            <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
            <Route path="/payment/fail" element={<PaymentFail />} />
            <Route path="/review/:id" element={<ProtectedRoute><Review /></ProtectedRoute>} />
            <Route path="/training-course/:roomId" element={<ProtectedRoute><TrainingCourse /></ProtectedRoute>} />
            <Route path="/daily/:roomId" element={<ProtectedRoute><Daily /></ProtectedRoute>} />
            <Route path="/daily" element={<ProtectedRoute><DailyMissions /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
            <BottomNav />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;