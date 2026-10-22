/**
 * Demo players for the local emulator setup (npm run dev:demo). The seed script creates
 * them, and the sign-in page offers one-tap sign-in as any of them when using emulators.
 * Never used against a real Firebase project.
 */
export interface DemoPlayer {
  uid: string;
  /** Google account id the emulator links to this uid */
  sub: string;
  email: string;
  name: string;
  role: 'batter' | 'bowler' | 'allRounder' | 'wicketkeeper';
  batting: 'right' | 'left';
  bowling: 'none' | 'rightFast' | 'rightMedium' | 'leftFast' | 'leftMedium' | 'offSpin' | 'legSpin' | 'leftOrthodox' | 'leftWrist';
  jersey: number;
}

export const DEMO_PLAYERS: DemoPlayer[] = [
  { uid: 'demo-asha', sub: '1001', email: 'asha@example.com', name: 'Asha Raman', role: 'allRounder', batting: 'right', bowling: 'rightMedium', jersey: 7 },
  { uid: 'demo-ben', sub: '1002', email: 'ben@example.com', name: 'Ben Carter', role: 'batter', batting: 'left', bowling: 'none', jersey: 18 },
  { uid: 'demo-chen', sub: '1003', email: 'chen@example.com', name: 'Chen Wei', role: 'bowler', batting: 'right', bowling: 'leftOrthodox', jersey: 33 },
  { uid: 'demo-dev', sub: '1004', email: 'dev@example.com', name: 'Dev Patel', role: 'wicketkeeper', batting: 'right', bowling: 'none', jersey: 1 },
  { uid: 'demo-ellis', sub: '1005', email: 'ellis@example.com', name: 'Ellis Okafor', role: 'bowler', batting: 'right', bowling: 'rightFast', jersey: 99 },
  { uid: 'demo-farah', sub: '1006', email: 'farah@example.com', name: 'Farah Siddiqui', role: 'batter', batting: 'right', bowling: 'legSpin', jersey: 21 },
];
