import type { BookmarkNode, BreadcrumbItem } from "@/types";

function nodeFromChrome(node: chrome.bookmarks.BookmarkTreeNode): BookmarkNode {
  if (node.url) {
    return {
      type: "link",
      id: node.id,
      title: node.title,
      parentId: node.parentId,
      index: node.index,
      url: node.url,
      addDate: node.dateAdded,
    };
  }
  return {
    type: "folder",
    id: node.id,
    title: node.title,
    parentId: node.parentId,
    index: node.index,
    addDate: node.dateAdded,
    children: (node.children ?? []).map(nodeFromChrome),
  };
}

export async function fetchBookmarks(): Promise<BookmarkNode[]> {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((tree) => {
      // tree[0] is the invisible root; its children are:
      //   [0]: Bookmarks Bar (id: "1")
      //   [1]: Other Bookmarks (id: "2")
      //   [2]: Mobile Bookmarks (id: "3", may not exist)
      resolve((tree[0].children ?? []).map(nodeFromChrome));
    });
  });
}

export function findNodeById(
  nodes: BookmarkNode[],
  id: string
): BookmarkNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function getAncestors(
  roots: BookmarkNode[],
  targetId: string
): BreadcrumbItem[] {
  const path: BreadcrumbItem[] = [];

  function walk(nodes: BookmarkNode[]): boolean {
    for (const node of nodes) {
      if (node.id === targetId) return true;
      if (node.children) {
        path.push({ id: node.id, title: node.title });
        if (walk(node.children)) return true;
        path.pop();
      }
    }
    return false;
  }

  walk(roots);
  return path;
}

export function searchInFolder(
  folder: BookmarkNode,
  query: string
): BookmarkNode[] {
  if (!query.trim()) return folder.children?.filter((n) => n.type === "link") ?? [];
  const q = query.toLowerCase();
  const results: BookmarkNode[] = [];

  function walk(nodes: BookmarkNode[]) {
    for (const node of nodes) {
      if (
        node.type === "link" &&
        (node.title.toLowerCase().includes(q) ||
          node.url?.toLowerCase().includes(q))
      ) {
        results.push(node);
      }
      if (node.children) walk(node.children);
    }
  }

  walk(folder.children ?? []);
  return results;
}

export function getDirectLinks(folder: BookmarkNode): BookmarkNode[] {
  return (folder.children ?? []).filter((n) => n.type === "link");
}

export function getDirectFolders(folder: BookmarkNode): BookmarkNode[] {
  return (folder.children ?? []).filter((n) => n.type === "folder");
}
