/** Public DTO; no login account or private staff data is sent to the homepage. */
export type HomeCoach = { id: string; name: string; role: string; bio: string; photo: string; isDemo: boolean };
