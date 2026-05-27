import { Navbar } from "@/components/layout";
import PersistentPlayer from "@/components/player/PersistentPlayer";

type PortalLayoutProps = Readonly<{
    children: React.ReactNode;
}>;

export default function PortalLayout({ children }: PortalLayoutProps) {
    return (
        <>
            <Navbar />
            <main className="pt-16">{children}</main>
            <PersistentPlayer />
        </>
    );
}
