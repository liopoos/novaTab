export interface BookmarkNode {
  type: "folder" | "link";
  id: string;
  title: string;
  parentId?: string;
  index?: number;
  addDate?: number;
  children?: BookmarkNode[]; // folders only
  url?: string; // links only
}

export interface BreadcrumbItem {
  id: string;
  title: string;
}
