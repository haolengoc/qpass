import { AccountNav } from "@/components/public/account-nav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <><AccountNav appearance="brand" />{children}</>;
}
