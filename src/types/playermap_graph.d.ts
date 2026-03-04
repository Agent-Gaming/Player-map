declare module 'playermap_graph' {
  import { FC } from 'react';

  interface GraphControls {
    goBack: () => void;
    goForward: () => void;
    canGoBack: boolean;
    canGoForward: boolean;
    resetGraph: () => void;
    isSearching: boolean;
    handleSearch: (query: string, filters: { subject: string; predicate: string; object: string }) => Promise<void>;
    handleSearchStart: () => void;
  }

  interface GraphVisualizationProps {
    endpoint?: string;
    onNodeSelect?: (node: any) => void;
    onLoadingChange?: (isLoading: boolean) => void;
    walletAddress?: string;
    gamesId?: string;
    disableNodeDetailsSidebar?: boolean;
    hideNavigationBar?: boolean;
    onControlsReady?: (controls: GraphControls) => void;
  }

  interface SmartSearchInterfaceProps {
    endpoint?: string;
    onSearch: (query: string, filters: { subject: string; predicate: string; object: string }) => Promise<void>;
    isSearching: boolean;
    onSearchStart: () => void;
  }

  export const GraphVisualization: FC<GraphVisualizationProps>;
  export const LoadingAnimation: FC;
  export const SmartSearchInterface: FC<SmartSearchInterfaceProps>;
}
