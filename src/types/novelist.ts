export interface MentionDataItem {
  id: string;
  type: "USER" | "ITEM";
  displayName: string;
  image: string;
}

export interface MentionTab {
  getData: (prefix: string) => Promise<MentionDataItem[]>;
  id: string;
  iconKey: string;
  label: string;
}