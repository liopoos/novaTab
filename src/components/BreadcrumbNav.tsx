import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useTranslation } from "react-i18next";
import type { BreadcrumbItem as BreadcrumbItemType } from "@/types";

interface BreadcrumbNavProps {
  breadcrumb: BreadcrumbItemType[];
  selectedFolderId: string | null;
  selectedFolderTitle?: string;
  onFolderSelect: (id: string | null) => void;
}

export function BreadcrumbNav({
  breadcrumb,
  selectedFolderId,
  selectedFolderTitle,
  onFolderSelect,
}: BreadcrumbNavProps) {
  const { t } = useTranslation();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {selectedFolderId === null ? (
          <BreadcrumbItem>
            <BreadcrumbPage>{t("breadcrumb.home")}</BreadcrumbPage>
          </BreadcrumbItem>
        ) : (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => onFolderSelect(null)}
                className="cursor-pointer"
              >
                {t("breadcrumb.home")}
              </BreadcrumbLink>
            </BreadcrumbItem>

            {breadcrumb.map((item) => (
              <>
                <BreadcrumbSeparator key={`sep-${item.id}`} />
                <BreadcrumbItem key={item.id}>
                  <BreadcrumbLink
                    onClick={() => onFolderSelect(item.id)}
                    className="cursor-pointer"
                  >
                    {item.title}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            ))}

            {selectedFolderTitle && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedFolderTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
