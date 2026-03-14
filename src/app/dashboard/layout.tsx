
"use client";

import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, Package, AlertTriangle, Settings, HelpCircle, Activity, User, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar className="border-r border-border bg-sidebar shadow-xl">
          <SidebarHeader className="h-20 flex items-center px-6">
            <Link href="/" className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-accent" />
              <span className="text-lg font-bold tracking-tight text-sidebar-foreground font-headline">ASIN Pulse</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="px-3 pt-4">
            <SidebarMenu>
              {[
                { icon: <LayoutDashboard className="h-4 w-4" />, label: "Overview", href: "/dashboard" },
                { icon: <Package className="h-4 w-4" />, label: "Monitored ASINs", href: "/dashboard/asins" },
                { icon: <AlertTriangle className="h-4 w-4" />, label: "Alerts", href: "/dashboard/alerts" },
              ].map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    className="h-10 px-4 rounded-md transition-all hover:bg-accent/10 hover:text-accent"
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      {item.icon}
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 mt-auto">
            <SidebarMenu>
              {[
                { icon: <Settings className="h-4 w-4" />, label: "Settings", href: "/dashboard/settings" },
                { icon: <HelpCircle className="h-4 w-4" />, label: "Help Center", href: "/dashboard/help" },
              ].map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild className="h-10 px-4">
                    <Link href={item.href} className="flex items-center gap-3">
                      {item.icon}
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">JD</div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold truncate">John Doe</p>
                    <p className="text-xs text-muted-foreground truncate">john@example.com</p>
                  </div>
                  <LogOut className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-destructive transition-colors" />
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="bg-background">
          <header className="h-20 flex items-center justify-between px-8 border-b border-border bg-background/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h2 className="text-xl font-semibold font-headline">
                {pathname === "/dashboard" ? "Overview" : 
                 pathname.includes("/asin/") ? "ASIN Details" : "Dashboard"}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center px-4 py-2 bg-card border rounded-lg text-sm gap-3">
                <span className="text-muted-foreground">Account Status:</span>
                <span className="text-accent font-medium flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> Pro Plan
                </span>
              </div>
            </div>
          </header>
          <div className="p-8">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
