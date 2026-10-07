// "Signed copies" page: one line per sidebar tab with "X of Y signed". Click a line to open that tab.
import { navigate } from '../../lib/router';
import { useNCRStore } from '../../store/useNCRStore';
import { useDCRStore } from '../../store/useDCRStore';
import { useCSIStore } from '../../store/useCSIStore';
import { useObjectivesStore } from '../../store/useObjectivesStore';
import { useAuditProgrammeStore } from '../../store/useAuditProgrammeStore';
import { useTUVStore } from '../../store/useTUVStore';
import { useMRMStore } from '../../store/useMRMStore';
import { TAB_LABEL, type SignedTab } from './matchRules';
import { TAB_SCREEN } from './tabScreen';
import { trackerLine } from './trackerText';
import { useTabSignedCopies } from './useTabSignedCopies';

function TabLine({ tab, records }: { tab: SignedTab; records: ReadonlyArray<{ id: string }> }) {
  const sc = useTabSignedCopies(tab, records);
  const t = sc.filesState === 'loading' ? { main: 'Counting…', sub: '' } : trackerLine(sc.resolved.counts, sc.linksState, sc.linksError);
  return (
    <li>
      <button type="button" onClick={() => navigate(TAB_SCREEN[tab])}
        className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover rounded-xl">
        <span className="w-48 font-medium">{TAB_LABEL[tab]}</span>
        <span>{t.main}</span>
        {t.sub && <span className="text-xs text-text-tertiary">{t.sub}</span>}
      </button>
    </li>
  );
}

export function SignedCopiesOverview() {
  const ncr = useNCRStore((s) => s.records);
  const dcr = useDCRStore((s) => s.records);
  const csi = useCSIStore((s) => s.records);
  const objectives = useObjectivesStore((s) => s.records);
  const audit = useAuditProgrammeStore((s) => s.records);
  const tuv = useTUVStore((s) => s.records);
  const mrm = useMRMStore((s) => s.records);
  return (
    <div className="p-4 max-w-3xl">
      <h1 className="text-[16px] font-semibold tracking-tight text-text-primary">Signed copies</h1>
      <p className="text-xs text-text-tertiary mb-3">Files stay on W:. This page only counts them.</p>
      <ul className="bg-surface rounded-xl border border-border divide-y divide-border">
        <TabLine tab="ncr" records={ncr} />
        <TabLine tab="dcr" records={dcr} />
        <TabLine tab="csi" records={csi} />
        <TabLine tab="objectives" records={objectives} />
        <TabLine tab="audit" records={audit} />
        <TabLine tab="tuv" records={tuv} />
        <TabLine tab="mrm" records={mrm} />
      </ul>
    </div>
  );
}
