/**
 * Authoritative seed fixtures for Plant-Tech Arabia QMS E2E testing
 * Conforms strictly to ISO 9001:2015 domain models in PROJECT.md
 */

export const MOCK_USER = {
  id: 'usr-mr-001',
  name: 'T. Manobala',
  email: 'manobala@plant-tech.com',
  role: 'Quality Management Representative',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
};

export const MOCK_DEPARTMENTS = [
  'Management',
  'Operations',
  'Quality',
  'HSE',
  'Procurement',
  'Warehouse',
  'Maintenance',
  'HR',
  'Engineering',
  'Finance',
  'Sales & Marketing',
  'IT',
  'Projects',
];

export const MOCK_CSI_22_CRITERIA_QUESTIONS = [
  { code: '1A', category: '1. Overall Service', question: 'Quality of mobilization and site setup' },
  { code: '1B', category: '1. Overall Service', question: 'Adherence to agreed schedule and milestones' },
  { code: '2A', category: '2. Timeliness and Efficiency', question: 'Response time to site requests' },
  { code: '2B', category: '2. Timeliness and Efficiency', question: 'Productivity and crew efficiency' },
  { code: '3A', category: '3. Communication and Responsiveness', question: 'Clear reporting and daily updates' },
  { code: '3B', category: '3. Communication and Responsiveness', question: 'Cooperation of site supervision' },
  { code: '4A', category: '4. Expertise and Knowledge', question: 'Technical competence of engineers' },
  { code: '4B', category: '4. Expertise and Knowledge', question: 'Skills of technicians and craftsmen' },
  { code: '5A', category: '5. Problem Resolution', question: 'Prompt resolution of punch items' },
  { code: '5B', category: '5. Problem Resolution', question: 'Flexibility during unforeseen delays' },
  { code: '6A', category: '6. Quality Services', question: 'Flawless execution of catalyst change-out' },
  { code: '6B', category: '6. Quality Services', question: 'Flange management and torque accuracy' },
  { code: '6C', category: '6. Quality Services', question: 'Housekeeping and clean handover' },
  { code: '7A', category: '7. Compliance with Safety Regulations', question: 'Compliance with plant safety rules' },
  { code: '7B', category: '7. Compliance with Safety Regulations', question: 'Zero safety incidents / Near-miss reporting' },
  { code: '7C', category: '7. Compliance with Safety Regulations', question: 'Toolbox talks and safety presence' },
  { code: '8A', category: '8. Leadership', question: 'Supervisory leadership and control' },
  { code: '8B', category: '8. Leadership', question: 'Safety officer vigilance and guidance' },
  { code: '8C', category: '8. Leadership', question: 'Planning and coordination meetings' },
  { code: '8D', category: '8. Leadership', question: 'Resource mobilization agility' },
  { code: '8E', category: '8. Leadership', question: 'Client relationship management' },
  { code: '9', category: '9. Overall Performance', question: 'Overall satisfaction and recommendation' },
];

export const VALID_CSI_MAX_SCORES = MOCK_CSI_22_CRITERIA_QUESTIONS.reduce((acc, q) => {
  acc[q.code] = 10;
  return acc;
}, {} as Record<string, number>);

export const VALID_CSI_MIXED_SCORES = {
  '1A': 9, '1B': 8, '2A': 8, '2B': 9, '3A': 9, '3B': 8,
  '4A': 9, '4B': 8, '5A': 7, '5B': 8, '6A': 9, '6B': 9,
  '6C': 8, '7A': 10, '7B': 10, '7C': 9, '8A': 9, '8C': 8,
  '8D': 8, '8E': 9, '9': 9
};
