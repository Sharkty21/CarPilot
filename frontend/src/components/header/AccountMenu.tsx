import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsOf } from "@/src/lib/format";
import { useGarage } from "@/src/contexts/garageContext";

const AccountMenu = () => {
  const { user } = useGarage();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar className="size-9 cursor-pointer transition-opacity hover:opacity-90">
          <AvatarImage src={user.avatarUrl} alt={user.name} />
          <AvatarFallback className="bg-blue-100 font-medium text-blue-700">
            {initialsOf(user.name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="size-9">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="bg-blue-100 font-medium text-blue-700">
              {initialsOf(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {user.name}
            </p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountMenu;
