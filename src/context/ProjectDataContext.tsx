import type { ReactNode } from 'react';
import { ProjectDataContext, type ProjectDataContextValue } from './useProjectData';

export function ProjectDataProvider({
  value,
  children,
}: {
  value: ProjectDataContextValue;
  children: ReactNode;
}) {
  return (
    <ProjectDataContext.Provider value={value}>
      {children}
    </ProjectDataContext.Provider>
  );
}
