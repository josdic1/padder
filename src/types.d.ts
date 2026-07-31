export {};

export type TearMatch = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  title?: string;
  body: string;
  percent: number;
  commonWords: string[];
  longestMatch: string;
};

declare global {
  interface Window {
    f1pad: {
      getNote: () => Promise<string>;
      setNote: (value: string) => Promise<void>;

      getPinned: () => Promise<boolean>;
      setPinned: (pinned: boolean) => Promise<boolean>;

      createTear: (body: string) => Promise<void>;

      renameTear: (id: string, title: string) => Promise<void>;

      downloadTear: (id: string) => Promise<void>;

      getTearMatches: (currentText: string) => Promise<TearMatch[]>;
    };
  }
}
