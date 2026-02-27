export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  loading: boolean;
}

export interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string | null;
}
