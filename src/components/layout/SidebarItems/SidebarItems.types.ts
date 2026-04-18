import { LucideIcon } from 'lucide-react';

type SubItem = {
  label: string;
  href: string;
};

export type SidebarItemsProps = {
  item: {
    label: string;
    icon: LucideIcon;
    href?: string;
    action?: string;
    subItems?: SubItem[];
  };
  onAction?: () => void;
};
