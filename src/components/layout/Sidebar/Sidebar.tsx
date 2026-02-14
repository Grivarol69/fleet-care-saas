import { Logo } from '../Logo';
import { SidebarRoutes } from '../SidebarRoutes';

export function Sidebar() {
  return (
    <div className="h-screen">
      <div className="flex flex-col h-full">
        <Logo />
        <SidebarRoutes />
      </div>
    </div>
  );
}
