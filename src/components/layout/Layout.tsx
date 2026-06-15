import { ReactNode, lazy, Suspense } from "react";
import Header from "./Header";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import GlobalSeoHead from "@/components/seo/GlobalSeoHead";
import { useAuth } from "@/hooks/useAuth";

// Chat widget is heavy (Supabase Realtime channels, attachments, message bubbles).
// Lazy-load it AND only mount when a user is signed in so guests don't pay the cost.
const ChatWidget = lazy(() => import("@/components/chat/ChatWidget"));

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <GlobalSeoHead />
      <Header />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileBottomNav />
      {user && (
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      )}
    </div>
  );
};

export default Layout;
