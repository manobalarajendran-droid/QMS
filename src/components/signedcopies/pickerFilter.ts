// Files the link picker offers for a tab: only that tab's own W: folders, narrowed by a name search.
import type { WFile } from '../wfiles/wfilesApi';
import { RULES, type SignedTab } from './matchRules';

export function pickerFiles(tab: SignedTab, files: WFile[], query: string): WFile[] {
  const q = query.trim().toLowerCase();
  return files.filter((f) =>
    RULES[tab].folders.some((p) => f.folder === p || f.folder.startsWith(p + '/')) &&
    (q === '' || f.name.toLowerCase().includes(q)));
}
