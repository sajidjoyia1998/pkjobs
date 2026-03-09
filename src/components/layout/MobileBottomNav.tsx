import { Link, useLocation } from "react-router-dom";
import { Home, Briefcase, User, Shield, Info, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const MobileBottomNav = () => {
  const location = useLocation();
  const { user, isAdmin, isExpert } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    ...(user
      ? [
          { href: "/dashboard", label: "Dashboard", icon: User },
          ...(isExpert ? [{ href: "/expert", label: "Expert", icon: UserCheck }] : []),
          ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
        ]
      : [{ href: "/about", label: "About", icon: Info }]),
    ...(user && !isAdmin ? [{ href: "/about", label: "About", icon: Info }] : []),
  ];

  // Limit to 5 items max
  const displayItems = navItems.slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {displayItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href + item.label}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
