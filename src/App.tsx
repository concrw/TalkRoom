import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import BottomNav from "./components/BottomNav";
import OfflineNotice from "./components/OfflineNotice";
import GlobalAppEffects from "./components/GlobalAppEffects";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load all page components
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const TalkRoomsList = lazy(() => import("./pages/TalkRoomsList"));
const MyRooms = lazy(() => import("./pages/MyRooms"));
const JoinRoom = lazy(() => import("./pages/JoinRoom"));
const Payment = lazy(() => import("./pages/Payment"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFail = lazy(() => import("./pages/PaymentFail"));
const Review = lazy(() => import("./pages/Review"));
const DailyMissions = lazy(() => import("./pages/DailyMissions"));
const RoomDetail = lazy(() => import("./pages/RoomDetail"));
const TrainingCourse = lazy(() => import("./pages/TrainingCourse"));
const Daily = lazy(() => import("./pages/Daily"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CreateRoom = lazy(() => import("./pages/CreateRoom"));
const EditRoom = lazy(() => import("./pages/EditRoom"));
const Explore = lazy(() => import("./pages/Explore"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Profile = lazy(() => import("./pages/Profile"));
const Community = lazy(() => import("./pages/Community"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
            <BottomNav />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
