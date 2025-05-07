
import { Button } from "@/components/ui/button";
import { useModelContext } from "@/context/ModelContext";

const Header = () => {
  const { resetModel } = useModelContext();

  return (
    <header className="border-b border-border">
      <div className="container flex items-center justify-between py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <div className="w-10 h-10 rounded bg-primary text-primary-foreground flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-table">
                <path d="M12 3v18"/>
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M3 9h18"/>
                <path d="M3 15h18"/>
              </svg>
            </div>
            <span>EPM Data Forge</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={resetModel}
            className="gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            New Model
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
